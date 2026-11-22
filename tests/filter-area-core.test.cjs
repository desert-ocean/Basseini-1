'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/js/calculations/filter-area-core.js');

test('required area is flow divided by filtration rate', () => {
  const result = core.calculateRequiredArea({ flowM3h: 30, filtrationRateMph: 20 });
  assert.equal(result.requiredAreaM2, 1.5);
});

test('decimal comma and point are parsed as the same decimal number', () => {
  const comma = core.calculateRequiredArea({ flowM3h: '30,5', filtrationRateMph: '0,5' });
  const point = core.calculateRequiredArea({ flowM3h: '30.5', filtrationRateMph: '0.5' });
  assert.deepEqual(comma, point);
  assert.equal(comma.requiredAreaM2, 61);
  assert.equal(core.calculateRequiredArea({ flowM3h: '0,5', filtrationRateMph: '0.5' }).requiredAreaM2, 1);
});

test('filter group reports area, actual rate, reserve and one-filter-out mode', () => {
  const result = core.calculateFilterGroup({ diameterMm: 800, count: 2, flowM3h: 30, filtrationRateMph: 30 });
  assert.ok(Math.abs(result.singleAreaM2 - Math.PI * 0.8 ** 2 / 4) < 1e-12);
  assert.equal(result.groupAreaM2, result.singleAreaM2 * 2);
  assert.ok(Math.abs(result.actualRateMph - 30 / result.groupAreaM2) < 1e-12);
  assert.ok(Math.abs(result.rateWithOneUnavailableMph - 60 / result.groupAreaM2) < 1e-12);
  assert.equal(result.areaSufficient, true);
});

test('backwash gives single-filter and simultaneous group flows', () => {
  const result = core.calculateBackwash({ diameterMm: 600, count: 2, backwashRateMph: 54 });
  assert.ok(Math.abs(result.singleFilterFlowM3h - result.singleAreaM2 * 54) < 1e-12);
  assert.equal(result.allFiltersFlowM3h, result.singleFilterFlowM3h * 2);
});

test('invalid, empty, out-of-range and fractional inputs are rejected', () => {
  for (const flowM3h of [undefined, '', 0, -1, Infinity, 10001]) {
    assert.throws(() => core.calculateRequiredArea({ flowM3h, filtrationRateMph: 20 }), RangeError);
  }
  for (const filtrationRateMph of [0, -1, NaN, 101]) {
    assert.throws(() => core.calculateRequiredArea({ flowM3h: 20, filtrationRateMph }), RangeError);
  }
  for (const count of [0, -1, 1.5, 101]) {
    assert.throws(() => core.calculateFilterGroup({ diameterMm: 500, count, flowM3h: 10 }), RangeError);
  }
  assert.throws(() => core.calculateBackwash({ diameterMm: 49, count: 1, backwashRateMph: 20 }), RangeError);
});

test('empty, negative, zero, malformed and multiply separated decimals are rejected', () => {
  for (const flowM3h of ['', '   ', '-0,5', '0', 'abc', '30,5.2', '1,2,3', 'Infinity']) {
    assert.throws(() => core.calculateRequiredArea({ flowM3h, filtrationRateMph: 20 }), RangeError);
  }
  for (const count of ['', '2.5', '2,5', '1,000', 'abc']) {
    assert.throws(() => core.calculateFilterGroup({ diameterMm: 800, count, flowM3h: 30 }), RangeError);
  }
});

test('one-filter unavailable rate is not shown for a single-filter system', () => {
  const result = core.calculateFilterGroup({ diameterMm: 500, count: 1, flowM3h: 10 });
  assert.equal(result.rateWithOneUnavailableMph, null);
});
