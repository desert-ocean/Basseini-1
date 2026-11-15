const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

test('speed article graphs and line-loss block use shared hydraulic core',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/spravochnik/skorost-vody.html');
 await expect(page.locator('h1')).toHaveText('Скорость воды в трубопроводах');
 await expect(page.locator('#pipe-results-table tbody tr')).toHaveCount(5);
 await expect(page.locator('#svg-diameter')).toContainText('Внутренний диаметр');
 const initial=await page.evaluate(()=>PoolHydraulicsCore.pipe({flow:20,diameter:57,length:100}));
 await expect(page.locator('#velocity')).toHaveText(initial.velocity.toLocaleString('ru-RU',{maximumFractionDigits:2}));
 await expect(page.locator('#loss-hf100')).toHaveText(initial.hf100.toLocaleString('ru-RU',{maximumFractionDigits:4}));
 await expect(page.locator('#speed-curve-chart polyline')).toHaveCount(16);
 await expect(page.locator('#loss-curve-chart polyline')).toHaveCount(16);
 await expect(page.locator('#speed-curve-chart circle')).toHaveCount(1);
 await expect(page.locator('#loss-curve-chart circle')).toHaveCount(1);

 const expected=await page.evaluate(()=>PoolHydraulicsCore.line({flow:20,segments:[{flow:20,diameter:57,length:10,zeta:0}]}));
 await expect(page.locator('#loss-linear')).toHaveText(expected.linear.toLocaleString('ru-RU',{maximumFractionDigits:4}));
 await expect(page.locator('#loss-local')).toHaveText('0');
 await page.fill('#pipe-length','20');
 const longer=await page.evaluate(()=>PoolHydraulicsCore.line({flow:20,segments:[{flow:20,diameter:57,length:20,zeta:0}]}));
 await expect(page.locator('#loss-linear')).toHaveText(longer.linear.toLocaleString('ru-RU',{maximumFractionDigits:4}));
 await page.fill('#elbow90-count','1');
 const oneElbow=await page.evaluate(()=>PoolHydraulicsCore.line({flow:20,segments:[{flow:20,diameter:57,length:20,zeta:1.5}]}));
 await expect(page.locator('#loss-local')).toHaveText(oneElbow.local.toLocaleString('ru-RU',{maximumFractionDigits:4}));
 await expect(page.locator('#loss-total')).toHaveText(oneElbow.total.toLocaleString('ru-RU',{maximumFractionDigits:4}));

 await page.fill('#static-head','1,2');
 await expect(page.locator('#loss-with-static')).toHaveText('—');
 await page.selectOption('#static-mode','plus');
 await expect(page.locator('#loss-with-static')).toHaveText((oneElbow.total+1.2).toLocaleString('ru-RU',{maximumFractionDigits:4}));
 await page.selectOption('#static-mode','minus');
 await expect(page.locator('#loss-with-static')).toHaveText((oneElbow.total-1.2).toLocaleString('ru-RU',{maximumFractionDigits:4}));

 await page.selectOption('#series','PN16');
 await page.selectOption('#diameter','63');
 await expect(page.locator('#id')).toHaveText('53,6');
 await page.fill('#flow','10,5');
 const changed=await page.evaluate(()=>PoolHydraulicsCore.pipe({flow:10.5,diameter:53.6,length:100}));
 await expect(page.locator('#velocity')).toHaveText(changed.velocity.toLocaleString('ru-RU',{maximumFractionDigits:2}));
 await expect(page.locator('#speed-curve-status')).toContainText('Рабочая точка');
 await page.fill('#pipe-length','-1');
 await expect(page.locator('#loss-calculation-error')).not.toBeEmpty();
 await expect(page.locator('#loss-total')).toHaveText('—');
 await page.fill('#pipe-length','10');
 await page.fill('#flow','0');
 await expect(page.locator('#velocity')).toHaveText('—');
 await expect(page.locator('#speed-curve-status')).toContainText('корректный внутренний диаметр');
 await expect(page.locator('#loss-total')).toHaveText('—');
 expect(errors).toEqual([]);
 const text=await page.locator('main').innerText();
 expect(text).not.toMatch(/\bOD\b|\bID\b|Aliaxis|Lareter|FIP/i);
});

test('speed article remains readable and fits common viewports',async({page})=>{
 const outDir=path.join('.test-artifacts','speed-water');fs.mkdirSync(outDir,{recursive:true});
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:900});
  await page.goto('/spravochnik/skorost-vody.html');
  await page.evaluate(()=>document.fonts.ready);
  const diagnostic=await page.evaluate(()=>{const viewport=innerWidth,documentWidth=document.documentElement.scrollWidth;const elements=[...document.querySelectorAll('body *')].map(element=>{const r=element.getBoundingClientRect();return{tag:element.tagName,id:element.id,className:typeof element.className==='string'?element.className:'svg',left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),scrollWidth:element.scrollWidth}}).filter(x=>x.right>viewport+1||x.left< -1).sort((a,b)=>b.right-a.right);return{viewport,documentWidth,elements:elements.slice(0,20)}});
  expect(diagnostic.documentWidth,`horizontal overflow at ${width}px: ${JSON.stringify(diagnostic)}`).toBeLessThanOrEqual(diagnostic.viewport);
  await page.screenshot({path:path.join(outDir,`skorost-vody-${width}.png`),fullPage:true});
  await page.locator('#pipe-results-table').screenshot({path:path.join(outDir,`results-${width}.png`)});
  await page.locator('#speed-curve-chart').screenshot({path:path.join(outDir,`speed-chart-${width}.png`)});
  await page.locator('#loss-curve-chart').screenshot({path:path.join(outDir,`loss-chart-${width}.png`)});
 }
});
