'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/js/calculations/pool-balance-tank-core.js');

const tankInput = overrides => ({
  lengthM: 8,
  widthM: 4,
  averageDepthM: 1.5,
  batherCount: 8,
  tankLengthM: 3,
  tankWidthM: 2,
  tankHeightM: 2,
  bottomZoneMm: 150,
  topZoneMm: 150,
  minimumSafeLevelMm: 300,
  normalLevelMm: 1000,
  maximumWorkingLevelMm: 1700,
  emergencyOverflowLevelMm: 1850,
  backwashFromTank: false,
  troughDrainM3: 0,
  gravityPipeDrainM3: 0,
  attractionReturnM3: 0,
  otherReturnM3: 0,
  circulationFlowM3h: 0,
  returnDelayMinutes: 0,
  additionalReserveM3: 0,
  stopWithBathing: false,
  ...overrides
});

test('pool geometry and example 1 use area times average depth', () => {
  assert.deepEqual(core.poolGeometry({ lengthM: 8, widthM: 4, averageDepthM: 1.5 }), { areaM2: 32, volumeM3: 48 });
  const result = core.calculateSimple({ lengthM: 8, widthM: 4, averageDepthM: 1.5, batherCount: 8 });
  assert.equal(result.displacementM3, 0.6);
  assert.equal(result.waveM3, 1.92);
  assert.equal(result.referenceUsefulVolumeM3, 2.52);
});

test('wave-height model uses 0.06 m through 100 m2 and 0.04 m above 100 m2', () => {
  assert.equal(core.waveEquivalentDepthM(100), 0.06);
  assert.equal(core.waveEquivalentDepthM(100.001), 0.04);
  assert.equal(core.calculateSimple({ lengthM: 25, widthM: 12.5, averageDepthM: 2, batherCount: 125 }).waveM3, 12.5);
});

test('backwash volume converts minutes to hours and handles sequential filter washes', () => {
  const result = core.backwashVolumes({ filterCount: 2, filtersToWash: 2, filterAreaM2: 2, intensityLsM2: 12, durationMinutes: 5, pattern: 'sequential' });
  assert.equal(result.oneFilterFlowM3h, 86.4);
  assert.equal(result.peakFlowM3h, 86.4);
  assert.equal(result.backwashM3, 14.4);
  assert.equal(result.totalM3, 14.4);
  assert.equal(result.cycles, 2);
});

test('simultaneous wash changes peak flow but not total volume for equal filters and duration', () => {
  const common = { filterCount: 2, filtersToWash: 2, filterAreaM2: 2, intensityLsM2: 12, durationMinutes: 5 };
  const sequential = core.backwashVolumes({ ...common, pattern: 'sequential' });
  const simultaneous = core.backwashVolumes({ ...common, pattern: 'simultaneous' });
  assert.equal(sequential.totalM3, simultaneous.totalM3);
  assert.equal(simultaneous.peakFlowM3h, 2 * sequential.peakFlowM3h);
});

test('backwash filter diameter calculates area from actual entered diameter and includes rinse', () => {
  const result = core.backwashVolumes({ filterCount: 1, filtersToWash: 1, filterDiameterMm: 1000, intensityLsM2: 10, durationMinutes: 5, rinseM3: 0.2 });
  assert.ok(Math.abs(result.filterAreaM2 - Math.PI / 4) < 1e-12);
  assert.ok(Math.abs(result.backwashM3 - Math.PI * 10 * 3.6 * 5 / 60 / 4) < 1e-12);
  assert.ok(Math.abs(result.totalM3 - result.backwashM3 - 0.2) < 1e-12);
});

test('separate wash source is excluded from the balance tank demand', () => {
  const result = core.calculateEngineering(tankInput({ backwashFromTank: false }));
  assert.equal(result.backwash.totalM3, 0);
  assert.equal(result.standardReferenceM3, 2.52);
  assert.equal(result.lowerRequiredM3, 0);
});

