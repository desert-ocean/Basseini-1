const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/js/calculations/pool-heating-engineering-core.js');

const close = (actual, expected, tolerance = 0.02) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const base = {
	shape: 'rectangle', lengthM: 8, widthM: 4, averageDepthM: 1.5,
	waterTempC: 28, airTempC: 15, relativeHumidityPercent: 73, pressureKpa: 101.325,
	windMs: 2, alphaWm2K: 6.98, effectiveRadiantTempC: 15, solarGainWm2: 0,
	coverFraction: 0, structureLossKw: 0, occupants: 0, occupantGainW: 0,
	makeupM3Day: 0, makeupTempC: 10, batherCarryoutM3Day: 0
};

test('pool area, geometric volume and optional actual volume are kept distinct', () => {
	assert.deepEqual(core.poolGeometry(base), { areaM2: 32, geometricVolumeM3: 48, volumeM3: 48, usesActualVolume: false });
	assert.equal(core.poolGeometry({ ...base, actualVolumeM3: 51 }).volumeM3, 51);
	assert.equal(core.poolGeometry({ ...base, actualVolumeM3: 51, extraWaterVolumeM3: 2 }).volumeM3, 53);
});

test('initial heat-up energy uses the water heat capacity approximation', () => {
	close(core.heatingEnergy(10, 7, 28), 244.23, 0.01);
	close(core.heatingEnergy(48, 7, 28), 1172.304, 0.001);
});

test('1 m3 reference heat-up uses the reproducible full input set and strict energy tolerance', () => {
	const input = {
		shape: 'rectangle', lengthM: 1, widthM: 1, averageDepthM: 1,
		initialTempC: 8, targetTempC: 28, waterTempC: 28,
		environment: 'outdoor', airTempC: 20, relativeHumidityPercent: 60, pressureKpa: 101.325,
		windMs: 1, alphaWm2K: 4.07, effectiveRadiantTempC: 20, emissivity: 0.96, radiationModel: 'stefan',
		solarGainWm2: 0, coverFraction: 0, coverHoursPerDay: 0, coverStartHour: 20,
		structureLossKw: 0, makeupM3Day: 0, makeupTempC: 10, batherCarryoutM3Day: 0, occupants: 0, occupantGainW: 0
	};
	input.geometry = core.poolGeometry(input);
	const result = core.requiredHeatingPower(input, 24);
	close(result.requiredPowerKw, 1.1482600566563406, 1e-8);
	close(result.simulation.sourceEnergyKWh, 27.5582413597515, 1e-8);
	close(result.simulation.netLossEnergyKWh, 4.2982413597514, 1e-8);
	assert.ok(Math.abs(result.simulation.energyBalanceResidualKWh) < 1e-8);
});

test('psychrometric humidity ratio uses vapor pressure and barometric pressure', () => {
	const state = core.humidityState(27, 30, 60, 101.325);
	close(state.xSatKgKg, 0.02265, 0.0001);
	close(state.xAirKgKg, 0.0161, 0.0001);
	close(core.dewPointC(30, 60, 101.325), 21.39, 0.08);
	assert.ok(core.saturationPressureKpa(-20, 'ice') < core.saturationPressureKpa(0, 'water'));
});

test('temperature-dependent latent heat is converted from kJ/kg to Wh/kg', () => {
	const result = core.surfaceComponents({ ...base, waterTempC: 27 });
	close(result.latentHeatWhKg, 677.0, 0.2);
});

test('reproduces the supplied Saunus open-pool reference table without coefficient fitting', () => {
	const result = core.calculateSaunusReferenceExample();
	const expected = [
		[311, 33.37, 45.59, 390, 274, 210.432],
		[446, 57.24, 45.59, 549, 433, 332.544],
		[714, 104.88, 45.59, 865, 749, 575.232]
	];
	result.forEach((row, index) => {
		const values = expected[index];
		close(row.evaporationWm2, values[0], 0.6);
		close(row.convectionWm2, values[1], 0.02);
		close(row.radiationWm2, values[2], 0.01);
		close(row.lossesWm2, values[3], 0.7);
		close(row.requiredHeatingWm2, values[4], 0.8);
		close(row.dailyEnergyKWhFor32m2, values[5], 0.6);
	});
});

test('psychrometric Saunus inputs remain distinct from the book rounded humidity ratios', () => {
	const state = core.humidityState(24, 15.8, 73, 101.325);
	close(state.xSatKgKg, 0.0188751, 1e-7);
	close(state.xAirKgKg, 0.00814859, 1e-7);
	const expected = [320.94, 459.52, 736.70];
	[1, 2, 4].forEach((wind, index) => close(core.calculateSaunusEvaporationWm2(wind, state.xSatKgKg, state.xAirKgKg, 680), expected[index], 0.02));
	assert.ok(expected[0] > 311 * 1.03);
});

