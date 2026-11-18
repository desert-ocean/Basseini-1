'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../assets/js/calculations/pool-coagulation-core.js');
const core = global.PoolCoagulationCore;

test('continuous dosing calculates pump rate, daily product, and turnover time', () => {
  const result = core.calculateContinuous({
    poolVolumeM3: 60,
    circulationFlowM3H: 15,
    doseMlPerM3: 0.5,
    runtimeHoursPerDay: 12
  });
  assert.equal(result.pumpRateMlH, 7.5);
  assert.equal(result.pumpRateLh, 0.0075);
  assert.equal(result.dailyConsumptionMl, 90);
  assert.equal(result.dailyConsumptionL, 0.09);
  assert.equal(result.turnoverPeriodHours, 4);
});

test('continuous dosing scales only with circulation flow and declared dose', () => {
  const result = core.calculateContinuous({
    poolVolumeM3: 10,
    circulationFlowM3H: 30,
    doseMlPerM3: 0.5,
    runtimeHoursPerDay: 1
  });
  assert.equal(result.pumpRateMlH, 15);
  assert.equal(result.dailyConsumptionMl, 15);
});

test('a zero declared dose returns zero without hiding pump-sizing inputs', () => {
  const result = core.calculateContinuous({
    poolVolumeM3: 60,
    circulationFlowM3H: 15,
    doseMlPerM3: 0,
    runtimeHoursPerDay: 12
  });
  assert.equal(result.pumpRateMlH, 0);
  assert.equal(result.dailyConsumptionMl, 0);
  assert.equal(result.turnoverPeriodHours, 4);
});

test('single treatment calculates 400 ml for 40 m3 at 10 ml/m3', () => {
  const result = core.calculateSingleDose({ poolVolumeM3: 40, doseMlPerM3: 10 });
  assert.equal(result.productMl, 400);
  assert.equal(result.productL, 0.4);
});

test('single treatment supports a zero dose and returns zero product', () => {
  const result = core.calculateSingleDose({ poolVolumeM3: 40, doseMlPerM3: 0 });
  assert.equal(result.productMl, 0);
  assert.equal(result.productL, 0);
});

test('rejects blank, zero flow, negative values, and invalid runtime', () => {
  assert.throws(() => core.calculateContinuous({ poolVolumeM3: NaN, circulationFlowM3H: 1, doseMlPerM3: 1, runtimeHoursPerDay: 1 }));
  assert.throws(() => core.calculateContinuous({ poolVolumeM3: 1, circulationFlowM3H: 0, doseMlPerM3: 1, runtimeHoursPerDay: 1 }));
  assert.throws(() => core.calculateContinuous({ poolVolumeM3: 1, circulationFlowM3H: 1, doseMlPerM3: -1, runtimeHoursPerDay: 1 }));
  assert.throws(() => core.calculateContinuous({ poolVolumeM3: 1, circulationFlowM3H: 1, doseMlPerM3: 1, runtimeHoursPerDay: 24.1 }));
  assert.throws(() => core.calculateSingleDose({ poolVolumeM3: -1, doseMlPerM3: 1 }));
  assert.throws(() => core.calculateSingleDose({ poolVolumeM3: 1, doseMlPerM3: NaN }));
});

test('rejects non-finite calculation results', () => {
  assert.throws(() => core.calculateContinuous({
    poolVolumeM3: 1,
    circulationFlowM3H: 1e308,
    doseMlPerM3: 1e308,
    runtimeHoursPerDay: 1
  }), /диапазона/);
  assert.throws(() => core.calculateSingleDose({ poolVolumeM3: 1e308, doseMlPerM3: 1e308 }), /диапазона/);
});
