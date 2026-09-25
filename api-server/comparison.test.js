const { test } = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('./data/product-research.json');
const product = (weight, group = 'helmets', basis = 'medium') => ({ price: 100, research: { group, specs: { weight: { value: weight, basis } } } });
test('comparison ranks comparable weights and leaves unknowns, ties and unrelated measurements neutral', async () => {
  const { rankSpec } = await import('../shared/comparison.mjs');
  const light = product(225), heavy = product(270), unknown = product(null);
  assert.equal(rankSpec([light, heavy, unknown], 'weight', light), 'best');
  assert.equal(rankSpec([light, heavy, unknown], 'weight', heavy), 'worst');
  assert.equal(rankSpec([light, heavy, unknown], 'weight', unknown), null);
  for (const other of [product(225), product(100, 'glasses'), product(100, 'helmets', 'small')]) {
    assert.equal(rankSpec([light, other], 'weight', light), null);
  }
});
test('Tour wins rank higher and zero is a known value', async () => {
  const { rankSpec } = await import('../shared/comparison.mjs');
  const products = [0, 1, 2].map(value => ({research: {group: 'bikes', specs: {tour_wins: {value, basis: 'mens-gc'}}}}));
  assert.equal(rankSpec(products, 'tour_wins', products[0]), 'worst');
  assert.equal(rankSpec(products, 'tour_wins', products[1]), null);
  assert.equal(rankSpec(products, 'tour_wins', products[2]), 'best');
});
test('research preserves all 22 products and four bikes with sources and explicit unknowns', () => {
  assert.equal(catalog.length, 22);
  assert.equal(new Set(catalog.map(p => p.name)).size, 22);
  assert.equal(catalog.filter(p => p.research.group === 'bikes').length, 4);
  for (const {research} of catalog) {
    assert.ok(research.description && research.riders && research.sources.length);
    for (const key of ['weight', 'material', 'sizes', 'tour_wins']) assert.ok(Object.hasOwn(research.specs[key], 'value'));
    for (const source of research.sources) assert.equal(new URL(source.url).protocol, 'https:');
  }
});
