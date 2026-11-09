'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/js/calculations/filter-pump-core.js');

test('uses the exact standard series of fourteen diameters', () => {
	assert.deepEqual(core.DIAMETERS_MM, [350,400,500,600,650,750,800,900,1000,1200,1400,1600,1800,2000]);
	assert.equal(core.calculate({volumeM3:100,turnoverHours:4,filtrationRate:30}).variants.length, 14);
});
test('calculates circulation, rounds filter count up and derives actual rate and backwash', () => {
	const r = core.calculate({volumeM3:100,turnoverHours:4,filtrationRate:30});
	assert.equal(r.circulationM3h,25);
	const f = r.variants.find(x => x.diameterMm === 1000);
	assert.equal(f.count, 2);
	assert.ok(f.actualRateMph <= 30);
	assert.ok(Math.abs(f.backwashM3h - Math.PI * .25 * 50) < 1e-12);
	assert.equal(f.backwashM3h, r.variants.find(x=>x.diameterMm===1000).backwashM3h);
});
test('offers distinct choices and compares circulation with one filter backwash', () => {
	const r = core.calculate({volumeM3:100,turnoverHours:4,filtrationRate:30});
	assert.ok(r.options.length >= 2);
	assert.equal(r.pump.circulationM3h,25);
	assert.equal(r.pump.backwashM3h, r.options[0].backwashM3h);
	assert.equal(r.pump.requiresHydraulicReview, true);
});
test('rejects empty, nonfinite and nonpositive input', () => {
	for (const value of [0,-1,NaN,Infinity,undefined]) {
		assert.throws(() => core.calculate({volumeM3:value,turnoverHours:4,filtrationRate:30}), RangeError);
	}
});
test('handles small pools and rejects demands exceeding the bounded filter count', () => {
	assert.ok(core.calculate({volumeM3:.1,turnoverHours:24,filtrationRate:5}).variants.every(x=>x.count>=1));
	assert.throws(() => core.calculate({volumeM3:100000,turnoverHours:1,filtrationRate:5}), RangeError);
});

test('large-flow options expose high filter counts for an engineering warning', () => {
	const r = core.calculate({volumeM3:1000,turnoverHours:1,filtrationRate:30});
	assert.ok(r.options.length > 0);
	assert.ok(r.options.every(option => option.count >= 10));
});