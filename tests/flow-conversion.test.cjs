const { test } = require('node:test');
const assert = require('node:assert/strict');
const convert = require('../spravochnik/flow-conversion.js');

test('converts flow in all six directions without chaining rounded display values', () => {
  assert.equal(convert(12, 'm3h', 'lmin'), 200);
  assert.equal(convert(12, 'm3h', 'ls'), 12 * (5 / 18));
  assert.equal(convert(200, 'lmin', 'm3h'), 12);
  assert.equal(convert(200, 'lmin', 'ls'), 200 / 60);
  assert.equal(convert(3.6, 'ls', 'm3h'), 3.6 * 3.6);
  assert.equal(convert(3.3333333333333335, 'ls', 'lmin'), 200);
});

test('accepts zero, decimals and large finite flows and rejects invalid or overflowing values', () => {
  assert.equal(convert(0, 'm3h', 'lmin'), 0);
  assert.equal(convert(0.000001, 'm3h', 'ls'), 0.000001 * (5 / 18));
  assert.equal(convert(1e12, 'm3h', 'lmin'), 1e12 * (50 / 3));
  assert.throws(() => convert(-1, 'm3h', 'ls'), RangeError);
  assert.throws(() => convert(Infinity, 'm3h', 'ls'), RangeError);
  assert.throws(() => convert(NaN, 'm3h', 'ls'), RangeError);
  assert.throws(() => convert(1e308, 'm3h', 'lmin'), RangeError);
  assert.throws(() => convert(1, 'invalid', 'ls'), RangeError);
  assert.throws(() => convert(1, 'm3h', 'invalid'), RangeError);
});
