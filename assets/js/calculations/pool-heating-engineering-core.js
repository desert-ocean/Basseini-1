(function (root, factory) {
	'use strict';
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	if (root) root.ALPOOLPoolHeatingEngineering = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	var WATER_KWH_PER_M3_K = 1.163;
	var WATER_CP_KJ_KG_K = 4.186;
	var WATER_DENSITY_KG_M3 = 997;
	var STEFAN_BOLTZMANN = 5.670374419e-8;
	var WATER_EMISSIVITY = 0.96;
	var MAX_SURFACE_M2 = 100000;
	var MAX_VOLUME_M3 = 1000000;
	var MAX_POWER_KW = 100000;
	var MAX_HOURS = 10000;
	var SAUNUS_ALPHA = Object.freeze({ sheltered: 4.07, partlySheltered: 6.98, exposed: 12.79 });
	var SAUNUS_WIND = Object.freeze({ sheltered: 1, partlySheltered: 2, exposed: 4 });
	var CONDENSATION_WARNING = 'Температура поверхности воды ниже точки росы окружающего воздуха. Возможна конденсация влаги с выделением тепла. В расчёте требуемой мощности это теплопоступление не учитывается, поскольку используемая эмпирическая зависимость испарения не подтверждена для количественного расчёта конденсации.';

	function finite(value, name, min, max) {
		if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
			throw new RangeError(name + ' must be finite and between ' + min + ' and ' + max + '.');
		}
		return value;
	}
	function positive(value, name, max) { return finite(value, name, 0.000001, max); }
	function nonNegative(value, name, max) { return finite(value, name, 0, max); }
	function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
	function kelvin(tempC) { return tempC + 273.15; }

	function poolGeometry(input) {
		var area;
		if (input.shape === 'rectangle') {
			area = positive(input.lengthM, 'lengthM', 10000) * positive(input.widthM, 'widthM', 10000);
		} else if (input.shape === 'freeform') {
			area = positive(input.areaM2, 'areaM2', MAX_SURFACE_M2);
		} else {
			throw new RangeError('shape must be rectangle or freeform.');
		}
		if (area > MAX_SURFACE_M2) throw new RangeError('Calculated surface area exceeds the supported range.');
		var geometricVolume = area * positive(input.averageDepthM, 'averageDepthM', 100);
		var volume = input.actualVolumeM3 == null || input.actualVolumeM3 === '' ? geometricVolume : positive(input.actualVolumeM3, 'actualVolumeM3', MAX_VOLUME_M3);
		if (input.extraWaterVolumeM3 != null && input.extraWaterVolumeM3 !== '') volume += nonNegative(input.extraWaterVolumeM3, 'extraWaterVolumeM3', MAX_VOLUME_M3);
		if (volume > MAX_VOLUME_M3) throw new RangeError('Calculated water volume exceeds the supported range.');
		return { areaM2: area, geometricVolumeM3: geometricVolume, volumeM3: volume, usesActualVolume: input.actualVolumeM3 != null && input.actualVolumeM3 !== '' };
	}

	function saturationPressureKpa(tempC, phase) {
		finite(tempC, 'temperatureC', -80, 100);
		var p;
		if (phase === 'ice' || (phase !== 'water' && tempC < 0)) {
			p = 0.61115 * Math.exp((23.036 - tempC / 333.7) * (tempC / (279.82 + tempC)));
		} else {
			p = 0.61121 * Math.exp((18.678 - tempC / 234.5) * (tempC / (257.14 + tempC)));
		}
		return p;
	}

	function humidityRatio(tempC, relativeHumidityPercent, pressureKpa, phase) {
		finite(relativeHumidityPercent, 'relativeHumidityPercent', 0, 100);
		finite(pressureKpa, 'pressureKpa', 50, 120);
		var vaporPressure = saturationPressureKpa(tempC, phase) * relativeHumidityPercent / 100;
		if (vaporPressure >= pressureKpa) throw new RangeError('Vapor pressure must remain below atmospheric pressure.');
		return 0.621945 * vaporPressure / (pressureKpa - vaporPressure);
	}

	function dewPointC(airTempC, relativeHumidityPercent, pressureKpa) {
		finite(airTempC, 'airTempC', -80, 100);
		finite(relativeHumidityPercent, 'relativeHumidityPercent', 0.000001, 100);
		finite(pressureKpa, 'pressureKpa', 50, 120);
		var phase = airTempC < 0 ? 'ice' : 'water';
		var vaporPressure = saturationPressureKpa(airTempC, phase) * relativeHumidityPercent / 100;
		var lo = -80;
		var hi = airTempC;
		for (var i = 0; i < 70; i += 1) {
			var mid = (lo + hi) / 2;
			if (saturationPressureKpa(mid, phase) < vaporPressure) lo = mid;
			else hi = mid;
		}
		return (lo + hi) / 2;
	}

	function humidityState(waterTempC, airTempC, relativeHumidityPercent, pressureKpa) {
		return {
			xSatKgKg: humidityRatio(waterTempC, 100, pressureKpa, 'water'),
			xAirKgKg: humidityRatio(airTempC, relativeHumidityPercent, pressureKpa, airTempC < 0 ? 'ice' : 'water'),
			dewPointC: dewPointC(airTempC, relativeHumidityPercent, pressureKpa)
		};
	}

	function calculateSaunusEvaporationWm2(windMs, xSatKgKg, xAirKgKg, latentWhKg) {
		finite(windMs, 'windMs', 0, 100);
		finite(xSatKgKg, 'xSatKgKg', 0, 0.2);
		finite(xAirKgKg, 'xAirKgKg', 0, 0.2);
		finite(latentWhKg, 'latentWhKg', 100, 3000);
		return (25 + 19 * windMs) * (xSatKgKg - xAirKgKg) * latentWhKg;
	}

	function calculateSaunusConvectionWm2(alphaWm2K, waterTempC, airTempC) {
		finite(alphaWm2K, 'alphaWm2K', 0, 1000);
		finite(waterTempC, 'waterTempC', -10, 60);
		finite(airTempC, 'airTempC', -80, 80);
		return alphaWm2K * (waterTempC - airTempC);
	}

	function calculateSaunusRadiationWm2(areaM2, radiationNumberWm2K4, temperatureFactorK3, deltaTemperatureK) {
		positive(areaM2, 'areaM2', MAX_SURFACE_M2);
		finite(radiationNumberWm2K4, 'radiationNumberWm2K4', 0, 1000);
		finite(temperatureFactorK3, 'temperatureFactorK3', 0, 100);
		finite(deltaTemperatureK, 'deltaTemperatureK', -200, 200);
		return areaM2 * radiationNumberWm2K4 * temperatureFactorK3 * deltaTemperatureK;
	}

	function calculateStefanBoltzmannWm2(waterTempC, effectiveRadiantTempC, emissivity) {
		finite(waterTempC, 'waterTempC', -10, 60);
		finite(effectiveRadiantTempC, 'effectiveRadiantTempC', -100, 100);
		finite(emissivity, 'emissivity', 0, 1);
		return emissivity * STEFAN_BOLTZMANN * (Math.pow(kelvin(waterTempC), 4) - Math.pow(kelvin(effectiveRadiantTempC), 4));
	}

	function calculateSaunusReferenceExample() {
		var area = 1;
		var xSat = 0.0186;
		var xAir = 0.0082;
		var latent = 680;
		var deltaT = 24 - 15.8;
		var solar = 116;
		var occupantsGain = 0;
		var profiles = [
			{ name: 'sheltered', windMs: 1, alphaWm2K: 4.07, saunusRadiationC: 5.56, saunusFactorB: 1 },
			{ name: 'partlySheltered', windMs: 2, alphaWm2K: 6.98, saunusRadiationC: 5.56, saunusFactorB: 1 },
			{ name: 'exposed', windMs: 4, alphaWm2K: 12.79, saunusRadiationC: 5.56, saunusFactorB: 1 }
		];
		return profiles.map(function (profile) {
			var evaporation = calculateSaunusEvaporationWm2(profile.windMs, xSat, xAir, latent);
			var convection = calculateSaunusConvectionWm2(profile.alphaWm2K, 24, 15.8);
			var radiation = calculateSaunusRadiationWm2(area, profile.saunusRadiationC, profile.saunusFactorB, deltaT);
			var losses = evaporation + convection + radiation;
			return {
				profile: profile.name,
				windMs: profile.windMs,
				xSatKgKg: xSat,
				xAirKgKg: xAir,
				evaporationWm2: evaporation,
				convectionWm2: convection,
				radiationWm2: radiation,
				lossesWm2: losses,
				solarGainWm2: solar,
				occupantsGainWm2: occupantsGain,
				requiredHeatingWm2: losses - solar - occupantsGain,
				dailyEnergyKWhFor32m2: Math.max(0, losses - solar - occupantsGain) * 32 * 24 / 1000
			};
		});
	}

	function calculateSaunusIndoorReference() {
		var evaporation = calculateSaunusEvaporationWm2(0.2, 0.0227, 0.016, 677);
		var convection = calculateSaunusConvectionWm2(4.1, 27, 30);
		return { evaporationWm2: evaporation, convectionWm2: convection, netLoadWm2: evaporation + convection, dailyEnergyKWhFor32m2: (evaporation + convection) * 32 * 24 / 1000 };
	}

	function validateInput(input) {
		var geometry = input.geometry || poolGeometry(input);
		var tw = finite(input.waterTempC, 'waterTempC', 0, 50);
		var ta = finite(input.airTempC, 'airTempC', -80, 60);
		var rh = finite(input.relativeHumidityPercent, 'relativeHumidityPercent', 1, 100);
		var pressure = input.pressureKpa == null ? 101.325 : finite(input.pressureKpa, 'pressureKpa', 50, 120);
		var wind = finite(input.windMs, 'windMs', 0, 50);
		var alpha = finite(input.alphaWm2K, 'alphaWm2K', 0, 100);
		var emissivity = input.emissivity == null ? WATER_EMISSIVITY : finite(input.emissivity, 'emissivity', 0, 1);
		var radiationModel = input.radiationModel == null ? 'stefan' : input.radiationModel;
		if (radiationModel !== 'stefan') throw new RangeError('The general calculation supports only the Stefan–Boltzmann radiation model.');
		var radiantTemp = input.effectiveRadiantTempC == null || input.effectiveRadiantTempC === '' ? ta : finite(input.effectiveRadiantTempC, 'effectiveRadiantTempC', -100, 100);
		var solar = input.solarGainWm2 == null ? 0 : finite(input.solarGainWm2, 'solarGainWm2', 0, 2000);
		var coverFraction = input.coverFraction == null ? 0 : finite(input.coverFraction, 'coverFraction', 0, 1);
		var coverEvaporationFraction = input.coverEvaporationFraction == null || input.coverEvaporationFraction === '' ? null : finite(input.coverEvaporationFraction, 'coverEvaporationFraction', 0, 1);
		var coverU = input.coverU_Wm2K == null || input.coverU_Wm2K === '' ? null : finite(input.coverU_Wm2K, 'coverU_Wm2K', 0, 100);
		var structureLoss = input.structureLossKw == null ? 0 : finite(input.structureLossKw, 'structureLossKw', 0, MAX_POWER_KW);
		var occupants = input.occupants == null ? 0 : finite(input.occupants, 'occupants', 0, 10000);
		var occupantGainW = input.occupantGainW == null ? 0 : finite(input.occupantGainW, 'occupantGainW', 0, 1000);
		var makeupM3Day = input.makeupM3Day == null ? 0 : finite(input.makeupM3Day, 'makeupM3Day', 0, MAX_VOLUME_M3);
		var makeupTemp = input.makeupTempC == null ? ta : finite(input.makeupTempC, 'makeupTempC', -20, 60);
		var carryoutM3Day = input.batherCarryoutM3Day == null ? 0 : finite(input.batherCarryoutM3Day, 'batherCarryoutM3Day', 0, MAX_VOLUME_M3);
		if (input.coverFraction != null && coverFraction > 0 && (coverEvaporationFraction == null || coverU == null)) {
			// Unknown cover characteristics stay unknown; caller can still use the uncovered-area result.
		}
		return {
			geometry: geometry, waterTempC: tw, airTempC: ta, relativeHumidityPercent: rh, pressureKpa: pressure,
			windMs: wind, alphaWm2K: alpha, emissivity: emissivity, effectiveRadiantTempC: radiantTemp,
			solarGainWm2: solar, radiationModel: radiationModel, coverFraction: coverFraction, coverEvaporationFraction: coverEvaporationFraction,
			coverU_Wm2K: coverU, structureLossKw: structureLoss, occupants: occupants, occupantGainW: occupantGainW,
			makeupM3Day: makeupM3Day, makeupTempC: makeupTemp, batherCarryoutM3Day: carryoutM3Day
		};
	}

	function surfaceComponents(input) {
		var p = validateInput(input);
		var area = p.geometry.areaM2;
		var humidity = humidityState(p.waterTempC, p.airTempC, p.relativeHumidityPercent, p.pressureKpa);
		var xDelta = humidity.xSatKgKg - humidity.xAirKgKg;
		var latentWhKg = clamp((2501 - 2.361 * p.waterTempC) / 3.6, 630, 695);
		var condensationPossible = p.waterTempC < humidity.dewPointC;
		var evaporationWm2 = condensationPossible ? 0 : Math.max(0, calculateSaunusEvaporationWm2(p.windMs, humidity.xSatKgKg, humidity.xAirKgKg, latentWhKg));
		var convectionWm2 = calculateSaunusConvectionWm2(p.alphaWm2K, p.waterTempC, p.airTempC);
		var radiationWm2 = calculateStefanBoltzmannWm2(p.waterTempC, p.effectiveRadiantTempC, p.emissivity);
		var openFraction = 1 - p.coverFraction;
		var coveredKnown = p.coverFraction === 0 || (p.coverU_Wm2K != null && p.coverEvaporationFraction != null);
		var openEvapWm2 = evaporationWm2;
		var openConvectionWm2 = convectionWm2;
		var openRadiationWm2 = radiationWm2;
		var coverEvapWm2 = coveredKnown && p.coverFraction > 0 ? evaporationWm2 * p.coverEvaporationFraction : null;
		var coverTransferWm2 = coveredKnown && p.coverFraction > 0 ? p.coverU_Wm2K * (p.waterTempC - p.airTempC) : null;
		var evaporationKw = (openEvapWm2 * openFraction + (coverEvapWm2 == null ? 0 : coverEvapWm2 * p.coverFraction)) * area / 1000;
		var convectionKw = openConvectionWm2 * openFraction * area / 1000;
		var radiationKw = openRadiationWm2 * openFraction * area / 1000;
		var coverTransferKw = coverTransferWm2 == null ? null : coverTransferWm2 * p.coverFraction * area / 1000;
		var solarGainKw = p.solarGainWm2 * openFraction * area / 1000;
		var occupantGainKw = p.occupants * p.occupantGainW / 1000;
		var structureKw = p.structureLossKw;
		var makeupKWhDay = p.makeupM3Day * WATER_KWH_PER_M3_K * (p.waterTempC - p.makeupTempC);
		var carryoutKWhDay = p.batherCarryoutM3Day * WATER_KWH_PER_M3_K * (p.waterTempC - p.makeupTempC);
		var dailyWaterReplacementKw = (makeupKWhDay + carryoutKWhDay) / 24;
		var totalsKnown = coveredKnown;
		var surfaceLossKw = evaporationKw + convectionKw + radiationKw + structureKw + dailyWaterReplacementKw - solarGainKw - occupantGainKw;
		if (coverTransferKw != null) surfaceLossKw += coverTransferKw;
		var warnings = [];
		if (condensationPossible) warnings.push(CONDENSATION_WARNING);
		if (p.airTempC < -10) warnings.push('Наружная температура ниже −10 °C: корреляция испарения Saunus экстраполируется; результат требует проверки расчётом для зимнего климата.');
		if (p.windMs > 4) warnings.push('Скорость ветра выше сценариев Saunus 1/2/4 м/с: испарение экстраполируется, а коэффициент конвекции задаётся отдельно.');
		if (p.windMs !== 1 && p.windMs !== 2 && p.windMs !== 4 && input.locationScenario != null && input.locationScenario !== 'manual') warnings.push('Коэффициент конвекции остаётся выбранным для сценария защищённости; вручную изменённый ветер влияет на испарение, но не пересчитывает α.');
		if (p.coverFraction > 0 && !coveredKnown) warnings.push('Для закрытой части зеркала не заданы подтверждённые коэффициент теплопередачи U и остаточная доля испарения. Её потери неизвестны, поэтому итог неполный.');
		if (p.coverFraction > 0 && coveredKnown) warnings.push('Расчёт покрытия использует введённые пользователем эквивалентный U (включая наружную конвекцию и излучение) и долю испарения. Это не паспортная гарантия без подтверждённых характеристик.');
		if (p.effectiveRadiantTempC === p.airTempC) warnings.push('Эффективная радиационная температура приравнена температуре воздуха как упрощение; для открытого неба, облачности и окружающих поверхностей задайте отдельное значение.');
		if (Math.abs(xDelta) < 1e-12) warnings.push('Влагосодержание уравновешено: испарительный поток по этой модели близок к нулю.');
		if (p.airTempC > p.waterTempC) warnings.push('Воздух теплее воды: конвекция может стать теплопоступлением. Знак компонентов сохранён.');
		return {
			valid: totalsKnown, areaM2: area, volumeM3: p.geometry.volumeM3, humidity: humidity,
			latentHeatWhKg: latentWhKg, dewPointC: humidity.dewPointC, condensationPossible: condensationPossible,
			componentsKw: { evaporation: evaporationKw, convection: convectionKw, radiation: radiationKw, coverTransfer: coverTransferKw, structure: structureKw, makeup: makeupKWhDay / 24, batherCarryout: carryoutKWhDay / 24, solarGain: solarGainKw, occupantsGain: occupantGainKw },
			openComponentsWm2: { evaporation: evaporationWm2, convection: convectionWm2, radiation: radiationWm2 },
			coveredComponentsWm2: { evaporation: coverEvapWm2, equivalentTransfer: coverTransferWm2 },
			lossKw: totalsKnown ? surfaceLossKw : null,
			maintenancePowerKw: totalsKnown ? Math.max(0, surfaceLossKw) : null,
			netHeatGainKw: totalsKnown ? Math.max(0, -surfaceLossKw) : null,
			peakOpenPowerKw: Math.max(0, evaporationKw + convectionKw + radiationKw + structureKw + dailyWaterReplacementKw - solarGainKw - occupantGainKw),
			warnings: warnings,
			applicability: { saunusEvaporation: p.windMs >= 0 && p.windMs <= 4 && p.airTempC >= -10, convection: 'Saunus α is a shelter scenario; manually changed wind does not recalculate α.', radiation: 'Stefan–Boltzmann with explicit effective radiant temperature; sky/obstructions are not modeled automatically.' }
		};
	}

	function scheduledSurfaceLossKw(input, waterTempC, covered) {
		var copy = Object.assign({}, input, { waterTempC: waterTempC, coverFraction: covered ? input.coverFraction : 0 });
		var result = surfaceComponents(copy);
		return result.lossKw;
	}

	function heatingEnergy(volumeM3, initialTempC, targetTempC) {
		positive(volumeM3, 'volumeM3', MAX_VOLUME_M3);
		finite(initialTempC, 'initialTempC', 0, 50);
		finite(targetTempC, 'targetTempC', 0, 50);
		if (targetTempC < initialTempC) throw new RangeError('targetTempC must be greater than or equal to initialTempC.');
		return WATER_KWH_PER_M3_K * volumeM3 * (targetTempC - initialTempC);
	}

	function makeupEnergyKWh(volumeM3, waterTempC, makeupTempC) {
		nonNegative(volumeM3, 'volumeM3', MAX_VOLUME_M3);
		finite(waterTempC, 'waterTempC', 0, 50);
		finite(makeupTempC, 'makeupTempC', -20, 60);
		return volumeM3 * WATER_KWH_PER_M3_K * (waterTempC - makeupTempC);
	}

	function calculateDailyBalance(input) {
		var coverHours = input.coverHoursPerDay == null ? 0 : finite(input.coverHoursPerDay, 'coverHoursPerDay', 0, 24);
		var open = surfaceComponents(Object.assign({}, input, { coverFraction: 0 }));
		var closed = input.coverFraction > 0 ? surfaceComponents(input) : open;
		var unknown = coverHours > 0 && !closed.valid;
		var energy = unknown ? null : open.lossKw * (24 - coverHours) + closed.lossKw * coverHours;
		var openDaily = open.lossKw * 24;
		var closedDaily = closed.valid ? closed.lossKw * 24 : null;
		var scheduledSavings = energy == null ? null : Math.max(0, Math.max(0, openDaily) - Math.max(0, energy));
		return {
			openPowerKw: open.lossKw,
			coveredPowerKw: closed.valid ? closed.lossKw : null,
			openDailyNetEnergyKWh: openDaily,
			openDailyHeatingEnergyKWh: Math.max(0, openDaily),
			coveredDailyNetEnergyKWh: closedDaily,
			coveredDailyHeatingEnergyKWh: closedDaily == null ? null : Math.max(0, closedDaily),
			fullDaySavingsKWh: closedDaily == null ? null : Math.max(0, openDaily - closedDaily),
			fullDaySavingsPercent: closedDaily == null || openDaily <= 0 ? null : Math.max(0, (openDaily - closedDaily) / openDaily * 100),
			scheduledSavingsKWh: scheduledSavings,
			scheduledSavingsPercent: scheduledSavings == null || openDaily <= 0 ? null : scheduledSavings / Math.max(0, openDaily) * 100,
			openHours: 24 - coverHours,
			coveredHours: coverHours,
			dailyNetEnergyKWh: energy,
			dailyHeatingEnergyKWh: energy == null ? null : Math.max(0, energy),
			averageNetPowerKw: energy == null ? null : energy / 24,
			peakRequiredPowerKw: unknown ? null : Math.max(0, open.lossKw, closed.lossKw),
			heatingBenefitKWh: unknown ? null : Math.max(0, (open.lossKw - closed.lossKw) * coverHours),
			unknownCoveredLoss: unknown,
			open: open,
			covered: closed
		};
	}

	function simulateHeating(input, availablePowerKw, durationLimitHours) {
		var geom = input.geometry || poolGeometry(input);
		var power = positive(availablePowerKw, 'availablePowerKw', MAX_POWER_KW);
		var target = finite(input.targetTempC, 'targetTempC', 0, 50);
		var start = finite(input.initialTempC, 'initialTempC', 0, 50);
		if (target < start) throw new RangeError('targetTempC must be greater than or equal to initialTempC.');
		var maxHours = durationLimitHours == null ? 24 * 30 : positive(durationLimitHours, 'durationLimitHours', MAX_HOURS);
		var stepHours = 1 / 12;
		var temperature = start;
		var elapsed = 0;
		var points = [{ hours: 0, temperatureC: temperature }];
		var reached = temperature >= target;
		var condensationPossible = false;
		while (elapsed < maxHours && !reached) {
			var dt = Math.min(stepHours, maxHours - elapsed);
			var hourOfDay = ((elapsed + dt / 2) % 24 + 24) % 24;
			var coverStart = input.coverStartHour == null ? 20 : finite(input.coverStartHour, 'coverStartHour', 0, 23.999);
			var coverHours = input.coverHoursPerDay == null ? 0 : finite(input.coverHoursPerDay, 'coverHoursPerDay', 0, 24);
			var offset = (hourOfDay - coverStart + 24) % 24;
			var covered = coverHours > 0 && offset < coverHours;
			var instantaneous = Object.assign({}, input, { geometry: geom, waterTempC: temperature, coverFraction: covered ? (input.coverFraction || 0) : 0, structureLossKw: 0, makeupM3Day: 0, batherCarryoutM3Day: 0, occupants: 0, occupantGainW: 0 });
			var losses = surfaceComponents(instantaneous);
			if (!losses.valid) return { reached: false, achievable: null, hours: null, finalTempC: temperature, series: points, reason: 'cover-data-missing' };
			if (losses.condensationPossible) condensationPossible = true;
			var continuousOtherKw = (input.structureLossKw || 0) + ((input.makeupM3Day || 0) + (input.batherCarryoutM3Day || 0)) * WATER_KWH_PER_M3_K * (temperature - (input.makeupTempC == null ? input.airTempC : input.makeupTempC)) / 24 - (input.occupants || 0) * (input.occupantGainW || 0) / 1000;
			var netKw = power - losses.lossKw - continuousOtherKw;
			temperature += netKw * dt / (WATER_KWH_PER_M3_K * geom.volumeM3);
			elapsed += dt;
			if (temperature >= target) { temperature = target; reached = true; }
			if (points.length < 400 && (Math.round(elapsed * 12) % 6 === 0 || reached)) points.push({ hours: elapsed, temperatureC: temperature });
			if (temperature < 0 || temperature > 60) break;
		}
		return { reached: reached, achievable: reached, hours: reached ? elapsed : null, finalTempC: temperature, series: points, reason: reached ? null : 'target-not-reached-within-limit', condensationPossible: condensationPossible };
	}

	function requiredHeatingPower(input, desiredHours) {
		var time = positive(desiredHours, 'desiredHours', MAX_HOURS);
		var energy = heatingEnergy((input.geometry || poolGeometry(input)).volumeM3, input.initialTempC, input.targetTempC);
		if (energy === 0) return { idealPowerKw: 0, requiredPowerKw: 0, simulation: simulateHeating(input, 0.000001, time) };
		var lo = 0;
		var hi = Math.max(1, energy / time);
		var sim = simulateHeating(input, hi, time);
		while (!sim.reached && hi < MAX_POWER_KW) { hi *= 2; sim = simulateHeating(input, hi, time); }
		if (!sim.reached) return { idealPowerKw: energy / time, requiredPowerKw: null, simulation: sim, reason: 'power-limit' };
		for (var i = 0; i < 45; i += 1) {
			var mid = (lo + hi) / 2;
			var candidate = simulateHeating(input, mid, time);
			if (candidate.reached) { hi = mid; sim = candidate; } else lo = mid;
		}
		return { idealPowerKw: energy / time, requiredPowerKw: hi, simulation: sim, reason: null };
	}

	function saunusExampleValidation() {
		var outdoor = calculateSaunusReferenceExample();
		var indoor = calculateSaunusIndoorReference();
		return { outdoor: outdoor, indoor: indoor };
	}

	function exchangerPrimaryWaterFlowM3h(powerKw, deltaTC) {
		positive(powerKw, 'powerKw', MAX_POWER_KW);
		positive(deltaTC, 'deltaTC', 150);
		return powerKw / (WATER_KWH_PER_M3_K * deltaTC);
	}

	function logMeanTemperatureDifference(deltaT1K, deltaT2K) {
		positive(deltaT1K, 'deltaT1K', 1000);
		positive(deltaT2K, 'deltaT2K', 1000);
		var mean = (deltaT1K + deltaT2K) / 2;
		if (Math.abs(deltaT1K - deltaT2K) <= Math.max(deltaT1K, deltaT2K) * 1e-8) return mean;
		return (deltaT1K - deltaT2K) / Math.log(deltaT1K / deltaT2K);
	}

	function checkExchangerTemperatures(input) {
		var primarySupply = finite(input.primarySupplyC, 'primarySupplyC', -80, 200);
		var primaryReturn = finite(input.primaryReturnC, 'primaryReturnC', -80, 200);
		var poolInlet = finite(input.poolInletC, 'poolInletC', -10, 80);
		var poolOutlet = finite(input.poolOutletC, 'poolOutletC', -10, 80);
		var primaryDelta = primarySupply - primaryReturn;
		var poolDelta = poolOutlet - poolInlet;
		if (primaryDelta <= 0) return { valid: false, reason: 'Первичная подача должна быть горячее обратки для режима нагрева.' };
		if (poolDelta <= 0) return { valid: false, reason: 'Выходящая из теплообменника вода бассейна должна быть горячее входящей.' };
		var deltaT1 = primarySupply - poolOutlet;
		var deltaT2 = primaryReturn - poolInlet;
		if (deltaT1 <= 0 || deltaT2 <= 0) return { valid: false, deltaT1K: deltaT1, deltaT2K: deltaT2, reason: 'На одном из концов теплообменника температурный напор равен нулю или отрицателен; заданный режим нагрева физически недопустим.' };
		var lmtd = logMeanTemperatureDifference(deltaT1, deltaT2);
		var primaryFlow = input.primaryFlowM3h == null || input.primaryFlowM3h === '' ? null : positive(input.primaryFlowM3h, 'primaryFlowM3h', 100000);
		var poolFlow = input.poolFlowM3h == null || input.poolFlowM3h === '' ? null : positive(input.poolFlowM3h, 'poolFlowM3h', 100000);
		var primaryPower = primaryFlow == null ? null : WATER_KWH_PER_M3_K * primaryFlow * primaryDelta;
		var poolPower = poolFlow == null ? null : WATER_KWH_PER_M3_K * poolFlow * poolDelta;
		var mismatchPercent = null;
		var energyConsistent = null;
		if (primaryPower != null && poolPower != null) {
			var denominator = Math.max(primaryPower, poolPower, 1e-9);
			mismatchPercent = Math.abs(primaryPower - poolPower) / denominator * 100;
			energyConsistent = mismatchPercent <= 5;
		}
		var requestedPower = input.requestedPowerKw == null || input.requestedPowerKw === '' ? null : positive(input.requestedPowerKw, 'requestedPowerKw', MAX_POWER_KW);
		var requestedPowerConsistent = null;
		if (requestedPower != null && primaryPower != null && poolPower != null) {
			var delivered = Math.min(primaryPower, poolPower);
			requestedPowerConsistent = delivered >= requestedPower * 0.95;
		}
		return { valid: true, deltaT1K: deltaT1, deltaT2K: deltaT2, lmtdK: lmtd, primaryDeltaK: primaryDelta, poolDeltaK: poolDelta, primaryPowerKw: primaryPower, poolPowerKw: poolPower, mismatchPercent: mismatchPercent, energyConsistent: energyConsistent, requestedPowerKw: requestedPower, requestedPowerConsistent: requestedPowerConsistent, warning: 'Положительный температурный напор не подтверждает паспортную мощность: проверьте UA или характеристику изготовителя при фактических расходах.' };
	}

	return Object.freeze({
		WATER_KWH_PER_M3_K: WATER_KWH_PER_M3_K,
		WATER_CP_KJ_KG_K: WATER_CP_KJ_KG_K,
		WATER_DENSITY_KG_M3: WATER_DENSITY_KG_M3,
		STEFAN_BOLTZMANN: STEFAN_BOLTZMANN,
		WATER_EMISSIVITY: WATER_EMISSIVITY,
		SAUNUS_ALPHA: SAUNUS_ALPHA,
		SAUNUS_WIND: SAUNUS_WIND,
		CONDENSATION_WARNING: CONDENSATION_WARNING,
		poolGeometry: poolGeometry,
		saturationPressureKpa: saturationPressureKpa,
		humidityRatio: humidityRatio,
		dewPointC: dewPointC,
		humidityState: humidityState,
		calculateSaunusEvaporationWm2: calculateSaunusEvaporationWm2,
		calculateSaunusConvectionWm2: calculateSaunusConvectionWm2,
		calculateSaunusRadiationWm2: calculateSaunusRadiationWm2,
		calculateStefanBoltzmannWm2: calculateStefanBoltzmannWm2,
		calculateSaunusReferenceExample: calculateSaunusReferenceExample,
		calculateSaunusIndoorReference: calculateSaunusIndoorReference,
		surfaceComponents: surfaceComponents,
		heatingEnergy: heatingEnergy,
		makeupEnergyKWh: makeupEnergyKWh,
		calculateDailyBalance: calculateDailyBalance,
		simulateHeating: simulateHeating,
		requiredHeatingPower: requiredHeatingPower,
		exchangerPrimaryWaterFlowM3h: exchangerPrimaryWaterFlowM3h,
		logMeanTemperatureDifference: logMeanTemperatureDifference,
		checkExchangerTemperatures: checkExchangerTemperatures,
		saunusExampleValidation: saunusExampleValidation
	});
}));
