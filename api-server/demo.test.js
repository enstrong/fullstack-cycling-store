const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');
const { createApp } = require('./index');
const { migrate } = require('./database');
const { cleanupDemo } = require('./demo');
test('demo: isolated catalogs, admin, checkout, persistence, quotas, reset and expiry', { skip: !process.env.TEST_DATABASE_URL }, async (t) => {
  const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = `test_demo_${Date.now()}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}` });
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
  });
  await pool.query(await fs.readFile(path.join(__dirname, '../db.sql'), 'utf8'));
  await migrate(pool);
  async function listen() {
    server = createApp(pool, { demo: true }).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  }
  let base = await listen();
  function browser() {
    let cookie = '';
    return async (url, body, method = body === undefined ? 'GET' : 'POST') => {
      const r = await fetch(base + '/api' + url, { method, headers: { Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0];
      return { status: r.status, headers: r.headers, data: await r.json() };
    };
  }
  const a = browser(), b = browser(), anonymous = browser();
  assert.equal((await anonymous('/products')).status, 401);
  assert.equal((await anonymous('/auth/me')).data.demo, true);
  const ua = (await a('/demo/start', {})).data.user;
  const ub = (await b('/demo/start', {})).data.user;
  assert.notEqual(ua.user_id, ub.user_id);
  assert.equal((await a('/demo/start', {})).data.user.user_id, ua.user_id);
  const pa = (await a('/products')).data;
  const pb = (await b('/products')).data;
  assert.equal(pa.length, 22); assert.equal(pb.length, 22);
  assert.ok((await a('/products')).headers.get('cache-control').includes('no-store'));
  assert.equal((await a('/orders')).data.orders.length, 2);
  assert.equal((await a('/cart')).data.items.length, 0);
  assert.equal((await a('/products', {})).status, 403);
  assert.equal((await a('/demo/role', { role: 'admin' })).status, 200);
  const product = { ...pa[2], name: 'Private edited helmet' };
  for (const invalid of [{ price: true }, { price: -1 }, { price: '1.234' }, { icon: 'javascript:alert(1)' }, { icon: '//evil.example/image' }, { description: { bad: true } }]) {
    assert.equal((await a('/products', { ...product, ...invalid })).status, 400);
  }
  assert.equal((await a(`/products/${product.product_id}`, product, 'PUT')).status, 200);
  assert.equal((await a(`/products/${pb[2].product_id}`, product, 'PUT')).status, 404);
  assert.equal((await a(`/products/${pb[2].product_id}`, undefined, 'DELETE')).status, 404);
  assert.equal((await a('/cart/add', { product_id: pb[2].product_id })).status, 404);
  assert.equal((await b('/products')).data[2].name, pb[2].name);
  assert.equal((await a('/auth/register', {})).status, 403);
  assert.equal((await a('/auth/google')).status, 403);
  assert.equal((await a('/cart/add', { product_id: product.product_id, quantity: 2 })).status, 200);
  const shipping = { first_name: 'Demo', last_name: 'Rider', country: 'US', region: 'California', city: 'Beverly Hills', street: '123 Example Street', postal_code: '90210' };
  assert.equal((await a('/orders', {})).status, 400);
  const order = await a('/orders', shipping);
  assert.equal(order.status, 201);
  assert.equal(Number(order.data.total_price), Number(product.price) * 2);
  assert.equal((await a('/cart')).data.items.length, 0);
  assert.equal((await a('/products')).data[2].stock_quantity, product.stock_quantity - 2);
  assert.equal((await b('/products')).data[2].stock_quantity, pb[2].stock_quantity);
  assert.equal((await b('/orders')).data.orders.length, 2);
  const created = await a('/products', { ...product, name: 'Disposable demo product' });
  assert.equal(created.status, 201);
  assert.equal((await a(`/products/${created.data.product_id}`, undefined, 'DELETE')).status, 200);
  await new Promise(resolve => server.close(resolve)); base = await listen();
  assert.equal((await a('/orders')).data.orders.length, 3);
  assert.equal((await a('/auth/me')).data.user.user_id, ua.user_id);
  await pool.query(`INSERT INTO products(category_id,name,price,stock_quantity,demo_user_id)
    SELECT 1,'Quota example',1,1,$1 FROM generate_series(1,78)`, [ua.user_id]);
  assert.equal((await a('/products', product)).status, 429);
  assert.equal((await a('/demo/reset', {})).status, 200);
  assert.equal((await pool.query('SELECT count(*) FROM products WHERE demo_user_id=$1', [ua.user_id])).rows[0].count, '0');
  assert.equal((await a('/auth/me')).data.user, null);
  assert.equal((await b('/products')).data.length, 22);
  const fresh = (await a('/demo/start', {})).data.user;
  assert.notEqual(fresh.user_id, ua.user_id);
  await pool.query("UPDATE users SET demo_expires_at=NOW()-INTERVAL '1 minute' WHERE user_id=$1", [ub.user_id]);
  assert.equal((await b('/products')).status, 401);
  assert.equal(await cleanupDemo(pool), 1);
  assert.equal((await pool.query('SELECT count(*) FROM users WHERE user_id=$1', [ub.user_id])).rows[0].count, '0');
  assert.equal((await a('/products')).data.length, 22);
  assert.equal((await pool.query('SELECT count(*) FROM products WHERE demo_user_id IS NULL')).rows[0].count, '22');
});
