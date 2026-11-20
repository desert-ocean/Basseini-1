'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const makeup = require('../assets/js/calculations/pool-makeup-core.js');

test('example: 1.5 m³ at 0.5 m³/h takes 3 h, equals 8.33 l/min and 2.5% of 60 m³', () => {
	const result = makeup.calculateMakeup({
		basinVolumeM3: 60,
		mirrorAreaM2: 32,
		makeupVolumeM3: 1.5,
		flowM3h: 0.5
	});
	assert.equal(result.timeHours, 3);
	assert.equal(result.timeMinutes, 180);
	assert.equal(result.flowLitersPerMinute, 1000 / 120);
	assert.equal(result.sharePercent, 2.5);
});

test('mirror area is optional and does not affect hydraulic results', () => {
	const result = makeup.calculateMakeup({
		basinVolumeM3: 60,
		makeupVolumeM3: 1.5,
		flowM3h: 0.5
	});
	assert.equal(result.mirrorAreaM2, null);
	assert.equal(result.timeHours, 3);
});

test('zero makeup volume is valid and yields zero duration and share', () => {
	const result = makeup.calculateMakeup({ basinVolumeM3: 60, makeupVolumeM3: 0, flowM3h: 0.5 });
	assert.equal(result.timeHours, 0);
	assert.equal(result.sharePercent, 0);
});

test('positive decimal values retain dimensional consistency', () => {
	const result = makeup.calculateMakeup({ basinVolumeM3: 8, makeupVolumeM3: 0.25, flowM3h: 1.2 });
	assert.equal(result.timeHours, 0.25 / 1.2);
	assert.equal(result.flowLitersPerMinute, 20);
	assert.equal(result.sharePercent, 3.125);
});

test('missing, zero, negative, non-finite, and overflowing inputs are rejected with field codes', () => {
	const cases = [
		[{ makeupVolumeM3: 1, flowM3h: 1 }, 'invalid-basin-volume', 'basin-volume'],
		[{ basinVolumeM3: 1, makeupVolumeM3: -1, flowM3h: 1 }, 'invalid-makeup-volume', 'makeup-volume'],
		[{ basinVolumeM3: 1, makeupVolumeM3: 1, flowM3h: 0 }, 'invalid-flow', 'flow'],
		[{ basinVolumeM3: 1, makeupVolumeM3: 1, flowM3h: -2 }, 'invalid-flow', 'flow'],
		[{ basinVolumeM3: NaN, makeupVolumeM3: 1, flowM3h: 1 }, 'invalid-basin-volume', 'basin-volume'],
		[{ basinVolumeM3: 1, makeupVolumeM3: Infinity, flowM3h: 1 }, 'invalid-makeup-volume', 'makeup-volume'],
		[{ basinVolumeM3: 1, makeupVolumeM3: 1, flowM3h: Infinity }, 'invalid-flow', 'flow'],
		[{ basinVolumeM3: 1, mirrorAreaM2: -1, makeupVolumeM3: 1, flowM3h: 1 }, 'invalid-mirror-area', 'mirror-area'],
		[{ basinVolumeM3: Number.MIN_VALUE, makeupVolumeM3: Number.MAX_VALUE, flowM3h: Number.MIN_VALUE }, 'result-out-of-range', 'makeup-volume']
	];
	for (const [input, code, field] of cases) {
		assert.throws(() => makeup.calculateMakeup(input), error => error.code === code && error.field === field);
	}
	assert.throws(() => makeup.calculateMakeup(null), error => error.code === 'missing-input');
});
