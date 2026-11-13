(function(root,factory){
  'use strict';
  const calculate=factory();
  if(typeof module==='object'&&module.exports)module.exports=calculate;
  if(!root.document)return;
  const flow=root.document.getElementById('inlet-flow');
  if(!flow)return;
  const capacity=root.document.getElementById('inlet-capacity'),output=root.document.getElementById('inlet-count'),per=root.document.getElementById('inlet-per'),error=root.document.getElementById('inlet-error');
  function render(){
    try{
      const r=calculate(flow.value,capacity.value);
      output.textContent=String(r.count);per.textContent=r.perInlet.toLocaleString('ru-RU',{maximumSignificantDigits:6});
      error.textContent='';flow.setAttribute('aria-invalid','false');capacity.setAttribute('aria-invalid','false');
    }catch(e){
      output.textContent='—';per.textContent='—';error.textContent=e.message;
      flow.setAttribute('aria-invalid',String(e.field==='flow'||e.field==='both'));capacity.setAttribute('aria-invalid',String(e.field==='capacity'||e.field==='both'));
    }
  }
  flow.addEventListener('input',render);capacity.addEventListener('input',render);render();
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function fail(message,field){const e=new RangeError(message);e.field=field;throw e}
  function parse(value,field){
    const s=String(value).trim().replace(',','.');
    if(!/^(?:\d+(?:\.\d{1,6})?|\.\d{1,6})$/.test(s))fail('Введите положительное число с точкой или запятой и не более 6 знаков после разделителя.',field);
    const [whole,fraction='']=s.split('.'),n=Number(s);
    if(!(n>0&&n<=100000))fail('Расход должен быть больше 0 и не более 100 000 м³/ч.',field);
    return {scaled:BigInt(whole||'0')*1000000n+BigInt(fraction.padEnd(6,'0')),n};
  }
  return function(flow,capacity){
    const a=parse(flow,'flow'),b=parse(capacity,'capacity');
    const exact=(a.scaled+b.scaled-1n)/b.scaled;
    if(exact>10000n)fail('Получилось более 10 000 форсунок. Проверьте исходные данные.','both');
    const count=Number(exact);
    return {count,perInlet:a.n/count};
  };
});
