const {test}=require('node:test'),assert=require('node:assert/strict'),convert=require('../spravochnik/flow-conversion.js');
test('flow conversion preserves physical units and rejects invalid input',()=>{
 assert.equal(convert(18,'to-ls'),5);assert.equal(convert(5,'to-m3h'),18);assert.equal(convert(0,'to-ls'),0);
 for(const n of [-1,Infinity,NaN,1000001])assert.throws(()=>convert(n,'to-ls'));
 assert.throws(()=>convert(1,'bad'));
});
