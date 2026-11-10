(function (root, factory) {
	'use strict';

	var calculations = factory();
	if (typeof module === 'object' && module.exports) module.exports = calculations;
	if (root) root.ALPOOLPoolHeating = calculations;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	var WATER_KWH_PER_M3_C = 1.163;
	var SURFACE_LOSS_W_M2 = Object.freeze({
		indoor: 180,
		outdoorCovered: 520,
		outdoorPartial: 620,
		outdoorOpen: 1000
	});
	var LOCATION_KEYS = Object.keys(SURFACE_LOSS_W_M2);
	var HEATING_MODES = ['operation', 'idle', 'covered'];
	var MAX_VOLUME_M3 = 1000000;
	var MAX_SURFACE_M2 = 1000000;
	var MAX_POWER_KW = 1000000;
	var MAX_HOURS = 10000;
	var MIN_POSITIVE_VALUE = 0.000001;

	function positive(value, name, max) {
		if (typeof value !== 'number' || !Number.isFinite(value) || value < MIN_POSITIVE_VALUE || (max && value > max)) {
			throw new RangeError(name + ' must be positive, finite and within the supported range.');
		}
		return value;
	}

	function nonNegative(value, name, max) {
		if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (max && value > max)) {
			throw new RangeError(name + ' must be non-negative, finite and within the supported range.');
		}
		return value;
	}

	function location(value) {
		if (LOCATION_KEYS.indexOf(value) < 0) throw new RangeError('Choose a supported pool location.');
		return value;
	}

	function temperatures(initialTempC, targetTempC) {
		if (!Number.isFinite(initialTempC) || initialTempC < 0 || initialTempC > 50) throw new RangeError('Initial water temperature must be from 0 to 50 °C.');
		if (!Number.isFinite(targetTempC) || targetTempC < 0 || targetTempC > 50) throw new RangeError('Target water temperature must be from 0 to 50 °C.');
		if (targetTempC < initialTempC) throw new RangeError('This calculator estimates heating; target temperature must not be below initial temperature.');
		return targetTempC - initialTempC;
	}

	function heatingEnergy(volumeM3, initialTempC, targetTempC) {
		var rise = temperatures(initialTempC, targetTempC);
		positive(volumeM3, 'volumeM3', MAX_VOLUME_M3);
		return WATER_KWH_PER_M3_C * volumeM3 * rise;
	}

	function surfaceLossKw(surfaceM2, poolLocation, additionalWm2) {
		positive(surfaceM2, 'surfaceM2', MAX_SURFACE_M2);
		location(poolLocation);
		var additional = additionalWm2 == null ? 0 : nonNegative(additionalWm2, 'additionalLossWm2', 100000);
		var result = surfaceM2 * (SURFACE_LOSS_W_M2[poolLocation] + additional) / 1000;
		if (!Number.isFinite(result)) throw new RangeError('Calculated surface loss exceeds the supported range.');
		return result;
	}

	function coveredSurfaceLossKw(surfaceM2, poolLocation, reductionPercent) {
		positive(surfaceM2, 'surfaceM2', MAX_SURFACE_M2);
		location(poolLocation);
		if (reductionPercent == null) return null;
		nonNegative(reductionPercent, 'coverReductionPercent', 100);
		return surfaceM2 * SURFACE_LOSS_W_M2[poolLocation] / 1000 * (1 - reductionPercent / 100);
	}

	function heatingLossKw(input) {
		positive(input.surfaceM2, 'surfaceM2', MAX_SURFACE_M2);
		location(input.poolLocation);
		if (HEATING_MODES.indexOf(input.mode) < 0) throw new RangeError('Choose the heat-up operating condition.');
		if (input.mode === 'covered') {
			return coveredSurfaceLossKw(input.surfaceM2, input.poolLocation, input.coverReductionPercent);
		}
		return surfaceLossKw(input.surfaceM2, input.poolLocation, input.mode === 'operation' ? (input.additionalLossWm2 == null ? 0 : input.additionalLossWm2) : 0);
	}

	function powerForHeating(input) {
		var energy = heatingEnergy(input.volumeM3, input.initialTempC, input.targetTempC);
		var time = positive(input.heatingTimeHours, 'heatingTimeHours', MAX_HOURS);
		var loss = heatingLossKw(input);
		var ideal = energy / time;
		return {
			energyKWh: energy,
			idealPowerKw: ideal,
			surfaceLossKw: loss,
			powerWithLossKw: loss == null ? null : ideal + loss,
			coverEfficiencyRequired: input.mode === 'covered' && loss == null
		};
	}

	function timeForHeating(input) {
		var energy = heatingEnergy(input.volumeM3, input.initialTempC, input.targetTempC);
		var available = positive(input.availablePowerKw, 'availablePowerKw', MAX_POWER_KW);
		var loss = heatingLossKw(input);
		if (energy === 0) {
			return { energyKWh: energy, idealTimeHours: 0, surfaceLossKw: loss, timeWithLossHours: 0, insufficientPower: false, coverEfficiencyRequired: input.mode === 'covered' && loss == null };
		}
		var net = loss == null ? null : available - loss;
		return {
			energyKWh: energy,
			idealTimeHours: energy / available,
			surfaceLossKw: loss,
			timeWithLossHours: net != null && net > 0 ? energy / net : null,
			insufficientPower: net != null && net <= 0,
			coverEfficiencyRequired: input.mode === 'covered' && loss == null
		};
	}

	function validateHours(value, name) {
		return nonNegative(value, name, 24);
	}

	function dailyBalance(input) {
		positive(input.surfaceM2, 'surfaceM2', MAX_SURFACE_M2);
		location(input.poolLocation);
		var operationHours = validateHours(input.operationHours, 'operationHours');
		var coverHours = validateHours(input.coverHours, 'coverHours');
		var coverUsed = input.coverUsed === true;
		if (!coverUsed && coverHours > 0) throw new RangeError('Covered hours require an available cover.');
		if (operationHours + coverHours > 24) throw new RangeError('Operating hours and covered idle hours must total no more than 24 hours.');
		var additional = input.additionalLossWm2 == null ? 0 : nonNegative(input.additionalLossWm2, 'additionalLossWm2', 100000);
		var reduction = input.coverReductionPercent == null ? null : nonNegative(input.coverReductionPercent, 'coverReductionPercent', 100);
		var pSurface = surfaceLossKw(input.surfaceM2, input.poolLocation, 0);
		var pOperation = surfaceLossKw(input.surfaceM2, input.poolLocation, additional);
		var pAdditionalOperation = input.surfaceM2 * additional / 1000;
		var pCovered = coverUsed ? coveredSurfaceLossKw(input.surfaceM2, input.poolLocation, reduction) : null;
		var idleHours = 24 - operationHours - coverHours;
		var operationEnergy = pOperation * operationHours;
		var idleEnergy = pSurface * idleHours;
		var coveredEnergy = pCovered == null ? null : pCovered * coverHours;
		var hasUnknownCoveredLoss = coverHours > 0 && pCovered == null;
		var dailyEnergy = hasUnknownCoveredLoss ? null : operationEnergy + idleEnergy + (coveredEnergy || 0);
		var periods = [];
		if (operationHours > 0) periods.push(pOperation);
		if (idleHours > 0) periods.push(pSurface);
		if (coverHours > 0) periods.push(pCovered);
		var maxLoss = hasUnknownCoveredLoss ? null : Math.max.apply(null, periods.length ? periods : [pSurface]);
		return {
			baseSurfaceLossKw: pSurface,
			operationLossKw: pOperation,
			additionalOperatingLossKw: pAdditionalOperation,
			coveredLossKw: pCovered,
			operationHours: operationHours,
			uncoveredIdleHours: idleHours,
			coveredHours: coverHours,
			operationEnergyKWh: operationEnergy,
			uncoveredIdleEnergyKWh: idleEnergy,
			coveredEnergyKWh: coveredEnergy,
			dailyEnergyKWh: dailyEnergy,
			averagePowerKw: dailyEnergy == null ? null : dailyEnergy / 24,
			maximumLossKw: maxLoss,
			hasUnknownCoveredLoss: hasUnknownCoveredLoss
		};
	}

	function heatExchangerFlow(powerKw, supplyTempC, returnTempC, fluid) {
		positive(powerKw, 'powerKw', MAX_POWER_KW);
		if (fluid !== 'water' && fluid !== 'glycol') throw new RangeError('Choose a supported primary heat-transfer fluid.');
		if (!Number.isFinite(supplyTempC) || !Number.isFinite(returnTempC) || supplyTempC < 0 || supplyTempC > 150 || returnTempC < 0 || returnTempC > 150 || supplyTempC <= returnTempC) {
			throw new RangeError('Supply temperature must exceed return temperature within the supported range.');
		}
		if (fluid === 'glycol') return { fluid: fluid, flowM3h: null, requiresFluidProperties: true, deltaTemperatureC: supplyTempC - returnTempC };
		var flow = powerKw / (WATER_KWH_PER_M3_C * (supplyTempC - returnTempC));
		if (!Number.isFinite(flow)) throw new RangeError('Calculated primary flow exceeds the supported range.');
		return { fluid: fluid, flowM3h: flow, requiresFluidProperties: false, deltaTemperatureC: supplyTempC - returnTempC };
	}

	function heatPumpElectricPower(thermalPowerKw, cop) {
		positive(thermalPowerKw, 'thermalPowerKw', MAX_POWER_KW);
		if (cop == null) return null;
		positive(cop, 'cop', 100);
		return thermalPowerKw / cop;
	}

	return {
		WATER_KWH_PER_M3_C: WATER_KWH_PER_M3_C,
		SURFACE_LOSS_W_M2: Object.assign({}, SURFACE_LOSS_W_M2),
		heatingEnergy: heatingEnergy,
		surfaceLossKw: surfaceLossKw,
		coveredSurfaceLossKw: coveredSurfaceLossKw,
		heatingLossKw: heatingLossKw,
		powerForHeating: powerForHeating,
		timeForHeating: timeForHeating,
		dailyBalance: dailyBalance,
		heatExchangerFlow: heatExchangerFlow,
		heatPumpElectricPower: heatPumpElectricPower
	};
}));
