const express = require("express");
const cors = require("cors");
const compression = require("compression");
const { existsSync } = require("node:fs");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { createPool, migrate } = require("./database");
const { registerAuth, transaction, cartFor, fail } = require("./auth");

function createApp(pool, config = {}) {
  const app = express();
  const demo = config.demo ?? process.env.DEMO_MODE === "true";
  const owner = (req) => demo ? req.user.user_id : null;
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5)
    throw new Error("TRUST_PROXY_HOPS must be an integer from 0 to 5.");
  app.set("trust proxy", proxyHops);
  const frontendUrl =
    config.frontendUrl || process.env.FRONTEND_URL || "http://localhost:5173";
  const origins = new Set([new URL(frontendUrl).origin]);
  if (
    process.env.NODE_ENV === "production" &&
    new URL(frontendUrl).protocol !== "https:"
  )
    throw new Error("FRONTEND_URL must use HTTPS in production.");
  app.disable("x-powered-by");
  app.use(
    helmet({
      strictTransportSecurity:
        process.env.NODE_ENV === "production" ? undefined : false,
    }),
  );
  // Compress public catalog/static responses only; personalized responses stay uncompressed.
  app.use(compression({
    threshold: 1024,
    filter: (req, res) => res.statusCode < 400 &&
      (!req.path.startsWith("/api") || ["/api/products", "/api/categories"].includes(req.path)) &&
      ["GET", "HEAD"].includes(req.method) && compression.filter(req, res),
  }));
  const frontendDirectory = path.join(__dirname, "../dist");
  const serveFrontend = config.serveFrontend ??
    (process.env.SERVE_FRONTEND === undefined ? process.env.NODE_ENV === "production" : process.env.SERVE_FRONTEND === "true");
  const frontendAvailable = serveFrontend && existsSync(path.join(frontendDirectory, "index.html"));
  if (frontendAvailable) {
    app.use(express.static(frontendDirectory, {
      index: false,
      setHeaders: (res, filename) => {
        const relative = path.relative(frontendDirectory, filename).split(path.sep).join("/");
        res.set("Cache-Control", relative.startsWith("assets/") || relative.startsWith("optimized/")
          ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate");
      },
    }));
  }
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        message: "Too many requests. Please wait a minute and try again.",
      },
    }),
  );
  app.param("id", (req, res, next, id) => {
    if (!/^[1-9]\d{0,9}$/.test(id) || Number(id) > 2147483647)
      return next(fail(400, "Invalid item ID."));
    next();
  });
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || origins.has(origin)),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (
        (req.headers.origin && !origins.has(req.headers.origin)) ||
        req.headers["sec-fetch-site"] === "cross-site"
      )
        return res
          .status(403)
          .json({ message: "Request origin is not allowed." });
      if (req.method !== "DELETE" && !req.is("application/json"))
        return res.status(415).json({ message: "Use application/json." });
    }
    next();
  });
  const google = config.google || {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  };
  if (
    process.env.NODE_ENV === "production" &&
    google.redirectUri &&
    new URL(google.redirectUri).protocol !== "https:"
  )
    throw new Error("GOOGLE_REDIRECT_URI must use HTTPS in production.");
  if (demo) require("./demo").registerDemo(app, pool);
  else registerAuth(app, pool, {
    frontendUrl,
    google,
  });
  function requireLogin(req, res, next) {
    if (!req.user)
      return res
        .status(401)
        .json({ message: "Please sign in to access your orders." });
    next();
  }
  function requireAdmin(req, res, next) {
    if (req.user?.role === "admin") return next();
    res
      .status(req.user ? 403 : 401)
      .json({ message: "Administrator access required." });
  }
  app.get("/api/categories", async (req, res) =>
    res.set("Cache-Control", demo ? "private, no-store" : "public, max-age=0, must-revalidate").json(
      (await pool.query("SELECT * FROM categories ORDER BY category_id")).rows,
    ),
  );
  app.get("/api/products", async (req, res) =>
    res.set("Cache-Control", demo ? "private, no-store" : "public, max-age=0, must-revalidate").json(
      (
        await pool.query(
          "SELECT p.*,c.section FROM products p JOIN categories c USING(category_id) WHERE p.demo_user_id IS NOT DISTINCT FROM $1::integer ORDER BY p.product_id",
          [owner(req)],
        )
      ).rows,
    ),
  );
  function validImage(value) {
    if (!value) return true;
    if (/^\/(?!\/)[^\\\s]*$/.test(value)) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }
  function productValues(body = {}) {
    const { category_id, name, description, price, icon, stock_quantity } =
      body;
    if (
      !Number.isInteger(category_id) ||
      category_id <= 0 ||
      category_id > 2147483647 ||
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 200 ||
      (description != null &&
        (typeof description !== "string" || description.length > 5000)) ||
      (icon != null &&
        (typeof icon !== "string" ||
          icon.length > 2048 ||
          !validImage(icon))) ||
      !["string", "number"].includes(typeof price) ||
      !/^\d+(\.\d{1,2})?$/.test(String(price)) ||
      Number(price) > 100000000 ||
      !Number.isFinite(Number(price)) ||
      price === "" ||
      price == null ||
      Number(price) < 0 ||
      !Number.isInteger(stock_quantity) ||
      stock_quantity < 0 ||
      stock_quantity > 1000000
    )
      throw fail(
        400,
        "Enter a category, name, nonnegative price and whole stock quantity.",
      );
    return [
      category_id,
      name.trim(),
      description || "",
      price,
      icon || "",
      stock_quantity,
    ];
  }
  app.post("/api/products", requireAdmin, async (req, res) => {
    const result = await transaction(pool, async (client) => {
      if (demo) {
        await client.query("SELECT user_id FROM users WHERE user_id=$1 FOR UPDATE", [owner(req)]);
        const count = await client.query("SELECT count(*) FROM products WHERE demo_user_id=$1", [owner(req)]);
        if (Number(count.rows[0].count) >= 100) throw fail(429, "Demo limit: 100 products. Reset your demo to start again.");
      }
      return client.query(
        "INSERT INTO products(category_id,name,description,price,icon,stock_quantity,demo_user_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [...productValues(req.body), owner(req)],
      );
    });
    res.status(201).json(result.rows[0]);
  });
  app.put("/api/products/:id", requireAdmin, async (req, res) => {
    const result = await pool.query(
      "UPDATE products SET research=CASE WHEN name=$2 AND category_id=$1 THEN research ELSE NULL END,category_id=$1,name=$2,description=$3,price=$4,icon=$5,stock_quantity=$6 WHERE product_id=$7 AND demo_user_id IS NOT DISTINCT FROM $8::integer RETURNING *",
      [...productValues(req.body), req.params.id, owner(req)],
    );
    if (!result.rowCount) throw fail(404, "Product not found.");
    res.json(result.rows[0]);
  });
  app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    const result = await pool.query(
      "DELETE FROM products WHERE product_id=$1 AND demo_user_id IS NOT DISTINCT FROM $2::integer RETURNING *",
      [req.params.id, owner(req)],
    );
    if (!result.rowCount) throw fail(404, "Product not found.");
    res.json({ message: "Product deleted." });
  });
  async function cartData(client, id) {
    const result = await client.query(
      `SELECT ci.cart_item_id,ci.product_id,ci.quantity,p.name,p.price,p.icon,p.stock_quantity
      FROM cart_items ci JOIN products p USING(product_id) WHERE ci.cart_id=$1 ORDER BY ci.cart_item_id`,
      [id],
    );
    return { cart_id: id, items: result.rows };
  }
  app.get("/api/cart", async (req, res) => {
    res.json(
      await transaction(pool, async (client) =>
        cartData(client, await cartFor(client, req, res)),
      ),
    );
  });
  app.post("/api/cart/add", async (req, res) => {
    const { product_id, quantity = 1 } = req.body || {};
    if (
      !Number.isInteger(product_id) ||
      product_id <= 0 ||
      product_id > 2147483647 ||
      !Number.isInteger(quantity) ||
      quantity === 0 ||
      Math.abs(quantity) > 1000
    )
      throw fail(400, "Invalid product or quantity.");
    const result = await transaction(pool, async (client) => {
      const id = await cartFor(client, req, res);
      const product = (
        await client.query(
          "SELECT stock_quantity FROM products WHERE product_id=$1 AND demo_user_id IS NOT DISTINCT FROM $2::integer",
          [product_id, owner(req)],
        )
      ).rows[0];
      if (!product) throw fail(404, "Product not found.");
      const existing = (
        await client.query(
          "SELECT quantity FROM cart_items WHERE cart_id=$1 AND product_id=$2",
          [id, product_id],
        )
      ).rows[0];
      const next = (existing?.quantity || 0) + quantity;
      if (next <= 0 || next > 1000)
        throw fail(400, "Quantity must be between 1 and 1000.");
      if (next > product.stock_quantity)
        throw fail(409, "There is not enough stock available.");
      await client.query(
        `INSERT INTO cart_items(cart_id,product_id,quantity) VALUES($1,$2,$3)
        ON CONFLICT(cart_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity`,
        [id, product_id, next],
      );
      return cartData(client, id);
    });
    res.json(result);
  });
  app.delete("/api/cart/item/:id", async (req, res) => {
    res.json(
      await transaction(pool, async (client) => {
        const id = await cartFor(client, req, res);
        const result = await client.query(
          "DELETE FROM cart_items WHERE cart_id=$1 AND cart_item_id=$2 RETURNING cart_item_id",
          [id, req.params.id],
        );
        if (!result.rowCount) throw fail(404, "Item not found in your cart.");
        return cartData(client, id);
      }),
    );
  });
  app.post("/api/cart/clear", async (req, res) => {
    await transaction(pool, async (client) => {
      const id = await cartFor(client, req, res);
      await client.query("DELETE FROM cart_items WHERE cart_id=$1", [id]);
    });
    res.json({ items: [] });
  });
  app.get("/api/orders", requireLogin, async (req, res) => {
    const result = await pool.query(
      `SELECT o.order_id,o.customer_name,o.shipping_address,o.total_price,
        o.order_status,o.time_of_creation,
        COALESCE((SELECT json_agg(json_build_object(
          'order_item_id',oi.order_item_id,'name',oi.product_name,'icon',oi.product_icon,
          'quantity',oi.quantity,'price',oi.price::text,
          'subtotal',(oi.quantity*oi.price)::text
        ) ORDER BY oi.order_item_id) FROM order_items oi
        WHERE oi.order_id=o.order_id), '[]'::json) AS items
       FROM orders o WHERE o.user_id=$1
       ORDER BY o.time_of_creation DESC,o.order_id DESC`,
      [req.user.user_id],
    );
    res.json({ orders: result.rows });
  });
  app.post("/api/orders", requireLogin, async (req, res) => {
    const { validateShipping, formatShipping } =
      await import("../shared/shipping.mjs");
    const { values, errors, country } = validateShipping(req.body || {});
    if (Object.keys(errors).length)
      return res
        .status(400)
        .json({ message: "Please check your shipping details.", errors });
    const customer_name = `${values.first_name} ${values.last_name}`;
    const shipping_address = formatShipping(values, country);
    const order = await transaction(pool, async (client) => {
      if (demo) {
        await client.query("SELECT user_id FROM users WHERE user_id=$1 FOR UPDATE", [owner(req)]);
        const count = await client.query("SELECT count(*) FROM orders WHERE user_id=$1", [owner(req)]);
        if (Number(count.rows[0].count) >= 50) throw fail(429, "Demo limit: 50 orders. Reset your demo to start again.");
      }
      const cartId = await cartFor(client, req, res);
      const items = (
        await client.query(
          `SELECT ci.product_id,ci.quantity,p.price,p.stock_quantity,p.name,p.icon
        FROM cart_items ci JOIN products p USING(product_id) WHERE ci.cart_id=$1 AND p.demo_user_id IS NOT DISTINCT FROM $2::integer ORDER BY p.product_id FOR UPDATE OF ci,p`,
          [cartId, owner(req)],
        )
      ).rows;
      if (!items.length) throw fail(400, "Your cart is empty.");
      if (
        items.some(
          (i) =>
            !Number.isInteger(i.quantity) ||
            i.quantity <= 0 ||
            i.price == null ||
            !Number.isFinite(Number(i.price)) ||
            Number(i.price) < 0,
        )
      )
        throw fail(400, "Your cart contains an invalid item.");
      if (
        items.some(
          (i) => i.stock_quantity == null || i.quantity > i.stock_quantity,
        )
      )
        throw fail(
          409,
          "Some items are no longer available in the requested quantity. Please update your cart.",
        );
      const inserted = await client.query(
        `INSERT INTO orders(user_id,customer_name,customer_email,shipping_address,shipping_details,total_price,order_status,time_of_creation)
        VALUES($1,$2,$3,$4,$5,0,'pending',NOW()) RETURNING order_id`,
        [
          req.user.user_id,
          customer_name.trim(),
          req.user.email,
          shipping_address,
          JSON.stringify(values),
        ],
      );
      const id = inserted.rows[0].order_id;
      for (const item of items) {
        await client.query(
          "INSERT INTO order_items(order_id,product_id,quantity,price,product_name,product_icon) VALUES($1,$2,$3,$4,$5,$6)",
          [
            id,
            item.product_id,
            item.quantity,
            item.price,
            item.name,
            item.icon,
          ],
        );
        await client.query(
          "UPDATE products SET stock_quantity=stock_quantity-$1 WHERE product_id=$2",
          [item.quantity, item.product_id],
        );
      }
      // Exact NUMERIC calculation uses the same price snapshots saved on order lines.
      const result = await client.query(
        `UPDATE orders SET total_price=(SELECT SUM(quantity*price) FROM order_items WHERE order_id=$1)
        WHERE order_id=$1 RETURNING order_id,total_price`,
        [id],
      );
      await client.query("DELETE FROM cart_items WHERE cart_id=$1", [cartId]);
      return result.rows[0];
    });
    res.status(201).json({ message: "Order placed.", ...order });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ message: "Endpoint not found." }),
  );
  if (frontendAvailable) {
    const pages = new Set(["/", "/teams", "/gear", "/support", "/cart", "/cart/checkout", "/compare", "/account", "/admin"]);
    app.get(/.*/, (req, res, next) => {
      if (!pages.has(req.path.replace(/\/$/, "") || "/")) return next();
      res.set("Cache-Control", "no-cache").sendFile(path.join(frontendDirectory, "index.html"));
    });
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
      error.status ||
      (error.code === "23503" ? 409 : error.code === "22P02" ? 400 : 500);
    // Do not log SQL parameters, cookies, OAuth responses or request bodies.
    if (status === 500)
      console.error("API request failed", {
        code: error.code || "internal_error",
      });
    res.set("Cache-Control", "no-store").status(status).json({
      message:
        error.type === "entity.parse.failed"
          ? "Invalid JSON body."
          : error.type === "entity.too.large"
            ? "Request body is too large."
            : error.status
              ? error.message
              : status === 409
                ? "This item is referenced by an existing order or cart."
                : status === 400
                  ? "Invalid request."
                  : "Something went wrong. Please try again.",
    });
  });
  return app;
}
if (require.main === module) {
  const pool = createPool();
  migrate(pool)
    .then(async () => {
      if (process.env.DEMO_MODE === "true") {
        const { cleanupDemo } = require("./demo");
        const cleanup = () => cleanupDemo(pool).catch(() => console.error("Demo cleanup failed; will retry."));
        await cleanup();
        setInterval(cleanup, 15 * 60000).unref();
      }
      const port = process.env.PORT || 5001;
      const host =
        process.env.HOST ||
        (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
      const server = createApp(pool).listen(port, host, () =>
        console.log(`API running at http://localhost:${port}`),
      );
      server.requestTimeout = 30000;
      server.headersTimeout = 15000;
      for (const signal of ["SIGINT", "SIGTERM"]) {
        process.once(signal, () => {
          const deadline = setTimeout(() => process.exit(1), 10000);
          deadline.unref();
          server.close(async () => {
            await pool.end();
            clearTimeout(deadline);
            process.exit(0);
          });
        });
      }
      server.on("error", (error) => {
        console.error("HTTP server failed:", error.code || "server_error");
        process.exit(1);
      });
    })
    .catch((error) => {
      console.error("Database setup failed:", error.code || "startup_error");
      process.exit(1);
    });
}
module.exports = { createApp };