test('retains the original Saunus indoor reference as its own regression case', () => {
	const row = core.calculateSaunusIndoorReference();
	close(row.evaporationWm2, 130.67, 0.1);
	close(row.convectionWm2, -12.3, 0.05);
	close(row.netLoadWm2, 118.37, 0.15);
	close(row.dailyEnergyKWhFor32m2, 90.91, 0.3);
});

test('Saunus radiation keeps C, B and temperature difference explicit', () => {
	close(core.calculateSaunusRadiationWm2(1, 5.56, 1, 8.2), 45.592, 0.0001);
	assert.ok(core.calculateSaunusRadiationWm2(1, 5.56, 1, -3) < 0);
});

test('Saunus linear radiation is limited to its reference calculation, not selectable in general conditions', () => {
	const input = { ...base, radiationModel: 'saunus' };
	assert.throws(() => core.surfaceComponents(input), /only the Stefan/);
	const example = core.calculateSaunusReferenceExample();
	close(example[0].radiationWm2, 45.592, 0.0001);
});

test('expanded radiation uses absolute temperatures and preserves gain/loss sign', () => {
	const loss = core.calculateStefanBoltzmannWm2(28, -10, 0.96);
	const gain = core.calculateStefanBoltzmannWm2(28, 30, 0.96);
	assert.ok(loss > 0);
	assert.ok(gain < 0);
	assert.ok(Number.isFinite(loss));
});

test('uncovered pool separates evaporation, convection, radiation and gains', () => {
	const result = core.surfaceComponents(base);
	assert.equal(result.valid, true);
	assert.ok(result.componentsKw.evaporation > 0);
	assert.ok(result.componentsKw.convection > 0);
	assert.ok(result.componentsKw.radiation > 0);
	assert.equal(result.componentsKw.solarGain, 0);
	assert.ok(result.lossKw > 0);
});

test('warm room air and solar or occupant gains retain physical signs', () => {
	const result = core.surfaceComponents({ ...base, airTempC: 30, effectiveRadiantTempC: 30, solarGainWm2: 116, occupants: 2, occupantGainW: 100 });
	assert.ok(result.componentsKw.convection < 0);
	assert.ok(result.componentsKw.radiation < 0);
	assert.ok(result.componentsKw.solarGain > 0);
	assert.ok(result.componentsKw.occupantsGain > 0);
});

test('condensation is detected, not counted as unverified heat gain, while sensible gains keep their signs', () => {
	const result = core.surfaceComponents({ ...base, waterTempC: 7, airTempC: 30, relativeHumidityPercent: 60, windMs: 0.2, alphaWm2K: 4.1, effectiveRadiantTempC: 30 });
	assert.equal(result.condensationPossible, true);
	assert.ok(result.dewPointC > 7);
	assert.equal(result.componentsKw.evaporation, 0);
	assert.ok(result.componentsKw.convection < 0);
	assert.ok(result.componentsKw.radiation < 0);
	assert.ok(result.warnings.some((message) => message.includes('не подтверждена для количественного расчёта конденсации')));
});

test('covered area remains unquantified until confirmed cover properties are entered', () => {
	const unknown = core.surfaceComponents({ ...base, coverFraction: 0.8 });
	assert.equal(unknown.valid, false);
	assert.equal(unknown.lossKw, null);
	assert.ok(unknown.warnings.some((message) => message.includes('не заданы')));
});

test('cover model applies entered equivalent U and evaporation fraction to covered area only', () => {
	const open = core.surfaceComponents(base);
	const covered = core.surfaceComponents({ ...base, coverFraction: 0.8, coverEvaporationFraction: 0.1, coverU_Wm2K: 1 });
	assert.equal(covered.valid, true);
	assert.ok(covered.componentsKw.evaporation < open.componentsKw.evaporation);
	assert.equal(covered.componentsKw.coverTransfer, 0.8 * 32 * (28 - 15) / 1000);
	assert.ok(covered.lossKw < open.lossKw);
});

test('12-hour full-cover daily energy and schedule savings balance independently', () => {
	const winter = { ...base, waterTempC: 28, airTempC: -20, relativeHumidityPercent: 80, pressureKpa: 101.325, effectiveRadiantTempC: -20, coverFraction: 1, coverEvaporationFraction: 0.1, coverU_Wm2K: 1, coverHoursPerDay: 12 };
	const result = core.calculateDailyBalance(winter);
	close(result.open.lossKw, 50.07799, 0.02);
	close(result.covered.lossKw, 4.75433, 0.02);
	close(result.dailyHeatingEnergyKWh, 657.99, 0.03);
	close(result.openDailyHeatingEnergyKWh, 1201.87, 0.05);
	close(result.scheduledSavingsKWh, 543.88, 0.05);
	close(result.coveredDailyHeatingEnergyKWh, 114.10, 0.03);
	close(result.fullDaySavingsKWh, 1087.77, 0.08);
	close(result.openDailyHeatingEnergyKWh - result.dailyHeatingEnergyKWh, result.scheduledSavingsKWh, 1e-9);
});

