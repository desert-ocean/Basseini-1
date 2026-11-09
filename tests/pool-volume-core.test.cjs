'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const volume = require('../assets/js/calculations/pool-volume-core.js');

test('rectangular pool with constant depth: V = L × W × H', () => {
	assert.equal(volume.calculateRectangularConstantDepthVolume({
		length: 8,
		width: 4,
		depth: 1.5
	}), 48);
});

test('rectangular pool with uniform bottom slope uses the mean end depth', () => {
	assert.equal(volume.calculateRectangularSlopedDepthVolume({
		length: 10,
		width: 4,
		shallowDepth: 1,
		deepDepth: 2
	}), 60);
});

test('circular pool with constant depth: V = π × D² × H / 4', () => {
	assert.equal(volume.calculateCircularConstantDepthVolume({
		diameter: 4,
		depth: 2
	}), Math.PI * 8);
});

test('irregular pool uses water surface area and average depth without length or width', () => {
	assert.equal(volume.calculateIrregularPoolVolume({
		waterArea: 25,
		averageDepth: 2
	}), 50);
	assert.equal(volume.calculatePoolVolume('irregular', {
		waterArea: 25,
		averageDepth: 2
	}).basinM3, 50);
});

test('balance tank estimate leaves a 50 m³ basin unchanged and adds exactly 5 m³', () => {
	assert.deepEqual(volume.withBalanceTankEstimate(50, true), {
		basinM3: 50,
		balanceTankM3: 5,
		totalM3: 55,
		basinLiters: 50000,
		balanceTankLiters: 5000,
		totalLiters: 55000
	});
});

test('balance tank estimate defaults to off and does not change the basin volume', () => {
	assert.deepEqual(volume.withBalanceTankEstimate(50), {
		basinM3: 50,
		balanceTankM3: 0,
		totalM3: 50,
		basinLiters: 50000,
		balanceTankLiters: 0,
		totalLiters: 50000
	});
});

test('zero, negative, missing, non-finite dimensions and overflow are rejected', () => {
	[
		{ length: 0, width: 4, depth: 1 },
		{ length: -1, width: 4, depth: 1 },
		{ length: 1, width: NaN, depth: 1 },
		{ length: 1, width: 4, depth: Infinity },
		{ length: 1, width: 4 }
	].forEach((dimensions) => {
		assert.throws(() => volume.calculateRectangularConstantDepthVolume(dimensions), RangeError);
	});

	assert.throws(() => volume.calculateRectangularConstantDepthVolume({
		length: Number.MAX_VALUE,
		width: Number.MAX_VALUE,
		depth: 1
	}), RangeError);
	assert.throws(() => volume.calculateCircularConstantDepthVolume({ diameter: 2, depth: 0 }), RangeError);
	assert.throws(() => volume.calculateIrregularPoolVolume({ waterArea: 10, averageDepth: -1 }), RangeError);
});

test('unknown geometry and a non-boolean balance option are rejected', () => {
	assert.throws(() => volume.calculatePoolVolume('oval', { length: 2, width: 1, depth: 1 }), RangeError);
	assert.throws(() => volume.withBalanceTankEstimate(10, 'yes'), TypeError);
});
