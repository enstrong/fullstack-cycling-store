const {
  randomBytes,
  createHash,
  scrypt,
  timingSafeEqual,
} = require("node:crypto");
const { rateLimit: createRateLimit } = require("express-rate-limit");
const { promisify } = require("node:util");
const derive = promisify(scrypt);
const token = () => randomBytes(32).toString("base64url");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const adminEmail = "admin@fullstack-cycling-store.invalid";
const fail = (status, message) => Object.assign(new Error(message), { status });
const publicUser = (user) => ({
  user_id: user.user_id,
  name: user.name,
  email: user.email,
  role: user.role,
});
function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "").split(";").map((part) => {
      const i = part.indexOf("=");
      return i < 0 ? ["", ""] : [part.slice(0, i).trim(), part.slice(i + 1)];
    }),
  );
}
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}
function setCookie(res, name, value, maxAge) {
  res.cookie(name, value, { ...cookieOptions(), maxAge });
}
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `${salt}:${hash.toString("hex")}`;
}
async function verifyPassword(password, stored) {
  const [salt, expected] = (
    stored || `${"0".repeat(32)}:${"0".repeat(128)}`
  ).split(":");
  const actual = await derive(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(actual, Buffer.from(expected, "hex")) && !!stored;
}
async function transaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
function guestToken(req, res) {
  let value = cookies(req).guest_cart;
  if (!/^[\w-]{43}$/.test(value || "")) {
    value = token();
    req.headers.cookie = `${req.headers.cookie || ""}; guest_cart=${value}`;
    setCookie(res, "guest_cart", value, 30 * 86400000);
  }
  return value;
}
async function cartFor(client, req, res) {
  // The UPSERT also locks the cart row until the transaction commits.
  const result = req.user
    ? await client.query(
        `INSERT INTO cart(user_id) VALUES($1) ON CONFLICT (user_id) WHERE user_id IS NOT NULL
        DO UPDATE SET user_id=EXCLUDED.user_id RETURNING cart_id`,
        [req.user.user_id],
      )
    : await client.query(
        `INSERT INTO cart(guest_token_hash) VALUES($1) ON CONFLICT (guest_token_hash) WHERE guest_token_hash IS NOT NULL
        DO UPDATE SET guest_token_hash=EXCLUDED.guest_token_hash RETURNING cart_id`,
        [digest(guestToken(req, res))],
      );
  return result.rows[0].cart_id;
}
async function establishSession(client, req, res, user) {
  await client.query("SELECT user_id FROM users WHERE user_id=$1 FOR UPDATE", [
    user.user_id,
  ]);
  const target = await cartFor(client, { user }, res);
  const guest = cookies(req).guest_cart;
  if (guest) {
    const source = await client.query(
      "SELECT cart_id FROM cart WHERE guest_token_hash=$1 FOR UPDATE",
      [digest(guest)],
    );
    if (source.rowCount) {
      await client.query(
        `INSERT INTO cart_items(cart_id,product_id,quantity)
        SELECT $1,product_id,LEAST(quantity,1000) FROM cart_items WHERE cart_id=$2 AND quantity>0
        ON CONFLICT(cart_id,product_id) DO UPDATE SET quantity=LEAST(cart_items.quantity+EXCLUDED.quantity,1000)`,
        [target, source.rows[0].cart_id],
      );
      await client.query("DELETE FROM cart_items WHERE cart_id=$1", [
        source.rows[0].cart_id,
      ]);
      await client.query("DELETE FROM cart WHERE cart_id=$1", [
        source.rows[0].cart_id,
      ]);
    }
  }
  const previous = cookies(req).auth_session;
  if (previous)
    await client.query("DELETE FROM auth_sessions WHERE token_hash=$1", [
      digest(previous),
    ]);
  await client.query("DELETE FROM auth_sessions WHERE expires_at <= NOW()");
  const session = token();
  const maxAge = (user.role === "admin" ? 8 : 24 * 7) * 60 * 60 * 1000;
  await client.query(
    "INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+$3*INTERVAL '1 hour')",
    [digest(session), user.user_id, maxAge / (60 * 60 * 1000)],
  );
  return { token: session, maxAge };
}
function sendSession(res, session) {
  setCookie(res, "auth_session", session.token, session.maxAge);
  res.clearCookie("guest_cart", cookieOptions());
}
function registerAuth(app, pool, options) {
  const frontend = options.frontendUrl;
  const google = options.google;
  const configured = !!(
    google.clientId &&
    google.clientSecret &&
    google.redirectUri
  );
  const rateLimit = createRateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      message: "Too many sign-in attempts. Please try again in 15 minutes.",
    },
  });
  const adminRateLimit = createRateLimit({
    windowMs: 15 * 60000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      message:
        "Too many administrator sign-in attempts. Try again in 15 minutes.",
    },
  });
  app.use(async (req, res, next) => {
    try {
      const session = cookies(req).auth_session;
      if (session && /^[\w-]{43}$/.test(session)) {
        const result = await pool.query(
          `SELECT u.* FROM auth_sessions s JOIN users u USING(user_id)
          WHERE s.token_hash=$1 AND s.expires_at>NOW()`,
          [digest(session)],
        );
        req.user = result.rows[0];
      }
      next();
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/auth/me", (req, res) => {
    if (!req.user) guestToken(req, res);
    res.set("Cache-Control", "no-store").json({
      user: req.user ? publicUser(req.user) : null,
      googleAvailable: configured,
    });
  });
  app.post("/api/auth/register", rateLimit, async (req, res) => {
    const { name, password } = req.body || {};
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      typeof password !== "string" ||
      password.length < 10 ||
      password.length > 128
    )
      throw fail(
        400,
        "Enter a name, valid email, and a password between 10 and 128 characters.",
      );
    if (email === adminEmail)
      throw fail(400, "That email address is reserved.");
    const passwordHash = await hashPassword(password);
    try {
      const result = await transaction(pool, async (client) => {
        const inserted = await client.query(
          "INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING *",
          [name.trim(), email, passwordHash],
        );
        const user = inserted.rows[0];
        return {
          user,
          session: await establishSession(client, req, res, user),
        };
      });
      sendSession(res, result.session);
      res.status(201).json({ user: publicUser(result.user) });
    } catch (error) {
      if (error.code === "23505")
        throw fail(409, "An account already uses this email. Please sign in.");
      throw error;
    }
  });
  app.post(
    "/api/auth/login",
    (req, res, next) => {
      const identifier =
        typeof req.body?.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";
      (identifier === "admin" || identifier === adminEmail
        ? adminRateLimit
        : rateLimit)(req, res, next);
    },
    async (req, res) => {
      const email =
        typeof req.body?.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";
      const isAdmin = email === "admin" || email === adminEmail;
      const accountEmail = email === "admin" ? adminEmail : email;
      const password = req.body?.password;
      if (
        !email ||
        email.length > 254 ||
        typeof password !== "string" ||
        !password.length ||
        password.length > 128
      )
        throw fail(400, "Enter your email and password.");
      const found = await pool.query(
        `SELECT * FROM users WHERE email=$1 AND ($2::boolean = false OR role='admin')`,
        [accountEmail, isAdmin],
      );
      const user = found.rows[0];
      if (!(await verifyPassword(password, user?.password_hash)))
        throw fail(401, "Email or password is incorrect.");
      const session = await transaction(pool, (client) =>
        establishSession(client, req, res, user),
      );
      sendSession(res, session);
      res.json({ user: publicUser(user) });
    },
  );
  app.post("/api/auth/logout", async (req, res) => {
    const session = cookies(req).auth_session;
    if (session)
      await pool.query("DELETE FROM auth_sessions WHERE token_hash=$1", [
        digest(session),
      ]);
    res.clearCookie("auth_session", cookieOptions());
    setCookie(res, "guest_cart", token(), 30 * 86400000);
    res.json({ message: "Signed out" });
  });
  app.get("/api/auth/google", rateLimit, async (req, res) => {
    if (!configured) throw fail(503, "Google sign-in is not configured yet.");
    const state = token(),
      verifier = token();
    const returnTo =
      req.query.returnTo === "/cart/checkout" ? "/cart/checkout" : "/account";
    await pool.query("DELETE FROM oauth_states WHERE expires_at<NOW()");
    await pool.query(
      "INSERT INTO oauth_states(state_hash,verifier,return_to,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes')",
      [digest(state), verifier, returnTo],
    );
    setCookie(res, "oauth_state", state, 10 * 60000);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: google.clientId,
      redirect_uri: google.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();
    res.redirect(url.toString());
  });
  app.get("/api/auth/google/callback", async (req, res) => {
    const state = req.query.state;
    res.clearCookie("oauth_state", cookieOptions());
    if (
      !configured ||
      typeof state !== "string" ||
      !/^[\w-]{43}$/.test(state) ||
      state !== cookies(req).oauth_state
    )
      return res.redirect(`${frontend}/account?error=google_state`);
    const stored = await pool.query(
      "DELETE FROM oauth_states WHERE state_hash=$1 AND expires_at>NOW() RETURNING *",
      [digest(state)],
    );
    if (
      !stored.rowCount ||
      typeof req.query.code !== "string" ||
      req.query.code.length > 4096
    )
      return res.redirect(`${frontend}/account?error=google_cancelled`);
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        body: new URLSearchParams({
          code: req.query.code,
          client_id: google.clientId,
          client_secret: google.clientSecret,
          redirect_uri: google.redirectUri,
          grant_type: "authorization_code",
          code_verifier: stored.rows[0].verifier,
        }),
      });
      if (!response.ok) throw new Error("Token exchange failed");
      const tokens = await response.json();
      if (typeof tokens.access_token !== "string" || !tokens.access_token)
        throw new Error("Missing access token");
      const profileResponse = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          signal: AbortSignal.timeout(10000),
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );
      if (!profileResponse.ok) throw new Error("Profile request failed");
      const profile = await profileResponse.json();
      if (
        typeof profile.sub !== "string" ||
        !profile.sub ||
        profile.sub.length > 255 ||
        typeof profile.email !== "string" ||
        profile.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) ||
        profile.email_verified !== true
      )
        throw new Error("Unverified Google account");
      const result = await transaction(pool, async (client) => {
        let found = await client.query(
          "SELECT * FROM users WHERE google_sub=$1",
          [profile.sub],
        );
        if (!found.rowCount) {
          // Do not silently link a password account based only on matching email.
          found = await client.query(
            "INSERT INTO users(name,email,google_sub) VALUES($1,$2,$3) RETURNING *",
            [
              String(profile.name || profile.email).slice(0, 100),
              profile.email.toLowerCase(),
              profile.sub,
            ],
          );
        }
        return establishSession(client, req, res, found.rows[0]);
      });
      sendSession(res, result);
      res.redirect(`${frontend}${stored.rows[0].return_to}`);
    } catch (error) {
      res.redirect(
        `${frontend}/account?error=${error.code === "23505" ? "existing_account" : "google_failed"}`,
      );
    }
  });
}
module.exports = {
  registerAuth,
  transaction,
  cartFor,
  fail,
  digest,
  cookies,
  hashPassword,
  verifyPassword,
};
