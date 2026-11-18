const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/js/calculations/overflow-system-core.js');

test('trough section uses the published coefficients and supports both categories', () => {
  const general = core.calculateTroughSection({ category: 'general', flowM3h: 30, lengthM: 24, outlets: 12, approach: 'one', swimmers: 30, widthMm: 250 });
  assert.equal(general.areaM2, 0.0795);
  assert.equal(general.areaCm2, 795);
  assert.equal(general.workingDepthMm, 318);
  const teaching = core.calculateTroughSection({ category: 'teaching', flowM3h: 30, lengthM: 24, outlets: 12, approach: 'two', swimmers: 30, reservePct: 50, widthMm: 250 });
  assert.equal(teaching.k, 2);
  assert.ok(Math.abs(teaching.areaM2 - 0.044125) < 1e-12);
  assert.equal(teaching.reservedAreaM2, teaching.areaM2 * 1.5);
});

test('outlet calculator matches the 8 by 4 metre example', () => {
  const result = core.calculateOutlets({ geometry: 'rectangle', lengthM: 8, widthM: 4, flowM3h: 30, internalDiameterMm: 50, velocityMps: 0.6 });
  assert.equal(result.totalLengthM, 24);
  assert.equal(result.geometryCount, 12);
  assert.ok(Math.abs(result.theoreticalFlowPerOutletM3h - 4.241150082346221) < 1e-12);
  assert.equal(result.flowCount, 8);
  assert.equal(result.recommendedCount, 12);
  assert.equal(result.totalTheoreticalCapacityM3h, result.recommendedCount * result.theoreticalFlowPerOutletM3h);
  assert.deepEqual(result.segments.map(segment => segment.outlets), [4, 4, 2, 2]);
  assert.equal(result.actualMaxSpacingM, 2);
});

test('independent open segments honor their own end gaps and max spacing', () => {
  const result = core.calculateOutlets({ geometry: 'segments', segments: [{ lengthM: 5 }, { lengthM: 1 }], flowM3h: 1, maxSpacingM: 2, internalDiameterMm: 50, velocityMps: 0.6 });
  assert.deepEqual(result.segments.map(segment => segment.outlets), [3, 1]);
  assert.deepEqual(result.segments.map(segment => segment.endOffsetM), [5 / 6, 0.5]);
  assert.ok(result.actualMaxSpacingM <= 2);
});

test('segment lengths accept decimal comma or point with semicolon separators', () => {
  assert.deepEqual(core.parseSegmentLengths('7,5; 4.2; 3,3'), [7.5, 4.2, 3.3]);
  assert.deepEqual(core.parseSegmentLengths('5,1'), [5.1]);
  assert.deepEqual(core.parseSegmentLengths('5.1; 4,2'), [5.1, 4.2]);

  const lengths = core.parseSegmentLengths('7,5; 4.2; 3,3');
  const result = core.calculateOutlets({ geometry: 'segments', segments: lengths.map(lengthM => ({ lengthM })), flowM3h: 1 });
  assert.equal(result.totalLengthM, 15);
  assert.equal(result.geometryCount, 9);
  assert.deepEqual(result.segments.map(segment => segment.outlets), [4, 3, 2]);
  assert.ok(result.actualMaxSpacingM <= 2);
});

test('segment parser rejects blank, empty, and ambiguous comma-delimited values', () => {
  for (const value of ['', '   ', '7,5;;3,3', ';', '7.5,4.2', 'abc; 2', '0; 2', '-1; 2']) {
    assert.throws(() => core.parseSegmentLengths(value), { name: 'RangeError' });
  }
});

test('closed loop count rounds up and distributes equal spacing', () => {
  const result = core.calculateOutlets({ geometry: 'loop', totalLengthM: 24.1, flowM3h: 1, maxSpacingM: 2 });
  assert.equal(result.geometryCount, 13);
  assert.ok(result.actualMaxSpacingM <= 2);
});

test('invalid, missing and excessive inputs are rejected instead of producing NaN', () => {
  for (const flowM3h of [0, -1, '']) assert.throws(() => core.calculateOutlets({ geometry: 'loop', totalLengthM: 12, flowM3h }));
  assert.throws(() => core.calculateOutlets({ geometry: 'segments', segments: [], flowM3h: 10 }));
  assert.throws(() => core.calculateTroughSection({ category: 'general', flowM3h: 10, lengthM: 10, outlets: 0, approach: 'one', swimmers: 10, widthMm: 200 }));
  assert.throws(() => core.calculateTroughSection({ category: 'other', flowM3h: 10, lengthM: 10, outlets: 1, approach: 'one', swimmers: 10, widthMm: 200 }));
  assert.throws(() => core.calculateOutlets({ geometry: 'loop', totalLengthM: 10000, flowM3h: 10, maxSpacingM: 0.01 }));
  assert.throws(() => core.calculateOutlets({ geometry: 'loop', totalLengthM: 10, flowM3h: 100000, internalDiameterMm: 0.000001, velocityMps: 0.001 }));
});
