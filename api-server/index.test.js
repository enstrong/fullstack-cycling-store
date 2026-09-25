const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");
const { createApp } = require("./index");
const { migrate } = require("./database");
const { hashPassword, verifyPassword } = require("./auth");

async function serve(app, t) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
function browser(base) {
  const jar = new Map();
  return {
    jar,
    async request(
      url,
      body,
      method = body === undefined ? "GET" : "POST",
      extra = {},
    ) {
      const response = await fetch(`${base}${url}`, {
        method,
        redirect: "manual",
        headers: {
          "Content-Type": "application/json",
          Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
          ...extra,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      for (const value of response.headers.getSetCookie()) {
        const [name, content] = value.split(";")[0].split("=");
        if (content) jar.set(name, content);
        else jar.delete(name);
      }
      const text = await response.text();
      return {
        status: response.status,
        headers: response.headers,
        data:
          text.startsWith("{") || text.startsWith("[")
            ? JSON.parse(text)
            : text,
      };
    },
  };
}
const credentials = (suffix) => ({
  name: "Test Rider",
  email: `rider-${suffix}@example.test`,
  password: "Long-test-password-2026",
});

const shipping = {
  first_name: "Test",
  last_name: "Rider",
  country: "US",
  region: "California",
  city: "Beverly Hills",
  street: "123 Cycling Street",
  postal_code: "90210",
};
test("shipping validates names, country-specific postcodes and address fields", async () => {
  const { validateShipping } = await import("../shared/shipping.mjs");
  assert.deepEqual(validateShipping(shipping).errors, {});
  for (const [field, value] of Object.entries({
    first_name: "A",
    last_name: "1",
    country: "XX",
    region: "a",
    city: "1",
    street: "x",
    postal_code: "hello",
  })) {
    assert.ok(
      validateShipping({ ...shipping, [field]: value }).errors[field],
      field,
    );
  }
  for (const [country, postal_code] of [
    ["GB", "SW1A 1AA"],
    ["CA", "K1A 0B1"],
    ["KZ", "050012"],
    ["KZ", "Z00Y5M7"],
    ["AE", ""],
  ]) {
    assert.deepEqual(
      validateShipping({ ...shipping, country, postal_code }).errors,
      {},
    );
  }
  assert.ok(
    validateShipping({ ...shipping, country: "GB", postal_code: "90210" })
      .errors.postal_code,
  );
  assert.ok(
    validateShipping({ ...shipping, country: "AE", postal_code: "90210" })
      .errors.postal_code,
  );
  assert.deepEqual(
    validateShipping({
      ...shipping,
      first_name: "Élodie",
      last_name: "O’Connor",
      city: "Алматы",
    }).errors,
    {},
  );
  assert.equal(
    validateShipping({ ...shipping, country: "CA", postal_code: " k1a 0b1 " })
      .values.postal_code,
    "K1A 0B1",
  );
});

test("passwords use salted hashes and reject incorrect passwords", async () => {
  const a = await hashPassword("a sufficiently long password");
  const b = await hashPassword("a sufficiently long password");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("a sufficiently long password", a), true);
  assert.equal(await verifyPassword("incorrect", a), false);
  assert.equal(await verifyPassword("incorrect", undefined), false);
});

test("unauthenticated mutations and cross-origin requests fail before database writes", async (t) => {
  const pool = {
    query: () => {
      throw new Error("Unexpected database access");
    },
  };
  const base = await serve(createApp(pool, "admin-secret"), t);
  const client = browser(base);
  for (const [method, url] of [
    ["POST", "/api/products"],
    ["PUT", "/api/products/1"],
    ["DELETE", "/api/products/1"],
  ]) {
    assert.equal(
      (await client.request(url, method === "DELETE" ? undefined : {}, method))
        .status,
      401,
    );
  }
  assert.equal(
    (await client.request("/api/orders", { session_id: "spoofed", user_id: 1 }))
      .status,
    401,
  );
  assert.equal(
    (
      await client.request("/api/auth/register", credentials("csrf"), "POST", {
        Origin: "https://evil.example",
      })
    ).status,
    403,
  );
});

test("security headers, malformed requests and sign-in limits", async (t) => {
  const pool = { query: async () => ({ rows: [] }) };
  const base = await serve(createApp(pool, "admin-secret"), t);
  const client = browser(base);
  const headers = await client.request("/api/auth/me");
  assert.equal(headers.headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(headers.headers.get("x-powered-by"), null);
  const broken = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"password":"private',
  });
  assert.equal(broken.status, 400);
  assert.deepEqual(await broken.json(), { message: "Invalid JSON body." });
  assert.equal(
    (await client.request("/api/products/invalid", undefined, "DELETE")).status,
    400,
  );
  const product = {
    category_id: 1,
    name: "Helmet",
    price: 12,
    stock_quantity: 1,
  };
  for (const invalid of [
    { price: true },
    { price: -1 },
    { price: "1.234" },
    { icon: "javascript:alert(1)" },
    { icon: "//evil.example/image" },
    { description: { bad: true } },
  ]) {
    assert.equal(
      (
        await client.request(
          "/api/products",
          { ...product, ...invalid },
          "POST",
          { Authorization: "Bearer admin-secret" },
        )
      ).status,
      400,
    );
  }
  for (let n = 0; n < 20; n++) await client.request("/api/auth/login", {});
  const limited = await client.request("/api/auth/login", {});
  assert.equal(limited.status, 429);
  assert.ok(limited.headers.get("retry-after"));
});

test(
  "accounts, cart ownership, merging, checkout and Google OAuth",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const schema = `test_winner_${Date.now()}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      options: `-c search_path=${schema}`,
    });
    t.after(async () => {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    });
    await pool.query(
      await fs.readFile(path.join(__dirname, "../db.sql"), "utf8"),
    );
    await migrate(pool);
    const base = await serve(
      createApp(pool, "admin-secret", {
        google: {
          clientId: "test-client",
          clientSecret: "test-secret",
          redirectUri: "http://localhost:5001/api/auth/google/callback",
        },
      }),
      t,
    );
    const alice = browser(base),
      bob = browser(base);
    let aliceId;
    await t.test(
      "guests can add products, registration merges their cart and sets HttpOnly sessions",
      async () => {
        assert.equal((await alice.request("/api/auth/me")).data.user, null);
        assert.equal(
          (await alice.request("/api/cart/add", { product_id: 1, quantity: 2 }))
            .status,
          200,
        );
        const result = await alice.request(
          "/api/auth/register",
          credentials("alice"),
        );
        assert.equal(result.status, 201);
        aliceId = result.data.user.user_id;
        assert.match(
          result.headers
            .getSetCookie()
            .find((c) => c.startsWith("auth_session=")),
          /HttpOnly/i,
        );
        assert.match(
          result.headers
            .getSetCookie()
            .find((c) => c.startsWith("auth_session=")),
          /SameSite=Lax/i,
        );
        assert.equal(
          (await alice.request("/api/cart")).data.items[0].quantity,
          2,
        );
        const db = await pool.query(
          "SELECT password_hash FROM users WHERE user_id=$1",
          [aliceId],
        );
        assert.notEqual(
          db.rows[0].password_hash,
          credentials("alice").password,
        );
        assert.equal(
          (await alice.request("/api/products", { name: "unauthorized" }))
            .status,
          403,
        );
      },
    );
    await t.test(
      "carts are isolated and cannot be selected with browser IDs",
      async () => {
        await bob.request("/api/auth/me");
        const cart = await alice.request("/api/cart");
        assert.equal(
          (
            await bob.request(
              `/api/cart?session_id=anything&user_id=${aliceId}`,
            )
          ).data.items.length,
          0,
        );
        assert.equal(
          (
            await bob.request(
              `/api/cart/item/${cart.data.items[0].cart_item_id}`,
              undefined,
              "DELETE",
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await bob.request("/api/orders", {
              user_id: aliceId,
              session_id: "anything",
            })
          ).status,
          401,
        );
      },
    );
    await t.test(
      "logout revokes sessions; login merges guest additions into exactly one user cart",
      async () => {
        const old = alice.jar.get("auth_session");
        await alice.request("/api/auth/logout", {});
        const replay = browser(base);
        replay.jar.set("auth_session", old);
        assert.equal((await replay.request("/api/auth/me")).data.user, null);
        await alice.request("/api/cart/add", { product_id: 1, quantity: 1 });
        assert.equal(
          (
            await alice.request("/api/auth/login", {
              ...credentials("alice"),
              password: "wrong",
            })
          ).status,
          401,
        );
        assert.equal(
          (await alice.request("/api/auth/login", credentials("alice"))).status,
          200,
        );
        assert.equal(
          (await alice.request("/api/cart")).data.items[0].quantity,
          3,
        );
        assert.equal(
          (
            await pool.query("SELECT COUNT(*) FROM cart WHERE user_id=$1", [
              aliceId,
            ])
          ).rows[0].count,
          "1",
        );
        assert.equal(
          (
            await alice.request("/api/cart/add", {
              product_id: 1,
              quantity: -4,
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "checkout ignores client prices and email, preserves exact totals, clears once",
      async () => {
        await alice.request("/api/cart/clear", {});
        await alice.request("/api/cart/add", { product_id: 4, quantity: 2 });
        const invalid = await alice.request("/api/orders", {
          ...shipping,
          postal_code: "a",
        });
        assert.equal(invalid.status, 400);
        assert.ok(invalid.data.errors.postal_code);
        assert.equal(
          (await alice.request("/api/cart")).data.items[0].quantity,
          2,
        );
        const order = await alice.request("/api/orders", {
          ...shipping,
          total_price: "0.01",
          customer_email: "attacker@example.test",
        });
        assert.equal(order.status, 201);
        assert.equal(Number(order.data.total_price), 599.98);
        const saved = (
          await pool.query("SELECT * FROM orders WHERE order_id=$1", [
            order.data.order_id,
          ])
        ).rows[0];
        assert.equal(saved.user_id, aliceId);
        assert.deepEqual(saved.shipping_details, shipping);
        assert.equal(saved.customer_email, credentials("alice").email);
        assert.equal((await alice.request("/api/cart")).data.items.length, 0);
        assert.equal(
          (
            await alice.request("/api/orders", {
              ...shipping,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await pool.query(
              "SELECT stock_quantity FROM products WHERE product_id=4",
            )
          ).rows[0].stock_quantity,
          73,
        );
      },
    );
    await t.test(
      "order history is private and retains purchased prices and names",
      async () => {
        assert.equal((await bob.request("/api/orders")).status, 401);
        await bob.request("/api/auth/register", credentials("bob"));
        assert.deepEqual(
          (await bob.request(`/api/orders?user_id=${aliceId}`)).data.orders,
          [],
        );
        const before = (await alice.request("/api/orders")).data.orders;
        assert.equal(before.length, 1);
        assert.equal(before[0].order_status, "pending");
        assert.equal(
          before[0].shipping_address,
          "123 Cycling Street\nBeverly Hills, California\n90210\nUnited States",
        );
        assert.equal(Number(before[0].total_price), 599.98);
        assert.equal(before[0].items[0].quantity, 2);
        assert.equal(before[0].items[0].icon, "/products/glasses_oakley.png");
        assert.equal(Number(before[0].items[0].price), 299.99);
        assert.equal(Number(before[0].items[0].subtotal), 599.98);
        await pool.query(
          "UPDATE products SET name='Changed product',price=1,icon='/changed.png' WHERE product_id=4",
        );
        const after = (await alice.request("/api/orders")).data.orders;
        assert.deepEqual(after, before);
        await pool.query(
          "UPDATE orders SET order_status='shipped' WHERE order_id=$1",
          [before[0].order_id],
        );
        assert.equal(
          (await alice.request("/api/orders")).data.orders[0].order_status,
          "shipped",
        );
      },
    );
    await t.test("concurrent checkouts create a single order", async () => {
      await alice.request("/api/cart/add", { product_id: 5, quantity: 1 });
      const results = await Promise.all(
        [1, 2].map(() =>
          alice.request("/api/orders", {
            ...shipping,
          }),
        ),
      );
      assert.deepEqual(results.map((r) => r.status).sort(), [201, 400]);
      const history = (await alice.request("/api/orders")).data.orders;
      assert.equal(history.length, 2);
      assert.equal(
        history[0].order_id,
        results.find((r) => r.status === 201).data.order_id,
      );
    });
    await t.test(
      "unavailable stock rolls back checkout without clearing the cart",
      async () => {
        await alice.request("/api/cart/add", { product_id: 1, quantity: 1 });
        await pool.query(
          "UPDATE products SET stock_quantity=0 WHERE product_id=1",
        );
        assert.equal(
          (
            await alice.request("/api/orders", {
              ...shipping,
            })
          ).status,
          409,
        );
        assert.equal((await alice.request("/api/cart")).data.items.length, 1);
      },
    );
    await t.test(
      "administrator accounts and service keys can manage products",
      async () => {
        const product = {
          category_id: 1,
          name: "Permission test helmet",
          price: 15,
          stock_quantity: 2,
        };
        assert.equal(
          (await alice.request("/api/products", product)).status,
          403,
        );
        await pool.query("UPDATE users SET role='admin' WHERE user_id=$1", [
          aliceId,
        ]);
        const created = await alice.request("/api/products", product);
        assert.equal(created.status, 201);
        const id = created.data.product_id;
        assert.equal(
          (
            await alice.request(
              `/api/products/${id}`,
              { ...product, price: 20 },
              "PUT",
            )
          ).status,
          200,
        );
        assert.equal(
          (await alice.request(`/api/products/${id}`, undefined, "DELETE"))
            .status,
          200,
        );
        await pool.query("UPDATE users SET role='customer' WHERE user_id=$1", [
          aliceId,
        ]);
        const service = browser(base);
        const headers = { Authorization: "Bearer admin-secret" };
        const serviceProduct = await service.request(
          "/api/products",
          product,
          "POST",
          headers,
        );
        assert.equal(serviceProduct.status, 201);
        assert.equal(
          (
            await service.request(
              `/api/products/${serviceProduct.data.product_id}`,
              undefined,
              "DELETE",
              headers,
            )
          ).status,
          200,
        );
      },
    );
    await t.test(
      "Google login requires state and PKCE and creates an authenticated account",
      async () => {
        const googleBrowser = browser(base);
        await googleBrowser.request("/api/auth/me");
        await googleBrowser.request("/api/cart/add", {
          product_id: 2,
          quantity: 1,
        });
        const start = await googleBrowser.request(
          "/api/auth/google?returnTo=/cart/checkout",
        );
        const url = new URL(start.headers.get("location"));
        assert.equal(url.origin, "https://accounts.google.com");
        assert.equal(url.searchParams.get("code_challenge_method"), "S256");
        assert.ok(url.searchParams.get("code_challenge"));
        const attacker = browser(base);
        assert.match(
          (
            await attacker.request(
              "/api/auth/google/callback?state=wrong&code=bad",
            )
          ).headers.get("location"),
          /google_state/,
        );
        const originalFetch = global.fetch;
        global.fetch = async (address, options) => {
          if (String(address) === "https://oauth2.googleapis.com/token") {
            assert.ok(options.body.get("code_verifier"));
            return new Response(
              JSON.stringify({ access_token: "test-provider-token" }),
              { status: 200 },
            );
          }
          if (
            String(address) ===
            "https://openidconnect.googleapis.com/v1/userinfo"
          )
            return new Response(
              JSON.stringify({
                sub: "google-user-1",
                email: "google@example.test",
                name: "Google Rider",
                email_verified: true,
              }),
              { status: 200 },
            );
          return originalFetch(address, options);
        };
        try {
          const callback = await googleBrowser.request(
            `/api/auth/google/callback?state=${url.searchParams.get("state")}&code=test-code`,
          );
          assert.equal(
            callback.headers.get("location"),
            "http://localhost:5173/cart/checkout",
          );
          assert.equal(
            (await googleBrowser.request("/api/auth/me")).data.user.email,
            "google@example.test",
          );
          const replay = await googleBrowser.request(
            `/api/auth/google/callback?state=${url.searchParams.get("state")}&code=test-code`,
          );
          assert.match(replay.headers.get("location"), /google_state/);
          assert.equal(
            (await googleBrowser.request("/api/cart")).data.items[0].product_id,
            2,
          );
        } finally {
          global.fetch = originalFetch;
        }
      },
    );
  },
);
