(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	if (root) root.FilterPumpCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';
	var DIAMETERS_MM = [350, 400, 500, 600, 650, 750, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000];
	var BACKWASH_RATE = 50;
	var MAX_FILTER_COUNT = 1000;
	var EXTRA_COUNT_CANDIDATES = 4;
	var MIN_CUSTOM_DIAMETER_MM = 50;
	var MAX_CUSTOM_DIAMETER_MM = 10000;

	function validate(input) {
		if (!input || typeof input !== 'object') throw new TypeError('Calculation input is required');
		['volumeM3', 'turnoverHours', 'filtrationRate'].forEach(function (key) {
			if (!Number.isFinite(input[key]) || input[key] <= 0) throw new RangeError(key + ' must be a positive finite number');
		});
		var flow = input.volumeM3 / input.turnoverHours;
		if (!Number.isFinite(flow) || flow <= 0) throw new RangeError('Circulation flow is outside the supported range');
		return flow;
	}

	function makeVariant(diameterMm, count, flow, filtrationRate) {
		var area = Math.PI * Math.pow(diameterMm / 1000, 2) / 4;
		var totalArea = count * area;
		var backwash = area * BACKWASH_RATE;
		var ratio = backwash / flow;
		var delta = backwash - flow;
		var actualRate = flow / totalArea;
		var excess = totalArea / (flow / filtrationRate) - 1;
		if (!Number.isFinite(area) || !Number.isFinite(totalArea) || !Number.isFinite(backwash) || !Number.isFinite(ratio) || !Number.isFinite(actualRate) || !Number.isFinite(excess)) throw new RangeError('Calculation result is outside the supported numeric range');
		return {
			diameterMm: diameterMm,
			count: count,
			areaM2: area,
			totalAreaM2: totalArea,
			circulationM3h: flow,
			filtrationRateMph: filtrationRate,
			actualRateMph: actualRate,
			backwashM3h: backwash,
			flowRatio: ratio,
			flowDifferenceM3h: delta,
			flowDifferencePct: delta / flow * 100,
			areaExcessRatio: excess
		};
	}

	function areaOrder(a, b) {
		return a.areaExcessRatio - b.areaExcessRatio || Math.abs(Math.log(a.flowRatio)) - Math.abs(Math.log(b.flowRatio)) || a.diameterMm - b.diameterMm;
	}
	function flowOrder(a, b) {
		return Math.abs(Math.log(a.flowRatio)) - Math.abs(Math.log(b.flowRatio)) || a.areaExcessRatio - b.areaExcessRatio || a.count - b.count;
	}
	function uniquePush(list, variant, title, reason) {
		if (!variant || list.some(function (item) { return item.diameterMm === variant.diameterMm && item.count === variant.count; })) return;
		list.push(Object.assign({}, variant, { recommendationTitle: title, recommendationReason: reason }));
	}

	function calculate(input) {
		var flow = validate(input);
		var minVariants = DIAMETERS_MM.map(function (diameter) {
			var area = Math.PI * Math.pow(diameter / 1000, 2) / 4;
			var count = Math.ceil(flow / (area * input.filtrationRate));
			if (!Number.isSafeInteger(count) || count > MAX_FILTER_COUNT) return null;
			return makeVariant(diameter, count, flow, input.filtrationRate);
		}).filter(Boolean);
		if (!minVariants.length) throw new RangeError('No feasible filter combination within the supported count');

		// Include a small, explicit set of extra-count alternatives: the minimum required count
		// plus up to four additional identical filters, so pump matching is not limited to ceil().
		var combinations = [];
		minVariants.forEach(function (v) {
			for (var count = v.count; count <= Math.min(MAX_FILTER_COUNT, v.count + EXTRA_COUNT_CANDIDATES); count++) {
				combinations.push(makeVariant(v.diameterMm, count, flow, input.filtrationRate));
			}
		});
		var single = combinations.filter(function (v) { return v.count === 1; }).sort(areaOrder);
		var doubles = combinations.filter(function (v) { return v.count === 2; }).sort(flowOrder);
		var triplesPlus = combinations.filter(function (v) { return v.count >= 3; }).sort(flowOrder);
		var multi = combinations.filter(function (v) { return v.count >= 2; }).sort(flowOrder);
		var poolPurpose = String(input.poolPurpose || '').toLowerCase();
		var isPrivate = poolPurpose.indexOf('част') >= 0 || poolPurpose === 'private';
		var isPublic = poolPurpose.indexOf('обще') >= 0 || poolPurpose.indexOf('спорт') >= 0 || poolPurpose.indexOf('дет') >= 0 || poolPurpose.indexOf('учеб') >= 0 || poolPurpose.indexOf('оздоров') >= 0 || poolPurpose === 'public' || poolPurpose === 'sport' || poolPurpose === 'children' || poolPurpose === 'education' || poolPurpose === 'wellness';
		var options = [];

		if (isPrivate) {
			uniquePush(options, single[0] || multi[0], 'Приоритет для частного бассейна', single[0] ? 'Один фильтр обеспечивает заданную скорость; сравните его расход промывки с циркуляцией.' : 'Одного фильтра недостаточно по заданной скорости; показана лучшая допустимая многофильтровая схема.');
			uniquePush(options, multi[0], 'Близкие расходы циркуляции и промывки', 'Подобрана многофильтровая схема с близким расходом промывки одного фильтра.');
			var primaryCount = options.length ? options[0].count : null;
			uniquePush(options, combinations.filter(function (v) { return v.count !== primaryCount; }).sort(areaOrder)[0], 'Альтернативная компоновка', 'Сравнительный вариант с достаточной суммарной площадью.');
		} else if (isPublic) {
			var publicPreferred = doubles[0] || triplesPlus[0] || combinations.slice().sort(areaOrder)[0];
			uniquePush(options, publicPreferred, 'Приоритет для общественного бассейна', publicPreferred && publicPreferred.count === 2 ? 'Два фильтра дают эксплуатационную гибкость; фильтры промываются по одному. Это алгоритмическое предпочтение, не норматив.' : 'Расход требует большего числа фильтров по заданной скорости; это алгоритмическое предпочтение, не норматив.');
			uniquePush(options, single[0], 'Один фильтр для сравнения', 'Расчётная альтернатива; эксплуатационную схему и резервирование проверяют проектом.');
			uniquePush(options, triplesPlus.filter(function (v) { return !options[0] || v.diameterMm !== options[0].diameterMm; })[0], 'Альтернативная компоновка', 'Вариант с тремя или более фильтрами, ранжированный по близости расходов.');
		} else {
			uniquePush(options, combinations.slice().sort(areaOrder)[0], 'Рациональная площадь фильтрации', 'Суммарная площадь близка к расчётной потребности без избыточного увеличения.');
			uniquePush(options, multi[0], 'Близкие расходы циркуляции и промывки', 'Сравните расход промывки одного фильтра с циркуляционным расходом.');
			uniquePush(options, single[0], 'Однофильтровая альтернатива', 'Минимальное количество фильтров при соблюдении заданной скорости.');
		}
		return { circulationM3h: flow, backwashRateMph: BACKWASH_RATE, variants: minVariants,
			combinations: combinations, options: options, pump: { circulationM3h: flow, requiresHydraulicReview: true } };
	}

	function calculateForDiameter(input, diameterMm) {
		var flow = validate(input);
		if (!Number.isFinite(diameterMm) || diameterMm < MIN_CUSTOM_DIAMETER_MM || diameterMm > MAX_CUSTOM_DIAMETER_MM) {
			throw new RangeError('Diameter must be between ' + MIN_CUSTOM_DIAMETER_MM + ' and ' + MAX_CUSTOM_DIAMETER_MM + ' mm');
		}
		var area = Math.PI * Math.pow(diameterMm / 1000, 2) / 4;
		var perFilter = area * input.filtrationRate;
		var count = Math.ceil(flow / perFilter);
		if (!Number.isSafeInteger(count) || count < 1 || count > MAX_FILTER_COUNT) throw new RangeError('Required filter count is outside the supported range');
		return makeVariant(diameterMm, count, flow, input.filtrationRate);
	}

	return { DIAMETERS_MM: DIAMETERS_MM.slice(), BACKWASH_RATE: BACKWASH_RATE,
		MAX_FILTER_COUNT: MAX_FILTER_COUNT, calculate: calculate, calculateForDiameter: calculateForDiameter };
}));