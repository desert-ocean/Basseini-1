'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/js/calculations/filter-pump-core.js');
const input = (poolPurpose='Частный') => ({volumeM3:65,turnoverHours:4,filtrationRate:25,poolPurpose});

test('keeps the exact fourteen standard diameters', () => {
	assert.deepEqual(core.DIAMETERS_MM,[350,400,500,600,650,750,800,900,1000,1200,1400,1600,1800,2000]);
});
test('one filter is returned when its area meets the filtration demand', () => {
	const r=core.calculate({volumeM3:60,turnoverHours:4,filtrationRate:30,poolPurpose:'Частный'});
	const v=r.variants.find(x=>x.diameterMm===1000);
	assert.equal(r.circulationM3h,15); assert.equal(v.count,1); assert.ok(v.actualRateMph<=30);
});
test('two 650 mm filters provide close circulation and backwash flows for the stated example', () => {
	const r=core.calculate(input());
	const v=r.combinations.find(x=>x.diameterMm===650&&x.count===2);
	assert.ok(Math.abs(v.circulationM3h-16.25)<1e-12);
	assert.ok(Math.abs(v.totalAreaM2-.663661)<1e-5);
	assert.ok(Math.abs(v.actualRateMph-24.485)<.01);
	assert.ok(Math.abs(v.backwashM3h-16.591)<.01);
	assert.ok(Math.abs(v.flowRatio-1.021)<.002);
});
test('one 1000 mm filter result and its single-filter backwash are correct', () => {
	const v=core.calculateForDiameter(input(),1000);
	assert.equal(v.count,1); assert.ok(Math.abs(v.areaM2-.785398)<1e-6);
	assert.ok(Math.abs(v.actualRateMph-20.69)<.02); assert.ok(Math.abs(v.backwashM3h-39.2699)<1e-3);
	assert.equal(v.flowDifferencePct, v.flowDifferenceM3h/v.circulationM3h*100);
});
test('selected diameter can require three or more filters', () => {
	const v=core.calculateForDiameter({volumeM3:60,turnoverHours:4,filtrationRate:30},500);
	assert.equal(v.count,3); assert.ok(v.actualRateMph<=30);
});
test('backwash is for one filter only, independent of total filter count', () => {
	const a=core.calculateForDiameter(input(),650);
	assert.ok(Math.abs(a.backwashM3h-(a.areaM2*50))<1e-12);
});
test('private recommendation prioritizes a rational single-filter fit but retains a two-filter flow-matched alternative', () => {
	const r=core.calculate(input('Частный'));
	assert.equal(r.options[0].recommendationTitle,'Приоритет для частного бассейна');
	assert.equal(r.options[0].count,1); assert.ok(r.options.some(v=>v.count===2));
	assert.ok(r.options.some(v=>v.recommendationTitle==='Близкие расходы циркуляции и промывки'));
});
test('public recommendation prioritizes two filters and still provides single-filter comparison', () => {
	const r=core.calculate(input('Общественный'));
	assert.equal(r.options[0].recommendationTitle,'Приоритет для общественного бассейна');
	assert.equal(r.options[0].count,2); assert.ok(r.options.some(v=>v.count===1));
});
test('2000 mm is not the primary recommendation for modest flow because excess area is ranked transparently', () => {
	const r=core.calculate({volumeM3:65,turnoverHours:4,filtrationRate:25,poolPurpose:'Частный'});
	assert.notEqual(r.options[0].diameterMm,2000);
	assert.equal(r.options[0].diameterMm,1000);
});
test('custom diameter computes area and count and rejects outside supported limits', () => {
	assert.equal(core.calculateForDiameter(input(),650).diameterMm,650);
	for(const d of [0,-1,NaN,Infinity,49,10001]) assert.throws(()=>core.calculateForDiameter(input(),d),RangeError);
});
test('rejects invalid source data and unreasonable filter counts', () => {
	for(const v of [0,-1,NaN,Infinity,undefined]) assert.throws(()=>core.calculate({volumeM3:v,turnoverHours:4,filtrationRate:25}),RangeError);
	assert.throws(()=>core.calculateForDiameter({volumeM3:1e8,turnoverHours:1e-8,filtrationRate:1},50),RangeError);
});
test('recommendations contain no duplicate combinations and fewer than three may be returned', () => {
	for(const purpose of ['Частный','Общественный','Другой тип']) {
		const opts=core.calculate(input(purpose)).options;
		const keys=opts.map(v=>v.count+'x'+v.diameterMm); assert.equal(new Set(keys).size,keys.length);
	}
	const few=core.calculate({volumeM3:1,turnoverHours:100,filtrationRate:100,poolPurpose:'Частный'});
	assert.ok(few.options.length<=3);
});
test('sports, child, school and wellness categories receive the public-system priority', () => {
	for(const purpose of ['Спортивный','Детский','Учебный','Оздоровительный']) {
		assert.equal(core.calculate(input(purpose)).options[0].count,2,purpose);
	}
});
test('one filter flow mismatch is visible beside a two-filter near-match for private example', () => {
	const r=core.calculate(input('Частный'));
	assert.equal(r.options[0].diameterMm,1000);
	assert.equal(r.options[1].diameterMm,650);
	assert.equal(r.options[1].count,2);
	assert.ok(Math.abs(r.options[1].flowRatio-1)<.03);
});