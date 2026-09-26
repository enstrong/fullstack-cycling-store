import assert from 'node:assert/strict';
const base = process.argv[2];
if (!base || !/^https?:\/\//.test(base)) throw new Error('Pass the demo origin as the first argument.');
function visitor() {
  let cookie = '';
  return async (path, body, method = body === undefined ? 'GET' : 'POST') => {
    const res = await fetch(`${base}/api${path}`, { method, headers: { Cookie: cookie, Origin: base, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return { status: res.status, data: await res.json(), headers: res.headers };
  };
}
const a = visitor(), b = visitor();
try {
  assert.equal((await a('/health')).status, 200);
  const start = await a('/demo/start', {});
  assert.equal(start.status, 201);
  if (base.startsWith('https:')) assert.match(start.headers.get('set-cookie'), /Secure/);
  assert.match(start.headers.get('set-cookie'), /HttpOnly/);
  assert.equal((await b('/demo/start', {})).status, 201);
  const first = (await a('/products')).data;
  const second = (await b('/products')).data;
  assert.equal(first.length, 22); assert.equal(second.length, 22);
  assert.notEqual(first[0].product_id, second[0].product_id);
  for (const p of first) {
    assert.equal((await fetch(new URL(p.icon, base), { method: 'HEAD' })).status, 200, p.icon);
  }
  assert.equal((await a('/cart/add', { product_id: first[2].product_id, quantity: 1 })).status, 200);
  const order = await a('/orders', { first_name: 'Demo', last_name: 'Rider', country: 'US', region: 'California', city: 'Beverly Hills', street: '123 Example Street', postal_code: '90210' });
  assert.equal(order.status, 201);
  assert.equal((await a('/orders')).data.orders.length, 3);
  assert.equal((await b('/orders')).data.orders.length, 2);
  assert.equal((await a('/demo/role', { role: 'admin' })).status, 200);
  assert.equal((await a(`/products/${second[2].product_id}`, first[2], 'PUT')).status, 404);
  for (const route of ['/', '/gear', '/compare', '/account', '/cart/checkout', '/admin']) {
    assert.equal((await fetch(base + route)).status, 200, route);
  }
  console.log('PASS: HTTPS session, 22 images, isolated visitors, checkout, order history, admin boundary and direct routes.');
} finally {
  await Promise.allSettled([a('/demo/reset', {}), b('/demo/reset', {})]);
}