test('water replacement and carried water are converted to daily sensible energy', () => {
	const result = core.surfaceComponents({ ...base, makeupM3Day: 0.1, batherCarryoutM3Day: 0.02, makeupTempC: 10 });
	close(result.componentsKw.makeup, 0.1 * 1.163 * 18 / 24, 1e-12);
	close(result.componentsKw.batherCarryout, 0.02 * 1.163 * 18 / 24, 1e-12);
});

test('simulation reaches target with sufficient power and otherwise reports non-attainment', () => {
	const input = { ...base, initialTempC: 7, targetTempC: 28, coverHoursPerDay: 0 };
	assert.equal(core.simulateHeating(input, 100, 24).reached, true);
	assert.equal(core.simulateHeating(input, 1, 24).reached, false);
	const required = core.requiredHeatingPower(input, 24);
	assert.ok(required.requiredPowerKw > 0);
	assert.equal(required.simulation.reached, true);
});

test('missing cover data is returned as a distinct calculation state without masking invalid power', () => {
	const open = { ...base, initialTempC: 7, targetTempC: 28, coverHoursPerDay: 12 };
	assert.equal(core.calculateDailyBalance(open).unknownCoveredLoss, false);
	assert.ok(core.requiredHeatingPower(open, 24).requiredPowerKw > 0);

	for (const coverInput of [
		{ coverFraction: 1, coverU_Wm2K: null, coverEvaporationFraction: null, coverHoursPerDay: 12 },
		{ coverFraction: 1, coverU_Wm2K: 1, coverEvaporationFraction: null, coverHoursPerDay: 12 },
		{ coverFraction: 1, coverU_Wm2K: null, coverEvaporationFraction: 0.1, coverHoursPerDay: 12 },
		{ coverFraction: 1, coverU_Wm2K: null, coverEvaporationFraction: null, coverHoursPerDay: 24 }
	]) {
		const input = { ...open, ...coverInput };
		assert.equal(core.calculateDailyBalance(input).unknownCoveredLoss, true);
		assert.equal(core.requiredHeatingPower(input, 24).reason, 'cover-data-missing');
		assert.equal(core.simulateHeating(input, 30, 24).reason, 'cover-data-missing');
	}

	const known = { ...open, coverFraction: 1, coverU_Wm2K: 1, coverEvaporationFraction: 0.1, coverHoursPerDay: 12 };
	assert.equal(core.calculateDailyBalance(known).unknownCoveredLoss, false);
	assert.ok(core.requiredHeatingPower(known, 24).requiredPowerKw > 0);

	const noCoverHours = { ...open, coverFraction: 1, coverU_Wm2K: null, coverEvaporationFraction: null, coverHoursPerDay: 0 };
	assert.equal(core.calculateDailyBalance(noCoverHours).unknownCoveredLoss, false);
	assert.ok(core.requiredHeatingPower(noCoverHours, 24).requiredPowerKw > 0);
	assert.throws(() => core.simulateHeating(open, 0, 24), RangeError);
	assert.throws(() => core.simulateHeating(open, -1, 24), RangeError);
});

test('power search stays within the strict positive simulation boundary when surroundings nearly supply the full heat', () => {
	const warmRoom = {
		...base, lengthM: 1, widthM: 1, averageDepthM: 1, waterTempC: 8,
		airTempC: 30, relativeHumidityPercent: 60, windMs: 0.2, alphaWm2K: 4.1,
		effectiveRadiantTempC: 20, initialTempC: 7, targetTempC: 8, coverHoursPerDay: 0
	};
	const result = core.requiredHeatingPower(warmRoom, 24);
	assert.equal(result.reason, null);
	assert.equal(result.simulation.reached, true);
	assert.ok(result.requiredPowerKw >= 0.000001);
	assert.ok(Math.abs(result.simulation.energyBalanceResidualKWh) < 0.00001);
});

