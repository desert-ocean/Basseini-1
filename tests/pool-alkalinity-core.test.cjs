'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../assets/js/calculations/pool-alkalinity-core.js');
const C = global.PoolAlkalinityCore;

test('50 m3 increase from 40 to 100 mg/L uses about 5.04 kg NaHCO3', () => {
  const result = C.increaseWithBicarbonate({ volumeM3: 50, currentTa: 40, targetTa: 100, purityPercent: 100 });
  assert.ok(Math.abs(result.reagentMassKg - 5.0360) < 0.001);
  assert.equal(result.deltaTa, 60);
});

test('commercial bicarbonate mass accounts for product purity', () => {
  const pure = C.increaseWithBicarbonate({ volumeM3: 50, currentTa: 40, targetTa: 100, purityPercent: 100 });
  const product = C.increaseWithBicarbonate({ volumeM3: 50, currentTa: 40, targetTa: 100, purityPercent: 80 });
  assert.ok(Math.abs(product.reagentMassKg - pure.reagentMassKg / 0.8) < 1e-12);
});

test('water exchange accounts for the makeup-water alkalinity', () => {
  const result = C.calculateReplacement({ volumeM3: 50, currentTa: 200, targetTa: 120, makeupTa: 40 });
  assert.equal(result.replacementM3, 25);
  assert.equal(result.replacementPercent, 50);
});

test('100 m3 reduction by 50 mg/L requires about 3.64 kg pure HCl', () => {
  const result = C.reduceWithAcid({ volumeM3: 100, currentTa: 180, targetTa: 130, reagent: 'HCl', concentrationPercent: 30, densityKgL: 1.15 });
  assert.ok(Math.abs(result.activeMassKg - 3.6427) < 0.002);
  assert.ok(Math.abs(result.reagentMassKg - 12.1424) < 0.01);
  assert.ok(Math.abs(result.reagentVolumeL - result.reagentMassKg / 1.15) < 1e-12);
});

test('acid stoichiometry differs for hydrochloric, sulfuric and bisulfate reagents', () => {
  const base = { volumeM3: 10, currentTa: 100, targetTa: 90, concentrationPercent: 100 };
  const hcl = C.reduceWithAcid({ ...base, reagent: 'HCl', densityKgL: 1.1 });
  const h2so4 = C.reduceWithAcid({ ...base, reagent: 'H2SO4', densityKgL: 1.8 });
  const nahso4 = C.reduceWithAcid({ ...base, reagent: 'NaHSO4' });
  assert.ok(hcl.activeMassKg < h2so4.activeMassKg);
  assert.ok(h2so4.activeMassKg < nahso4.activeMassKg);
  assert.equal(typeof nahso4.reagentVolumeL, 'undefined');
});

test('concentration and density correctly scale liquid product volume', () => {
  const result = C.reduceWithAcid({ volumeM3: 20, currentTa: 120, targetTa: 100, reagent: 'H2SO4', concentrationPercent: 50, densityKgL: 1.4 });
  assert.ok(Math.abs(result.reagentVolumeL - result.activeMassKg / 0.5 / 1.4) < 1e-12);
});

test('replacement rejects a target outside the mixing interval', () => {
  assert.throws(() => C.calculateReplacement({ volumeM3: 50, currentTa: 200, targetTa: 120, makeupTa: 150 }), /нельзя получить/);
  assert.throws(() => C.calculateReplacement({ volumeM3: 50, currentTa: 120, targetTa: 100, makeupTa: 120 }), /не изменит результат/);
});

test('cost comparison separates water, sewer, heating, and reagent costs', () => {
  const result = C.compareCosts({
    volumeM3: 100, currentTa: 180, targetTa: 110, makeupTa: 40,
    reagent: 'HCl', concentrationPercent: 30, densityKgL: 1.15,
    waterTariff: 80, sewerTariff: 60, chemicalTariff: 50,
    sourceTemperature: 8, poolTemperature: 28, energyTariff: 8, heatingEfficiencyPercent: 90
  });
  assert.equal(result.replacement.replacementM3, 50);
  assert.equal(result.replacementWaterCost, 7000);
  assert.ok(result.replacementHeatingKwh > 0);
  assert.ok(result.replacementTotal > result.replacementWaterCost);
  assert.ok(result.chemicalCost > 0);
});

test('energy is not charged when makeup water is not colder than pool water', () => {
  const result = C.compareCosts({
    volumeM3: 10, currentTa: 120, targetTa: 100, makeupTa: 20,
    reagent: 'HCl', concentrationPercent: 30, densityKgL: 1.1,
    waterTariff: 0, sewerTariff: 0, chemicalTariff: 1,
    sourceTemperature: 30, poolTemperature: 28, energyTariff: 10, heatingEfficiencyPercent: 80
  });
  assert.equal(result.replacementHeatingKwh, 0);
  assert.equal(result.replacementHeatingCost, 0);
});

test('unit conversion is reversible and uses CaCO3 equivalent weight', () => {
  assert.ok(Math.abs(C.mgLAsCaCO3ToMeqL(100) * 50.04345 - 100) < 1e-12);
  assert.ok(Math.abs(C.meqLToMgLAsCaCO3(2) - 100.0869) < 1e-4);
});

test('invalid, negative and non-finite inputs are rejected', () => {
  assert.throws(() => C.increaseWithBicarbonate({ volumeM3: 0, currentTa: 40, targetTa: 100 }));
  assert.throws(() => C.increaseWithBicarbonate({ volumeM3: 50, currentTa: -1, targetTa: 100 }));
  assert.throws(() => C.reduceWithAcid({ volumeM3: 50, currentTa: 100, targetTa: 50, reagent: 'HCl', concentrationPercent: 0, densityKgL: 1 }));
  assert.throws(() => C.reduceWithAcid({ volumeM3: 50, currentTa: 100, targetTa: 50, reagent: 'HCl', concentrationPercent: 30, densityKgL: 0 }));
  assert.throws(() => C.calculateReplacement({ volumeM3: Infinity, currentTa: 200, targetTa: 100, makeupTa: 40 }));
  assert.throws(() => C.mgLAsCaCO3ToMeqL(NaN));
  assert.throws(() => C.increaseWithBicarbonate({ volumeM3: 1e308, currentTa: 0, targetTa: 1e308, purityPercent: 100 }), /диапазона/);
});

test('no-op corrections return zero rather than invalid negative demand', () => {
  assert.equal(C.increaseWithBicarbonate({ volumeM3: 10, currentTa: 100, targetTa: 100 }).reagentMassKg, 0);
  assert.equal(C.reduceWithAcid({ volumeM3: 10, currentTa: 100, targetTa: 100, reagent: 'NaHSO4' }).reagentMassKg, 0);
  assert.equal(C.calculateReplacement({ volumeM3: 10, currentTa: 100, targetTa: 100, makeupTa: 20 }).replacementM3, 0);
});
