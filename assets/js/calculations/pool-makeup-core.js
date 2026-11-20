(function (root, factory) {
	'use strict';

	var calculations = factory();
	if (typeof module === 'object' && module.exports) module.exports = calculations;
	if (root) root.ALPOOLMakeupCalculations = calculations;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	function fail(code, field) {
		var error = new RangeError(code);
		error.code = code;
		error.field = field;
		throw error;
	}

	function positive(value, code, field) {
		if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
			fail(code, field);
		}
		return value;
	}

	function calculateMakeup(input) {
		if (!input || typeof input !== 'object') fail('missing-input', 'makeup-volume');

		var basinVolumeM3 = positive(input.basinVolumeM3, 'invalid-basin-volume', 'basin-volume');
		var makeupVolumeM3 = input.makeupVolumeM3;
		if (typeof makeupVolumeM3 !== 'number' || !Number.isFinite(makeupVolumeM3) || makeupVolumeM3 < 0) {
			fail('invalid-makeup-volume', 'makeup-volume');
		}
		var flowM3h = positive(input.flowM3h, 'invalid-flow', 'flow');

		var mirrorAreaM2 = input.mirrorAreaM2;
		if (mirrorAreaM2 !== null && mirrorAreaM2 !== undefined && mirrorAreaM2 !== '') {
			mirrorAreaM2 = positive(mirrorAreaM2, 'invalid-mirror-area', 'mirror-area');
		} else {
			mirrorAreaM2 = null;
		}

		var timeHours = makeupVolumeM3 / flowM3h;
		var timeMinutes = timeHours * 60;
		var flowLitersPerMinute = flowM3h * 1000 / 60;
		var sharePercent = makeupVolumeM3 / basinVolumeM3 * 100;
		if (![timeHours, timeMinutes, flowLitersPerMinute, sharePercent].every(Number.isFinite)) {
			fail('result-out-of-range', 'makeup-volume');
		}

		return Object.freeze({
			basinVolumeM3: basinVolumeM3,
			mirrorAreaM2: mirrorAreaM2,
			makeupVolumeM3: makeupVolumeM3,
			flowM3h: flowM3h,
			timeHours: timeHours,
			timeMinutes: timeMinutes,
			flowLitersPerMinute: flowLitersPerMinute,
			sharePercent: sharePercent
		});
	}

	return Object.freeze({ calculateMakeup: calculateMakeup });
}));
