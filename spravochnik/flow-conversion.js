(function(root,factory){
  const convert=factory();
  if(typeof module==='object'&&module.exports)module.exports=convert;
  if(!root.document)return;
  const input=root.document.getElementById('flow-convert-value');
  if(!input)return;
  const direction=root.document.getElementById('flow-convert-direction'),result=root.document.getElementById('flow-convert-result'),unit=root.document.getElementById('flow-convert-unit'),error=root.document.getElementById('flow-convert-error');
  function render(){
    const text=input.value.trim().replace(',','.');
    const value=/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)?Number(text):NaN;
    root.document.getElementById('flow-convert-from').textContent=direction.value==='to-ls'?'м³/ч':'л/с';
    root.document.getElementById('flow-convert-to').textContent=direction.value==='to-ls'?'÷ 3,6 → л/с':'× 3,6 → м³/ч';
    unit.textContent=direction.value==='to-ls'?'л/с':'м³/ч';
    try {
      const converted=convert(value,direction.value);
      result.textContent=converted.toLocaleString('ru-RU',{maximumSignificantDigits:6});
      input.setAttribute('aria-invalid','false');error.textContent='';
    } catch(e){result.textContent='—';input.setAttribute('aria-invalid','true');error.textContent='Введите неотрицательное число не более 1 000 000.'}
  }
  input.addEventListener('input',render);direction.addEventListener('change',render);render();
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  return function(value,direction){
    if(!Number.isFinite(value)||value<0||value>1000000||!['to-ls','to-m3h'].includes(direction))throw new RangeError('Invalid flow');
    return direction==='to-ls'?value/3.6:value*3.6;
  };
});
