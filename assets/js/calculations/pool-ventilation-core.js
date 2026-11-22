(function (root, factory) {
	'use strict';
	var engineering = root && root.ALPOOLPoolHeatingEngineering;
	var api = factory(engineering);
	if (typeof module === 'object' && module.exports) module.exports = api;
	if (root) root.ALPOOLPoolVentilation = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (engineering) {
	'use strict';
	function finite(value, name, min, max) {
		if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new RangeError(name + ' must be finite and between ' + min + ' and ' + max + '.');
		return value;
	}
	function calculate(input) {
		if (!engineering || typeof engineering.dewPointC !== 'function') throw new Error('Pool engineering core must be loaded first.');
		var volume = finite(input.volumeM3, 'volumeM3', 0.1, 1000000);
		var flow = finite(input.airflowM3h, 'airflowM3h', 0, 10000000);
		var airTemp = finite(input.airTempC, 'airTempC', -40, 50);
		var humidity = finite(input.relativeHumidityPercent, 'relativeHumidityPercent', 1, 100);
		var surfaceTemp = finite(input.surfaceTempC, 'surfaceTempC', -60, 80);
		var dewPoint = engineering.dewPointC(airTemp, humidity, 101.325);
		var margin = surfaceTemp - dewPoint;
		return {
			airChangesPerHour: flow / volume,
			dewPointC: dewPoint,
			surfaceMarginC: margin,
			condensationRisk: margin <= 0
		};
	}
	return Object.freeze({ calculate: calculate });
}));