test('independent one-second energy integration closes the 48 m3 initial-heating balance', () => {
	const input = { ...base, airTempC: 30, relativeHumidityPercent: 60, pressureKpa: 101.325, windMs: 0.2, alphaWm2K: 4.1, effectiveRadiantTempC: 30, initialTempC: 7, targetTempC: 28 };
	const selected = core.requiredHeatingPower(input, 24);
	const area = 32, volume = 48, capacityKWhK = 1.163 * volume, pressureKpa = 101.325, dtSeconds = 1;
	function saturationPressure(t) { return 0.61121 * Math.exp((18.678 - t / 234.5) * (t / (257.14 + t))); }
	function ratio(t, rhFraction) {
		const pv = saturationPressure(t) * rhFraction;
		return 0.621945 * pv / (pressureKpa - pv);
	}
	const airRatio = ratio(30, 0.6);
	const airVaporPressure = saturationPressure(30) * 0.6;
	let loDew = -80, hiDew = 30;
	for (let i = 0; i < 70; i += 1) {
		const mid = (loDew + hiDew) / 2;
		if (saturationPressure(mid) < airVaporPressure) loDew = mid;
		else hiDew = mid;
	}
	const dew = (loDew + hiDew) / 2;
	const sigma = 5.670374419e-8, epsilon = 0.96;
	let temperature = 7, elapsedSeconds = 0, environmentIntoWaterKWh = 0;
	while (temperature < 28 && elapsedSeconds < 30 * 3600) {
		const surfaceRatio = ratio(temperature, 1);
		const latentWhKg = (2501 - 2.361 * temperature) / 3.6;
		const evaporationKw = temperature < dew ? 0 : Math.max(0, (25 + 19 * 0.2) * (surfaceRatio - airRatio) * latentWhKg * area / 1000);
		const convectionKw = 4.1 * area * (temperature - 30) / 1000;
		const radiationKw = epsilon * sigma * area * (Math.pow(temperature + 273.15, 4) - Math.pow(30 + 273.15, 4)) / 1000;
		const environmentIntoWaterKw = -(evaporationKw + convectionKw + radiationKw);
		environmentIntoWaterKWh += environmentIntoWaterKw / 3600;
		temperature += (selected.requiredPowerKw + environmentIntoWaterKw) / (capacityKWhK * 3600);
		elapsedSeconds += dtSeconds;
	}
	const suppliedKWh = selected.requiredPowerKw * elapsedSeconds / 3600;
	const storedKWh = capacityKWhK * (temperature - 7);
	assert.ok(Math.abs(elapsedSeconds / 3600 - 24) <= 0.04);
	assert.ok(environmentIntoWaterKWh > 0);
	assert.ok(Math.abs(suppliedKWh + environmentIntoWaterKWh - storedKWh) <= 0.08, `${suppliedKWh} + ${environmentIntoWaterKWh} != ${storedKWh}`);
	assert.ok(Math.abs(selected.simulation.energyBalanceResidualKWh) < 0.01, `integrated residual ${selected.simulation.energyBalanceResidualKWh} kWh`);
	close(selected.simulation.sourceEnergyKWh - selected.simulation.netLossEnergyKWh, storedKWh, 0.01);
	close(storedKWh, 1172.304, 0.08);
});

test('primary water flow is calculated from useful power and primary temperature drop', () => {
	close(core.exchangerPrimaryWaterFlowM3h(40, 20), 40 / (1.163 * 20), 1e-12);
});

test('counterflow temperature approaches and LMTD reject impossible cases and handle equal ends', () => {
	close(core.logMeanTemperatureDifference(20, 10), 10 / Math.log(2), 1e-12);
	close(core.logMeanTemperatureDifference(10, 10 + 1e-10), 10 + 0.5e-10, 1e-9);
	const valid = core.checkExchangerTemperatures({ primarySupplyC: 60, primaryReturnC: 50, poolInletC: 28, poolOutletC: 30, primaryFlowM3h: 4, poolFlowM3h: 20, requestedPowerKw: 40 });
	assert.equal(valid.valid, true);
	assert.ok(valid.lmtdK > 0);
	assert.equal(valid.energyConsistent, true);
	assert.equal(valid.requestedPowerConsistent, true);
	assert.equal(core.checkExchangerTemperatures({ primarySupplyC: 30, primaryReturnC: 25, poolInletC: 28, poolOutletC: 32 }).valid, false);
	assert.equal(core.checkExchangerTemperatures({ primarySupplyC: 27, primaryReturnC: 25, poolInletC: 28, poolOutletC: 29 }).valid, false);
	const mismatch = core.checkExchangerTemperatures({ primarySupplyC: 60, primaryReturnC: 50, poolInletC: 28, poolOutletC: 30, primaryFlowM3h: 4, poolFlowM3h: 30 });
	assert.equal(mismatch.energyConsistent, false);
});

test('rejects invalid physical inputs instead of returning NaN or infinity', () => {
	assert.throws(() => core.poolGeometry({ ...base, lengthM: 0 }), RangeError);
	assert.throws(() => core.humidityRatio(30, 101, 101.325), RangeError);
	assert.throws(() => core.surfaceComponents({ ...base, windMs: -1 }), RangeError);
	assert.throws(() => core.heatingEnergy(48, 28, 7), RangeError);
});
