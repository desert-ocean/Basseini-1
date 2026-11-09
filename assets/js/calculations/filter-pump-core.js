(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	if (root) root.FilterPumpCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';
	var DIAMETERS_MM = [350, 400, 500, 600, 650, 750, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000];
	var BACKWASH_RATE = 50;
	function calculate(input) {
		['volumeM3', 'turnoverHours', 'filtrationRate'].forEach(function (key) {
			if (!Number.isFinite(input[key]) || input[key] <= 0) throw new RangeError(key + ' must be a positive finite number');
		});
		var circulation = input.volumeM3 / input.turnoverHours;
		var variants = DIAMETERS_MM.map(function (diameterMm) {
			var diameterM = diameterMm / 1000;
			var area = Math.PI * diameterM * diameterM / 4;
			var perFilter = area * input.filtrationRate;
			var count = Math.ceil(circulation / perFilter);
			if (!Number.isSafeInteger(count) || count > 1000) return null;
			var totalArea = count * area;
			return { diameterMm: diameterMm, count: count, areaM2: area, totalAreaM2: totalArea,
				circulationM3h: circulation, filtrationRateMph: input.filtrationRate,
				actualRateMph: circulation / totalArea, backwashM3h: area * BACKWASH_RATE };
		}).filter(Boolean);
		if (!variants.length) throw new RangeError('No feasible filter combination');
		var compact = variants.slice().sort(function (a, b) { return a.count - b.count || b.diameterMm - a.diameterMm; })[0];
		var distributed = variants.slice().sort(function (a, b) { return b.count - a.count || a.diameterMm - b.diameterMm; })[0];
		var compromise = variants.slice().sort(function (a, b) {
			return (a.count * 2 + a.backwashM3h / circulation) - (b.count * 2 + b.backwashM3h / circulation);
		})[0];
		var delta = Math.abs(circulation - compact.backwashM3h);
		return { circulationM3h: circulation, backwashRateMph: BACKWASH_RATE,
			backwashComparisonM3h: compact.backwashM3h - circulation,
			variants: variants, options: [compact, distributed, compromise].filter(function (v, i, a) {
				return a.findIndex(function (x) { return x.diameterMm === v.diameterMm; }) === i;
			}), pump: { circulationM3h: circulation, backwashM3h: compact.backwashM3h,
				flowDifferenceM3h: delta, requiresHydraulicReview: true } };
	}
	return { DIAMETERS_MM: DIAMETERS_MM.slice(), BACKWASH_RATE: BACKWASH_RATE, calculate: calculate };
}));
