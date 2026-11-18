const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/js/calculations/pool-inlet-nozzle-core.js');

const example = { lengthM: 10, widthM: 5, averageDepthM: 1.5, turnoverHours: 4, maxSpacingM: 2.5, maxFlowPerNozzleM3h: 3 };

test('base pool volume and turnover flow use consistent SI units', () => {
  const r = core.calculateBase(example);
  assert.equal(r.areaM2, 50);
  assert.equal(r.volumeM3, 75);
  assert.equal(r.flowM3h, 18.75);
});

test('floor grid gives the 10 by 5 metre reference pattern and respects the spacing', () => {
  const r = core.calculateFloor(example);
  assert.equal(r.geometryCount, 8);
  assert.equal(r.recommendedCount, 8);
  assert.equal(r.layout.columns, 4);
  assert.equal(r.layout.rows, 2);
  assert.equal(r.flowPerNozzleM3h, 18.75 / 8);
  assert.equal(r.layout.spacingLengthM, 2.5);
  assert.equal(r.layout.spacingWidthM, 2.5);
  assert.equal(r.layout.marginLengthM, 1.25);
  assert.equal(r.layout.marginWidthM, 1.25);
});

test('floor layout increases a regular grid when capacity or optional area criterion requires it', () => {
  const byFlow = core.calculateFloor({ ...example, maxFlowPerNozzleM3h: 2 });
  assert.ok(byFlow.recommendedCount >= byFlow.flowCount);
  assert.ok(byFlow.layout.columns * byFlow.layout.rows === byFlow.recommendedCount);
  assert.ok(byFlow.layout.spacingLengthM <= 2.5 && byFlow.layout.spacingWidthM <= 2.5);
  const byArea = core.calculateFloor({ ...example, areaPerNozzleM2: 5 });
  assert.ok(byArea.recommendedCount >= byArea.areaCount);
});

test('wall layouts use wall span and evenly divide flow among the selected sides', () => {
  const short = core.calculateWall({ ...example, wallPlacement: 'short', maxSpacingM: 2.5, maxFlowPerNozzleM3h: '' });
  assert.equal(short.geometryCount, 2);
  assert.equal(short.recommendedCount, 2);
  assert.equal(short.actualSpacingM, 2.5);
  assert.equal(short.endOffsetM, 1.25);
  assert.equal(short.installDepthM, 0.3);
  const opposite = core.calculateWall({ ...example, wallPlacement: 'oppositeLong', maxFlowPerNozzleM3h: 4 });
  assert.equal(opposite.wallCount, 2);
  assert.ok(opposite.recommendedCount >= opposite.flowCount);
  assert.equal(opposite.flowPerNozzleM3h, 18.75 / opposite.recommendedCount);
  const staggered = core.calculateWall({ ...example, wallPlacement: 'oppositeLong', maxFlowPerNozzleM3h: 4, staggered: true });
  assert.equal(staggered.staggered, true);
  const unsupported = core.calculateWall({ ...example, wallPlacement: 'long', staggered: true });
  assert.equal(unsupported.staggered, false);
  assert.ok(unsupported.warnings.some(message => message.includes('только при выборе двух противоположных стен')));
});

test('capacity method rejects impossible values and blank capacities remain explicitly unchecked', () => {
  assert.equal(core.calculateFloor({ ...example, maxFlowPerNozzleM3h: '' }).flowCount, null);
  assert.throws(() => core.calculateFloor({ ...example, maxFlowPerNozzleM3h: 0 }), RangeError);
  assert.throws(() => core.calculateWall({ ...example, wallPlacement: 'invalid' }), RangeError);
  assert.throws(() => core.calculateFloor({ ...example, lengthM: '' }), RangeError);
});

test('extreme and non-finite geometry is rejected without NaN or unbounded layouts', () => {
  for (const value of [0, -1, NaN, Infinity, '', 'abc', 201]) {
    assert.throws(() => core.calculateFloor({ ...example, lengthM: value }), RangeError);
  }
  assert.throws(() => core.calculateFloor({ ...example, maxSpacingM: 0.001 }), RangeError);
  assert.throws(() => core.calculateBase({ ...example, turnoverHours: 0 }), RangeError);
  assert.throws(() => core.calculateFloor({ ...example, maxFlowPerNozzleM3h: 0.001 }), RangeError);
});
