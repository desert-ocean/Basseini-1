'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const heating = require('../assets/js/calculations/pool-heating-engineering-core.js');
globalThis.ALPOOLPoolHeatingEngineering = heating;
const ventilation = require('../assets/js/calculations/pool-ventilation-core.js');

test('calculates air changes, dew point and condensation margin', () => {
	const result = ventilation.calculate({ volumeM3: 300, airflowM3h: 900, airTempC: 30, relativeHumidityPercent: 60, surfaceTempC: 19 });
	assert.equal(result.airChangesPerHour, 3);
	assert.ok(Math.abs(result.dewPointC - 21.4) < 0.1);
	assert.ok(Math.abs(result.surfaceMarginC - (19 - result.dewPointC)) < 1e-12);
	assert.equal(result.condensationRisk, true);
});

test('does not call an air change rate adequate ventilation', () => {
	const result = ventilation.calculate({ volumeM3: 300, airflowM3h: 900, airTempC: 30, relativeHumidityPercent: 60, surfaceTempC: 23 });
	assert.equal(result.airChangesPerHour, 3);
	assert.equal(result.condensationRisk, false);
});

test('rejects invalid physical inputs', () => {
	assert.throws(() => ventilation.calculate({ volumeM3: 0, airflowM3h: 900, airTempC: 30, relativeHumidityPercent: 60, surfaceTempC: 19 }), RangeError);
	assert.throws(() => ventilation.calculate({ volumeM3: 300, airflowM3h: 900, airTempC: 30, relativeHumidityPercent: 0, surfaceTempC: 19 }), RangeError);
	assert.throws(() => ventilation.calculate({ volumeM3: 300, airflowM3h: 900, airTempC: -40.01, relativeHumidityPercent: 60, surfaceTempC: 19 }), RangeError);
	assert.throws(() => ventilation.calculate({ volumeM3: 300, airflowM3h: 900, airTempC: 51, relativeHumidityPercent: 60, surfaceTempC: 19 }), RangeError);
});

test('accepts calculator temperature, humidity, volume, flow and surface limits', () => {
	const cold = ventilation.calculate({ volumeM3: 0.1, airflowM3h: 0, airTempC: -40, relativeHumidityPercent: 1, surfaceTempC: -60 });
	assert.equal(cold.airChangesPerHour, 0);
	assert.ok(Number.isFinite(cold.dewPointC));
	const warm = ventilation.calculate({ volumeM3: 1000000, airflowM3h: 10000000, airTempC: 50, relativeHumidityPercent: 100, surfaceTempC: 80 });
	assert.equal(warm.airChangesPerHour, 10);
	assert.equal(warm.dewPointC, 50);
});
