const { randomBytes } = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const { transaction, digest, cookies, fail } = require('./auth');
const cookie = { httpOnly: true, sameSite: 'lax', path: '/' };
const publicUser = (u) => ({ user_id: u.user_id, name: u.name, email: u.email, role: u.role });
async function removeUser(client, id) {
  await client.query('DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE user_id=$1)', [id]);
  await client.query('DELETE FROM orders WHERE user_id=$1', [id]);
  await client.query('DELETE FROM cart_items WHERE cart_id IN (SELECT cart_id FROM cart WHERE user_id=$1)', [id]);
  await client.query('DELETE FROM cart WHERE user_id=$1', [id]);
  await client.query('DELETE FROM products WHERE demo_user_id=$1', [id]);
  await client.query('DELETE FROM users WHERE user_id=$1 AND demo_expires_at IS NOT NULL', [id]);
}
async function cleanupDemo(pool) {
  return transaction(pool, async (client) => {
    const expired = await client.query('SELECT user_id FROM users WHERE demo_expires_at <= NOW() FOR UPDATE SKIP LOCKED');
    for (const { user_id } of expired.rows) await removeUser(client, user_id);
    return expired.rowCount;
  });
}
function registerDemo(app, pool) {
  const cookieOptions = { ...cookie, secure: process.env.NODE_ENV === 'production' };
  const starterLimit = rateLimit({ windowMs: 15 * 60000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false });
  app.get('/api/health', async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });
  app.use('/api', async (req, res, next) => {
    const value = cookies(req).cycling_demo;
    if (/^[\w-]{43}$/.test(value || '')) {
      req.user = (await pool.query(`SELECT u.* FROM demo_sessions s JOIN users u USING(user_id)
        WHERE s.token_hash=$1 AND u.demo_expires_at>NOW()`, [digest(value)])).rows[0];
    }
    next();
  });
  app.get('/api/auth/me', (req, res) => res.json({
    user: req.user ? publicUser(req.user) : null,
    demo: true, expiresAt: req.user?.demo_expires_at, googleAvailable: false,
  }));
  app.post('/api/demo/start', starterLimit, async (req, res) => {
    if (req.user) return res.json({ user: publicUser(req.user), demo: true, expiresAt: req.user.demo_expires_at });
    const token = randomBytes(32).toString('base64url');
    const user = await transaction(pool, async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(724193)');
      const count = await client.query('SELECT count(*) FROM users WHERE demo_expires_at IS NOT NULL');
      if (Number(count.rows[0].count) >= 300) throw fail(503, 'The demo is busy. Please try again later.');
      const u = (await client.query(`INSERT INTO users(name,email,demo_expires_at)
        VALUES('Demo Rider',$1,NOW()+INTERVAL '24 hours') RETURNING *`, [`rider-${token.slice(0,16)}@example.invalid`])).rows[0];
      await client.query('INSERT INTO demo_sessions(token_hash,user_id) VALUES($1,$2)', [digest(token), u.user_id]);
      await client.query(`INSERT INTO products(category_id,name,description,price,icon,stock_quantity,research,demo_user_id)
        SELECT category_id,name,description,price,icon,stock_quantity,research,$1 FROM products WHERE demo_user_id IS NULL`, [u.user_id]);
      const samples = (await client.query('SELECT * FROM products WHERE demo_user_id=$1 ORDER BY product_id LIMIT 2', [u.user_id])).rows;
      for (const p of samples) {
        const order = (await client.query(`INSERT INTO orders(user_id,customer_name,customer_email,shipping_address,total_price,order_status,time_of_creation)
          VALUES($1,'Example order — Demo Rider',$2,'Fictional example address',$3,'example',NOW()-INTERVAL '2 days') RETURNING order_id`, [u.user_id,u.email,p.price])).rows[0];
        await client.query(`INSERT INTO order_items(order_id,product_id,quantity,price,product_name,product_icon)
          VALUES($1,$2,1,$3,$4,$5)`, [order.order_id,p.product_id,p.price,p.name,p.icon]);
      }
      return u;
    });
    res.cookie('cycling_demo', token, { ...cookieOptions, maxAge: 86400000 });
    res.status(201).json({ user: publicUser(user), demo: true, expiresAt: user.demo_expires_at });
  });
  app.use('/api', (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Your demo expired. Reload to start a fresh shop.' });
    next();
  });
  app.post('/api/demo/reset', async (req, res) => {
    await transaction(pool, (client) => removeUser(client, req.user.user_id));
    res.clearCookie('cycling_demo', cookieOptions);
    res.json({ message: 'Demo reset.' });
  });
  app.post('/api/demo/role', async (req, res) => {
    const role = req.body?.role;
    if (!['admin','customer'].includes(role)) throw fail(400, 'Invalid demo role.');
    const result = await pool.query('UPDATE users SET role=$1 WHERE user_id=$2 AND demo_expires_at>NOW() RETURNING *', [role,req.user.user_id]);
    res.json({ user: publicUser(result.rows[0]) });
  });
  app.use('/api/auth', (req, res) => res.status(403).json({ message: 'This private demo needs no sign-in. Use Reset demo to start again.' }));
}
module.exports = { registerDemo, cleanupDemo };