test('150 mm construction zones and example 3 produce distinct geometric and useful volumes', () => {
  const result = core.calculateEngineering(tankInput({ batherCount: 0 }));
  assert.equal(result.geometricVolumeM3, 12);
  assert.ok(Math.abs(result.lowerZoneM3 - 0.9) < 1e-12);
  assert.ok(Math.abs(result.upperZoneM3 - 0.9) < 1e-12);
  assert.ok(Math.abs(result.clearBandVolumeM3 - 10.2) < 1e-12);
  assert.equal(result.normalWaterVolumeM3, 6);
  assert.ok(Math.abs(result.pumpReserveM3 - 4.2) < 1e-12);
  assert.ok(Math.abs(result.freeToWorkingLevelM3 - 4.2) < 1e-12);
  assert.ok(Math.abs(result.availableOperatingRangeM3 - 8.4) < 1e-12);
});

test('normal upper and lower scenario checks are reported independently', () => {
  const result = core.calculateEngineering(tankInput({
    batherCount: 8,
    backwashFromTank: true,
    filterCount: 1,
    filtersToWash: 1,
    filterAreaMode: 'area',
    filterAreaPerFilterM2: 0.5,
    backwashIntensityLsM2: 12,
    backwashDurationMinutes: 5,
    rinseM3: 0.2,
    troughDrainM3: 1.1,
    gravityPipeDrainM3: 0.4
  }));
  assert.equal(result.backwash.backwashM3, 1.8);
  assert.equal(result.backwash.totalM3, 2);
  assert.equal(result.stopReturnM3, 1.5);
  assert.equal(result.upperRequiredM3, 2.52);
  assert.equal(result.lowerRequiredM3, 2);
  assert.equal(result.standardReferenceM3, 4.52);
  assert.equal(result.checks.allPassed, true);
});

test('shutdown return volume uses the maximum of exclusive upper scenarios or adds simultaneous events', () => {
  const exclusive = core.calculateEngineering(tankInput({ batherCount: 8, troughDrainM3: 3 }));
  const simultaneous = core.calculateEngineering(tankInput({ batherCount: 8, troughDrainM3: 3, stopWithBathing: true }));
  assert.equal(exclusive.upperRequiredM3, 3);
  assert.equal(simultaneous.upperRequiredM3, 5.52);
});

test('start-up drawdown uses circulation flow times the return delay', () => {
  const result = core.calculateEngineering(tankInput({ batherCount: 0, circulationFlowM3h: 18, returnDelayMinutes: 10 }));
  assert.equal(result.startupReserveM3, 3);
  assert.equal(result.lowerRequiredM3, 3);
});

test('minimum tank geometry at the entered footprint includes safe level, scenario range and top zone', () => {
  const result = core.calculateEngineering(tankInput({ batherCount: 8 }));
  const expectedHeight = 0.3 + 2.52 / 6 + 0.15;
  assert.ok(Math.abs(result.minimumInternalHeightAtFootprintM - expectedHeight) < 1e-12);
  assert.ok(Math.abs(result.minimumGeometricVolumeM3 - 6 * expectedHeight) < 1e-12);
});

test('invalid levels, impossible margins, out-of-range filters and nonphysical inputs are rejected', () => {
  for (const input of [
    tankInput({ lengthM: 0 }),
    tankInput({ batherCount: -1 }),
    tankInput({ batherCount: 1.5 }),
    tankInput({ tankHeightM: 0.2 }),
    tankInput({ minimumSafeLevelMm: 149 }),
    tankInput({ normalLevelMm: 1700 }),
    tankInput({ emergencyOverflowLevelMm: 1900 }),
    tankInput({ troughDrainM3: -0.1 }),
    tankInput({ circulationFlowM3h: Infinity })
  ]) assert.throws(() => core.calculateEngineering(input), RangeError);
  assert.throws(() => core.backwashVolumes({ filterCount: 1, filtersToWash: 2, filterAreaM2: 1, intensityLsM2: 12, durationMinutes: 5 }), RangeError);
  assert.throws(() => core.waveEquivalentDepthM(0), RangeError);
});
