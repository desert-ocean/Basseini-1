const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/js/calculations/pool-heating-core.js');

const example = { volumeM3: 50, initialTempC: 15, targetTempC: 28 };

test('calculates the example heating energy and ideal power for 24 hours', () => {
	assert.ok(Math.abs(core.heatingEnergy(50, 15, 28) - 755.95) < 1e-10);
	const result = core.powerForHeating({ ...example, heatingTimeHours: 24, surfaceM2: 1, poolLocation: 'indoor', mode: 'idle' });
	assert.ok(Math.abs(result.energyKWh - 755.95) < 1e-10);
	assert.ok(Math.abs(result.idealPowerKw - 755.95 / 24) < 1e-12);
	assert.equal(result.surfaceLossKw, 0.18);
	assert.ok(Math.abs(result.powerWithLossKw - (755.95 / 24 + 0.18)) < 1e-12);
});

test('heating-time mode reports ideal and loss-adjusted time', () => {
	const result = core.timeForHeating({ ...example, availablePowerKw: 10, surfaceM2: 32, poolLocation: 'indoor', mode: 'idle' });
	assert.equal(result.idealTimeHours, 755.95 / 10);
	assert.equal(result.surfaceLossKw, 5.76);
	assert.ok(Math.abs(result.timeWithLossHours - 755.95 / 4.24) < 1e-10);
	assert.equal(result.insufficientPower, false);
});

test('reports insufficient heating power when available power cannot cover losses', () => {
	const result = core.timeForHeating({ ...example, availablePowerKw: 5, surfaceM2: 32, poolLocation: 'indoor', mode: 'idle' });
	assert.equal(result.idealTimeHours, 755.95 / 5);
	assert.equal(result.timeWithLossHours, null);
	assert.equal(result.insufficientPower, true);
});

test('uses the four explicit surface-loss estimates', () => {
	assert.deepEqual(core.SURFACE_LOSS_W_M2, { indoor: 180, outdoorCovered: 520, outdoorPartial: 620, outdoorOpen: 1000 });
	assert.deepEqual(['indoor', 'outdoorCovered', 'outdoorPartial', 'outdoorOpen'].map((key) => core.surfaceLossKw(32, key)), [5.76, 16.64, 19.84, 32]);
});

test('keeps the user additional operating loss separate from the base surface loss', () => {
	assert.equal(core.surfaceLossKw(32, 'indoor'), 5.76);
	assert.equal(core.surfaceLossKw(32, 'indoor', 20), 6.4);
});

test('calculates operating, uncovered idle and covered idle losses by period', () => {
	const result = core.dailyBalance({ surfaceM2: 32, poolLocation: 'indoor', operationHours: 8, coverHours: 8, coverUsed: true, coverReductionPercent: 75, additionalLossWm2: 20 });
	assert.equal(result.operationLossKw, 6.4);
	assert.equal(result.additionalOperatingLossKw, 0.64);
	assert.equal(result.baseSurfaceLossKw, 5.76);
	assert.equal(result.coveredLossKw, 1.44);
	assert.equal(result.uncoveredIdleHours, 8);
	assert.equal(result.operationEnergyKWh, 51.2);
	assert.equal(result.uncoveredIdleEnergyKWh, 46.08);
	assert.equal(result.coveredEnergyKWh, 11.52);
	assert.equal(result.dailyEnergyKWh, 108.8);
	assert.equal(result.averagePowerKw, 108.8 / 24);
	assert.equal(result.maximumLossKw, 6.4);
});

test('does not invent a cover efficiency when covered hours are present', () => {
	const result = core.dailyBalance({ surfaceM2: 32, poolLocation: 'indoor', operationHours: 8, coverHours: 8, coverUsed: true, coverReductionPercent: null, additionalLossWm2: 0 });
	assert.equal(result.coveredLossKw, null);
	assert.equal(result.coveredEnergyKWh, null);
	assert.equal(result.dailyEnergyKWh, null);
	assert.equal(result.averagePowerKw, null);
	assert.equal(result.maximumLossKw, null);
	assert.equal(result.hasUnknownCoveredLoss, true);
});

test('zero additional correction means no extra entered adjustment, not a measured zero loss', () => {
	const result = core.dailyBalance({ surfaceM2: 32, poolLocation: 'indoor', operationHours: 8, coverHours: 0, coverUsed: false, additionalLossWm2: 0 });
	assert.equal(result.operationLossKw, result.baseSurfaceLossKw);
	assert.equal(result.dailyEnergyKWh, 5.76 * 24);
});

test('calculates covered surface loss only from the user-provided reduction', () => {
	assert.equal(core.coveredSurfaceLossKw(32, 'indoor', 50), 2.88);
	assert.equal(core.coveredSurfaceLossKw(32, 'indoor', null), null);
	assert.equal(core.coveredSurfaceLossKw(32, 'indoor', 0), 5.76);
	assert.equal(core.coveredSurfaceLossKw(32, 'indoor', 100), 0);
});

