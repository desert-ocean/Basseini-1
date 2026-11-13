'use strict';
// npm run generate:reference-tables; use --check in CI to detect drift.
const fs=require('node:fs'),crypto=require('node:crypto');
require('../assets/js/calculations/pool-hydraulics-core.js');
const core=globalThis.PoolHydraulicsCore;
const hash=crypto.createHash('sha256').update(JSON.stringify(core.catalogs)).digest('hex');
// This exact catalogue snapshot was checked against Lareter 2026, pp. 19 and 26.
const confirmed=hash==='e46c7357f9709f993aa764d9d95dd12974a4b42d5e3add6a303444c3cca1342f';
if(!confirmed)throw Error('Каталог изменён: повторно сверьте артикулы и толщины с источником, затем обновите контрольную сумму.');
const n=x=>String(x).replace('.',',');
const code=(series,od)=>`PIPEV${series==='PN10'?(od<=90?'21':'26'):(od<=90?'13':'17')}${String(od).padStart(3,'0')}06L`;
const pipeRows=Object.entries(core.catalogs).flatMap(([series,items])=>items.map(x=>`<tr data-series="${series}"><td>${series}</td><td>${n(x.od)}</td><td>${n(x.wall)}</td><td>${n(x.id)}</td><td>${confirmed?code(series,x.od):'Предварительно'}</td></tr>`)).join('');
const speedRows=[50,63,75,90,110].map(od=>{const x=core.catalogs.PN10.find(p=>p.od===od);if(!x)throw Error('Размер PN10 отсутствует: '+od);return `<tr><td>${n(od)}</td><td>${n(x.id)}</td>${[5,10,20].map(flow=>`<td>${n(core.pipe({flow,diameter:x.id}).velocity.toFixed(2))}</td>`).join('')}</tr>`}).join('');
const targets=[['spravochnik/truby-pvc-u.html',pipeRows],['spravochnik/skorost-vody.html',speedRows]];
let failed=false;
for(const [file,rows] of targets){const html=fs.readFileSync(file,'utf8');const next=html.replace(/(<tbody data-generated="reference">)[\s\S]*?(<\/tbody>)/,(_,a,b)=>a+rows+b);if(next===html&&!html.includes('<tbody data-generated="reference">'))throw Error('Нет маркера таблицы: '+file);if(next!==html){if(process.argv.includes('--check')){console.error('Таблица устарела: '+file);failed=true}else fs.writeFileSync(file,next,'utf8')}}
if(failed)process.exitCode=1;
