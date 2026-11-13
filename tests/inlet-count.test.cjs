const {test}=require('node:test'),assert=require('node:assert/strict'),calculate=require('../spravochnik/inlet-count.js');
test('inlet count uses exact decimal ceilings and positive limits',()=>{
 assert.deepEqual(calculate('12','3'),{count:4,perInlet:3});
 assert.equal(calculate('10','3').count,4);assert.equal(calculate('0,07','0,01').count,7);
 assert.equal(calculate('0.070001','0.01').count,8);
 for(const pair of [['0','1'],['-1','1'],['1','0'],['1x','1'],['1.0000001','1'],['100001','1'],['10001','1']])assert.throws(()=>calculate(...pair));
});
