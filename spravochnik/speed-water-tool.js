(()=>{
 'use strict';
 const core=window.PoolHydraulicsCore;
 const $=id=>document.getElementById(id);
 const els={flow:$('flow'),series:$('series'),diameter:$('diameter'),mode:$('pipe-mode'),custom:$('custom-id'),length:$('pipe-length'),error:$('loss-calculation-error')};
 if(!core||!els.flow||!$('speed-curve-chart'))return;
 const colors=['#527f96','#729e61','#9b6b9c','#bd7a40','#4f8a7b','#6574a6','#9c6761','#8a853e','#49899c','#a06c8d','#688d4f','#8f7160','#637eac','#b16a49','#527b70','#8264a1'];
 const fmt=(n,d=2)=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:d});
 const parse=s=>{const v=String(s??'').trim().replace(',','.');return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(v)?Number(v):NaN};
 function current(){
  const flow=parse(els.flow.value),actual=els.mode?.value==='actual';
  const catalog=core.catalogs[els.series.value]||[];
  const item=catalog.find(x=>x.od===Number(els.diameter.value));
  const diameter=actual?parse(els.custom?.value):item?.id;
  if(!(Number.isFinite(flow)&&flow>0&&flow<=10000&&Number.isFinite(diameter)&&diameter>0&&diameter<=10000))return null;
  try{return{flow,diameter,item,series:els.series.value,actual,pipe:core.pipe({flow,diameter,length:100})}}catch{return null}
 }
 function svgText(x,y,text,attrs=''){return `<text x="${x}" y="${y}" ${attrs}>${text}</text>`}
 function drawChart(svgId,legendId,kind,selected){
  const svg=$(svgId),legend=$(legendId),width=Math.max(280,Math.round(svg.clientWidth||640)),height=360;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const left=56,right=12,top=18,bottom=54,plotW=width-left-right,plotH=height-top-bottom;
  const x=q=>left+q/50*plotW;
  const speedMax=5,minHead=1,maxHead=25;
  const y=kind==='speed'?v=>top+plotH-(v/speedMax)*plotH:v=>top+plotH-((v-minHead)/(maxHead-minHead))*plotH;
  const yTicks=kind==='speed'?[0,1,2,3,4,5]:[1,5,10,15,20,25];
  const yLabels=yTicks.map(String);
  const clipId=`${svgId}-clip`;
  let out=`<title>${kind==='speed'?'Скорость воды в зависимости от расхода':'Потери напора на 100 метрах трубы в зависимости от расхода'}</title><defs><clipPath id="${clipId}"><rect x="${left}" y="${top}" width="${plotW}" height="${plotH}"/></clipPath></defs>`;
  for(let i=0;i<=5;i++){const q=i*10,xx=x(q);out+=`<path d="M${xx} ${top}V${top+plotH}" stroke="#dce8ed"/>`+svgText(xx,top+plotH+18,String(q),'text-anchor="middle"');}
  yTicks.forEach((tick,i)=>{const yy=y(tick);out+=`<path d="M${left} ${yy}H${left+plotW}" stroke="#dce8ed"/>`+svgText(left-7,yy+4,yLabels[i],'text-anchor="end"');});
  if(kind==='speed')for(const [v,label,color] of [[1.5,'1,5 м/с','#bd7a40'],[2,'2 м/с','#9b6b9c']])out+=`<path d="M${left} ${y(v)}H${left+plotW}" stroke="${color}" stroke-width="1.5" stroke-dasharray="6 5"/>`+svgText(left+5,y(v)-5,label,`fill="${color}"`);
  out+=`<path d="M${left} ${top}V${top+plotH}H${left+plotW}" fill="none" stroke="#476b7c" stroke-width="1.5"/>`;
  out+=svgText(left+plotW/2,height-8,'Расход, м³/ч','text-anchor="middle"');
  out+=`<text x="15" y="${top+plotH/2}" transform="rotate(-90 15 ${top+plotH/2})" text-anchor="middle">${kind==='speed'?'Скорость, м/с':'Потери напора, м вод. ст. на 100 м'}</text>`;
  out+=`<g clip-path="url(#${clipId})">`;
  const items=core.catalogs[selected.series]||[];
  legend.replaceChildren();
  items.forEach((item,index)=>{
   const isSelected=!selected.actual&&item.od===selected.item?.od,color=isSelected?'#c26128':colors[index%colors.length],points=[];
   for(let q=0;q<=50;q+=1){let value;if(q===0){if(kind==='speed')value=0;else continue}else{try{const result=core.pipe({flow:q,diameter:item.id,length:100});value=kind==='speed'?result.velocity:result.hf100}catch{continue}}
    if(kind==='speed'&&value>speedMax)break;
    points.push(`${x(q).toFixed(1)},${y(value).toFixed(1)}`);
   }
   if(points.length>1)out+=`<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="${isSelected?3.2:1.35}" stroke-opacity="${isSelected?1:.72}"><title>${item.series}: наружный диаметр ${fmt(item.od,1)} мм, внутренний ${fmt(item.id,1)} мм</title></polyline>`;
   const entry=document.createElement('span');entry.style.setProperty('--curve',color);entry.textContent=`${item.od} мм (внутренний ${fmt(item.id,1)} мм)`;if(isSelected)entry.style.fontWeight='800';legend.append(entry);
  });
  if(selected.actual){
   const color='#c26128',points=[];
   for(let q=0;q<=50;q+=1){let value;if(q===0){if(kind==='speed')value=0;else continue}else{try{const result=core.pipe({flow:q,diameter:selected.diameter,length:100});value=kind==='speed'?result.velocity:result.hf100}catch{continue}}if(kind==='speed'&&value>speedMax)break;points.push(`${x(q).toFixed(1)},${y(value).toFixed(1)}`)}
   if(points.length>1)out+=`<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="3.2"><title>Фактический внутренний диаметр ${fmt(selected.diameter)} мм</title></polyline>`;
   const entry=document.createElement('span');entry.style.setProperty('--curve',color);entry.style.fontWeight='800';entry.textContent=`Фактический внутренний диаметр ${fmt(selected.diameter)} мм`;legend.append(entry);
  }
  const pointValue=kind==='speed'?selected.pipe.velocity:selected.pipe.hf100;
  if(selected.flow<=50&&(kind!=='speed'||pointValue<=speedMax)&&(kind!=='loss'||pointValue>=minHead&&pointValue<=maxHead))out+=`<circle cx="${x(selected.flow)}" cy="${y(pointValue)}" r="5.5" fill="#fff" stroke="#b33c22" stroke-width="3"><title>Рабочая точка: ${fmt(selected.flow)} м³/ч; ${fmt(pointValue,kind==='speed'?2:4)} ${kind==='speed'?'м/с':'м на 100 м'}</title></circle>`;
  out+='</g>';
  svg.innerHTML=out;
 }
 function update(){
  const selected=current(),status=$('speed-curve-status');
  if(!selected){status.textContent='Введите положительный расход и корректный внутренний диаметр. Расчётные точки пока не показаны.';updateLoss(null);return}
  drawChart('speed-curve-chart','speed-curve-legend','speed',selected);drawChart('loss-curve-chart','loss-curve-legend','loss',selected);
  const notes=[];
  if(selected.flow>50)notes.push(`Рабочий расход ${fmt(selected.flow)} м³/ч выше диапазона графиков (0–50 м³/ч).`);
  if(selected.pipe.velocity>5)notes.push(`Скорость ${fmt(selected.pipe.velocity)} м/с выше шкалы графика скорости (0–5 м/с); точное значение приведено в таблице.`);
  if(selected.pipe.hf100<1||selected.pipe.hf100>25)notes.push(`Потери выбранной трубы — ${fmt(selected.pipe.hf100,4)} м на 100 м; рабочая точка находится ${selected.pipe.hf100<1?'ниже':'выше'} шкалы графика потерь (1–25 м). Численное значение приведено отдельно.`);
  status.textContent=notes.length?notes.join(' '):`Рабочая точка: ${fmt(selected.flow)} м³/ч; скорость ${fmt(selected.pipe.velocity)} м/с; потери ${fmt(selected.pipe.hf100,4)} м на 100 м прямой трубы.`;
  updateLoss(selected);
 }
 function updateLoss(selected){
  const error=els.error,length=parse(els.length.value),staticEnabled=$('static-enabled').value==='yes',staticValue=parse($('static-head').value),mode=$('static-mode').value,counts=[...document.querySelectorAll('[data-zeta]')];
  $('static-head-controls').hidden=!staticEnabled;
  let zeta=0,valid=Number.isFinite(length)&&length>=0&&length<=100000;
  counts.forEach(input=>{const count=parse(input.value);if(!Number.isInteger(count)||count<0||count>10000)valid=false;else zeta+=count*Number(input.dataset.zeta)});
  if(!selected)valid=false;
  if(!valid){error.textContent='Проверьте расход, диаметр, длину и неотрицательное целое количество фитингов.';['loss-speed','loss-hf100','loss-linear','loss-local','loss-total','loss-with-static'].forEach(id=>$(id).textContent='—');return}
  try{
   const result=core.line({flow:selected.flow,segments:[{flow:selected.flow,diameter:selected.diameter,length,zeta}]});
   error.textContent='';$('loss-speed').textContent=fmt(result.items[0].velocity);$('loss-hf100').textContent=fmt(result.items[0].hf100,4);$('loss-linear').textContent=fmt(result.linear,4);$('loss-local').textContent=fmt(result.local,4);$('loss-total').textContent=fmt(result.total,4);
   if(!staticEnabled){$('loss-static').textContent='0';$('static-status').textContent='нет — статическая составляющая равна 0';$('loss-with-static').textContent=fmt(result.total,4);return}
   if(!Number.isFinite(staticValue)||staticValue<0||staticValue>10000){$('loss-static').textContent='—';$('static-status').textContent='введите неотрицательную разницу уровней';$('loss-with-static').textContent='—';return}
   $('loss-static').textContent=fmt(staticValue);
   if(mode==='none'){$('static-status').textContent='выберите направление по расчётной схеме';$('loss-with-static').textContent='—';return}
   $('static-status').textContent=mode==='plus'?'прибавлен по выбранной схеме':'вычтен по выбранной схеме';
   $('loss-with-static').textContent=fmt(result.total+(mode==='plus'?staticValue:-staticValue),4);
  }catch(e){error.textContent=e.message;['loss-speed','loss-hf100','loss-linear','loss-local','loss-total','loss-with-static'].forEach(id=>$(id).textContent='—')}
 }
 [els.flow,els.series,els.diameter,els.mode,els.custom,els.length,$('static-enabled'),$('static-head'),$('static-mode'),...document.querySelectorAll('[data-zeta]')].filter(Boolean).forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',update));
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(update,100)});
 update();
})();
