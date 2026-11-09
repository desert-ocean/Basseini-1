(function (root, factory) {
	'use strict';

	var calculations = factory();

	if (typeof module === 'object' && module.exports) {
		module.exports = calculations;
	}

	if (root) {
		root.ALPOOLVolumeCalculations = calculations;
	}
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	function positiveFinite(value, label) {
		if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
			throw new RangeError(label + ' must be a positive finite number.');
		}

		return value;
	}

	function finiteVolume(value) {
		if (!Number.isFinite(value) || value <= 0) {
			throw new RangeError('Calculated volume must be positive and finite.');
		}

		return value;
	}

	function calculateRectangularConstantDepthVolume(dimensions) {
		var length = positiveFinite(dimensions.length, 'Length');
		var width = positiveFinite(dimensions.width, 'Width');
		var depth = positiveFinite(dimensions.depth, 'Depth');

		return finiteVolume(length * width * depth);
	}

	function calculateRectangularSlopedDepthVolume(dimensions) {
		var length = positiveFinite(dimensions.length, 'Length');
		var width = positiveFinite(dimensions.width, 'Width');
		var shallowDepth = positiveFinite(dimensions.shallowDepth, 'Shallow depth');
		var deepDepth = positiveFinite(dimensions.deepDepth, 'Deep depth');

		return finiteVolume(length * width * (shallowDepth + deepDepth) / 2);
	}

	function calculateCircularConstantDepthVolume(dimensions) {
		var diameter = positiveFinite(dimensions.diameter, 'Diameter');
		var depth = positiveFinite(dimensions.depth, 'Depth');

		return finiteVolume(Math.PI * diameter * diameter * depth / 4);
	}

	function calculateIrregularPoolVolume(dimensions) {
		var waterArea = positiveFinite(dimensions.waterArea, 'Water surface area');
		var averageDepth = positiveFinite(dimensions.averageDepth, 'Average depth');

		return finiteVolume(waterArea * averageDepth);
	}

	function withBalanceTankEstimate(basinVolumeM3, includeBalanceTank) {
		var basin = positiveFinite(basinVolumeM3, 'Basin volume');
		var include = includeBalanceTank === undefined ? false : includeBalanceTank;

		if (typeof include !== 'boolean') {
			throw new TypeError('includeBalanceTank must be a boolean.');
		}

		var balanceTank = include ? finiteVolume(basin * 0.10) : 0;
		var total = finiteVolume(basin + balanceTank);

		return {
			basinM3: basin,
			balanceTankM3: balanceTank,
			totalM3: total,
			basinLiters: basin * 1000,
			balanceTankLiters: balanceTank * 1000,
			totalLiters: total * 1000
		};
	}

	function calculatePoolVolume(shape, dimensions, includeBalanceTank) {
		var volumeByShape = {
			rectangular: calculateRectangularConstantDepthVolume,
		'rectangular-slope': calculateRectangularSlopedDepthVolume,
			circular: calculateCircularConstantDepthVolume,
			irregular: calculateIrregularPoolVolume
		};

		if (!Object.prototype.hasOwnProperty.call(volumeByShape, shape)) {
			throw new RangeError('Unsupported pool shape: ' + shape);
		}

		if (!dimensions || typeof dimensions !== 'object') {
			throw new TypeError('Dimensions must be provided as an object.');
		}

		return withBalanceTankEstimate(volumeByShape[shape](dimensions), includeBalanceTank);
	}

	return Object.freeze({
		calculateRectangularConstantDepthVolume: calculateRectangularConstantDepthVolume,
		calculateRectangularSlopedDepthVolume: calculateRectangularSlopedDepthVolume,
		calculateCircularConstantDepthVolume: calculateCircularConstantDepthVolume,
		calculateIrregularPoolVolume: calculateIrregularPoolVolume,
		withBalanceTankEstimate: withBalanceTankEstimate,
		calculatePoolVolume: calculatePoolVolume
	});
}));