test('handles zero and twenty-four-hour operating periods and full-day coverage', () => {
	const noOperation = core.dailyBalance({ surfaceM2: 32, poolLocation: 'indoor', operationHours: 0, coverHours: 0, coverUsed: false, coverReductionPercent: 80, additionalLossWm2: 20 });
	assert.equal(noOperation.uncoveredIdleHours, 24);
	assert.equal(noOperation.operationEnergyKWh, 0);
	assert.equal(noOperation.dailyEnergyKWh, 5.76 * 24);
	assert.equal(noOperation.additionalOperatingLossKw, 0.64);
	const allOperation = core.dailyBalance({ surfaceM2: 32, poolLocation: 'indoor', operationHours: 24, coverHours: 0, coverUsed: false, additionalLossWm2: 20 });
	assert.equal(allOperation.uncoveredIdleHours, 0);
	assert.equal(allOperation.dailyEnergyKWh, 6.4 * 24);
	assert.equal(allOperation.maximumLossKw, 6.4);
	const allCovered = core.dailyBalance({ surfaceM2: 32, poolLocation: 'indoor', operationHours: 0, coverHours: 24, coverUsed: true, coverReductionPercent: 0, additionalLossWm2: 20 });
	assert.equal(allCovered.uncoveredIdleHours, 0);
	assert.equal(allCovered.dailyEnergyKWh, 5.76 * 24);
	assert.equal(allCovered.operationEnergyKWh, 0);
});

test('a covered period without a coefficient stays unknown while a known 0% coefficient means no reduction', () => {
	const unknown = core.dailyBalance({ surfaceM2: 32, poolLocation: 'indoor', operationHours: 0, coverHours: 24, coverUsed: true, coverReductionPercent: null });
	const zero = core.dailyBalance({ surfaceM2: 32, poolLocation: 'indoor', operationHours: 0, coverHours: 24, coverUsed: true, coverReductionPercent: 0 });
	assert.equal(unknown.dailyEnergyKWh, null);
	assert.equal(unknown.coveredLossKw, null);
	assert.equal(zero.dailyEnergyKWh, 5.76 * 24);
	assert.equal(zero.coveredLossKw, 5.76);
});

test('equal initial and target temperatures require no heat even when surface losses exceed available power', () => {
	const power = core.powerForHeating({ volumeM3: 50, initialTempC: 28, targetTempC: 28, heatingTimeHours: 24, surfaceM2: 32, poolLocation: 'indoor', mode: 'idle' });
	const time = core.timeForHeating({ volumeM3: 50, initialTempC: 28, targetTempC: 28, availablePowerKw: 1, surfaceM2: 32, poolLocation: 'indoor', mode: 'idle' });
	assert.equal(power.energyKWh, 0);
	assert.equal(power.idealPowerKw, 0);
	assert.equal(power.powerWithLossKw, 5.76);
	assert.equal(time.timeWithLossHours, 0);
	assert.equal(time.insufficientPower, false);
});

test('calculates the water-side flow for a heat exchanger at 80/60 C', () => {
	const result = core.heatExchangerFlow(40, 80, 60, 'water');
	assert.equal(result.deltaTemperatureC, 20);
	assert.ok(Math.abs(result.flowM3h - 40 / (1.163 * 20)) < 1e-12);
	assert.ok(Math.abs(result.flowM3h - 1.72) < 0.01);
});

test('does not apply the water flow coefficient to glycol without fluid properties', () => {
	const result = core.heatExchangerFlow(40, 80, 60, 'glycol');
	assert.equal(result.flowM3h, null);
	assert.equal(result.requiresFluidProperties, true);
});

test('calculates heat-pump electric input only when the user supplies COP', () => {
	assert.equal(core.heatPumpElectricPower(40, null), null);
	assert.equal(core.heatPumpElectricPower(40, 4), 10);
});

test('heat-up power uses the explicitly selected covered mode and requires its efficiency', () => {
	const missing = core.powerForHeating({ ...example, heatingTimeHours: 24, surfaceM2: 32, poolLocation: 'indoor', mode: 'covered', coverReductionPercent: null });
	assert.ok(Math.abs(missing.idealPowerKw - 755.95 / 24) < 1e-12);
	assert.equal(missing.surfaceLossKw, null);
	assert.equal(missing.powerWithLossKw, null);
	assert.equal(missing.coverEfficiencyRequired, true);
	const known = core.powerForHeating({ ...example, heatingTimeHours: 24, surfaceM2: 32, poolLocation: 'indoor', mode: 'covered', coverReductionPercent: 75 });
	assert.equal(known.surfaceLossKw, 1.44);
	assert.equal(known.powerWithLossKw, 755.95 / 24 + 1.44);
});

test('validates temperatures, location, hours, coverage and numeric boundaries', () => {
	assert.throws(() => core.heatingEnergy(50, 28, 15), /target temperature/);
	assert.throws(() => core.heatingEnergy(0, 15, 28), /volumeM3/);
	assert.throws(() => core.heatingEnergy(50, 15, 51), /Target water temperature/);
	assert.throws(() => core.surfaceLossKw(32, 'unknown'), /pool location/);
	assert.throws(() => core.surfaceLossKw(32, 'indoor', -1), /additionalLossWm2/);
	assert.throws(() => core.coveredSurfaceLossKw(32, 'indoor', 101), /coverReductionPercent/);
	assert.throws(() => core.dailyBalance({ surfaceM2: 32, poolLocation: 'indoor', operationHours: 20, coverHours: 5, coverUsed: true, coverReductionPercent: 50 }), /no more than 24/);
	assert.throws(() => core.dailyBalance({ surfaceM2: 32, poolLocation: 'indoor', operationHours: 4, coverHours: 2, coverUsed: false }), /require an available cover/);
	assert.throws(() => core.heatExchangerFlow(40, 60, 80, 'water'), /Supply temperature/);
	assert.throws(() => core.heatPumpElectricPower(40, 0), /cop/);
});

test('allows already-target temperature as zero energy but rejects an unsupported cooling request', () => {
	assert.equal(core.heatingEnergy(50, 28, 28), 0);
	const result = core.timeForHeating({ volumeM3: 50, initialTempC: 28, targetTempC: 28, availablePowerKw: 1, surfaceM2: 32, poolLocation: 'indoor', mode: 'idle' });
	assert.equal(result.timeWithLossHours, 0);
});
