(()=>{
  'use strict';
  const $=id=>document.getElementById(id), core=window.PoolHydraulicsCore;
  const normalize=s=>s.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/pvc[\s-]*u/g,'pvcu').replace(/[^a-zа-я0-9]+/g,' ').trim();
  function stem(word){
    if(!/^[а-я]{5,}$/.test(word)) return word;
    return word.replace(/(иями|ами|ями|ого|ему|ыми|ими|иях|ах|ях|ов|ев|ей|ом|ем|ам|ям|ой|ий|ый|ая|ое|ые|ую|юю|а|ы|и|е|у|ю|я)$/,'');
  }
  const tokens=s=>normalize(s).split(/\s+/).filter(Boolean).map(stem);
  const search=$('search'), category=$('category');
  if(search&&category){
    const cards=[...document.querySelectorAll('[data-search]')];
    const update=()=>{
      const q=tokens(search.value);let count=0;
      cards.forEach(c=>{const words=tokens(c.dataset.search);const ok=q.every(t=>words.some(w=>w.startsWith(t)))&&(!category.value||c.dataset.category===category.value);c.hidden=!ok;if(ok)count++});
      $('search-count').textContent=`Найдено материалов: ${count}`;$('empty').hidden=!!count;
    };
    search.addEventListener('input',update);category.addEventListener('change',update);update();
  }
  const series=$('series'),diameter=$('diameter'),flow=$('flow'),mode=$('pipe-mode'),custom=$('custom-id');
  if(series&&diameter&&flow&&core){
    const fmt=(n,d=2)=>n.toLocaleString('ru-RU',{maximumFractionDigits:d});
    const parse=s=>{s=s.trim().replace(',','.');return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)?Number(s):NaN};
    function options(){
      const previous=Number(diameter.value),items=core.catalogs[series.value];
      diameter.replaceChildren(...items.map(x=>{const o=document.createElement('option');o.value=x.od;o.textContent=x.od;return o}));
      diameter.value=items.some(x=>x.od===previous)?String(previous):String(items.find(x=>x.od===63)?.od||items[0].od);render();
    }
    function render(){
      const x=core.catalogs[series.value].find(i=>i.od===Number(diameter.value)),actual=mode&&mode.value==='actual';
      const id=actual?parse(custom.value):x.id,validId=Number.isFinite(id)&&id>0&&id<=10000;
      const n=parse(flow.value),valid=Number.isFinite(n)&&n>0&&n<=10000;
      $('flow-error').textContent=valid?'':'Введите расход больше 0 и не более 10 000 м³/ч.';
      flow.setAttribute('aria-invalid',String(!valid));
      if(mode){$('catalog-controls').hidden=actual;$('custom-control').hidden=!actual;$('id-error').textContent=validId?'':'Введите внутренний диаметр больше 0 и не более 10 000 мм.';custom.setAttribute('aria-invalid',String(!validId))}
      $('od').textContent=actual?'—':fmt(x.od);$('wall').textContent=actual?'—':fmt(x.wall);$('id').textContent=validId?fmt(id):'—';
      const geometry=validId?core.pipe({flow:1,diameter:id}):null,result=validId&&valid?core.pipe({flow:n,diameter:id}):null;
      $('area').textContent=geometry?fmt(geometry.area*1e6,1):'—';$('velocity').textContent=result?fmt(result.velocity):'—';
      if($('bore')){
        $('pipe-diagram').hidden=actual;
        $('bore').setAttribute('r',String(100*x.id/x.od));
        $('svg-od').textContent=`OD = ${fmt(x.od)} мм`;$('svg-id').textContent=`ID = ${fmt(x.id)} мм`;$('svg-wall').textContent=`Стенка = ${fmt(x.wall)} мм`;
        const bore=100*x.id/x.od; $('id-line').setAttribute('x1',String(140-bore));$('id-line').setAttribute('x2',String(140+bore));$('wall-line').setAttribute('x2',String(140+bore));
      }
      if($('svg-flow')){$('svg-flow').textContent=`Q = ${valid?fmt(n):'—'} м³/ч`;$('svg-speed').textContent=`v = ${result?fmt(result.velocity):'—'} м/с`;$('svg-diameter').textContent=`D = ${validId?fmt(id):'—'} мм`}
    }
    series.addEventListener('change',options);diameter.addEventListener('change',render);flow.addEventListener('input',render);if(mode){mode.addEventListener('change',render);custom.addEventListener('input',render)}options();
  }
  const filter=$('table-filter');if(filter)filter.addEventListener('change',()=>document.querySelectorAll('tr[data-series]').forEach(row=>row.hidden=filter.value!=='all'&&row.dataset.series!==filter.value));
})();
