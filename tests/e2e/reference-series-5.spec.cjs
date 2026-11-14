const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const pages=[
 ['/spravochnik/raschet-balansnoy-emkosti.html','Расчёт балансной ёмкости переливного бассейна — ALPOOL'],
 ['/spravochnik/avtomatika-basseyna-datchiki-i-blokirovki.html','Автоматика бассейна: датчики, управление и блокировки — ALPOOL'],
 ['/spravochnik/podbor-cirkulyacionnogo-nasosa.html','Подбор циркуляционного насоса бассейна — ALPOOL'],
 ['/spravochnik/avariynye-situacii-i-zashchity-basseyna.html','Аварийные ситуации и защита оборудования бассейна — ALPOOL'],
];
for(const [url,title] of pages){
 test(`${url} metadata, SVG and responsive layout`,async({page})=>{
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:900});await page.goto(url);
   await expect(page.locator('h1')).toHaveCount(1);await expect(page).toHaveTitle(title);
   await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',`https://alpool.ru${url}`);
   await expect(page.locator('main svg[role=img]')).toBeVisible();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
   expect(overflow,`horizontal overflow at ${width}px`).toBe(false);
  }
 });
}
test('balance tank interaction switches scenario note and SVG state',async({page})=>{
 await page.goto('/spravochnik/raschet-balansnoy-emkosti.html');
 await expect(page.locator('[data-tank-note=normal]')).toBeVisible();
 await expect(page.locator('[data-tank-layer=normal]')).toBeVisible();
 await expect(page.locator('[data-tank-layer=backwash]')).toBeHidden();
 await page.locator('[data-tank-state=bathers]').click();
 await expect(page.locator('[data-tank-note=bathers]')).toBeVisible();
 await expect(page.locator('[data-tank-scheme]')).toHaveAttribute('data-scenario','bathers');
 await expect(page.locator('[data-tank-state=bathers]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-tank-layer=bathers]')).toBeVisible();
 await expect(page.locator('[data-tank-layer=normal]')).toBeHidden();
 await page.locator('[data-tank-state=backwash]').click();
 await expect(page.locator('[data-tank-note=backwash]')).toBeVisible();
 await expect(page.locator('[data-tank-layer=backwash]')).toBeVisible();
 await expect(page.locator('[data-tank-layer=normal]')).toBeHidden();
 await expect(page.locator('.diagram-labels')).toContainText('Канализация (только промывка)');
 await expect(page.locator('[data-tank-note=backwash]')).toContainText('снизу вверх');
});
test('upper working level is below emergency overflow inlet',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/spravochnik/raschet-balansnoy-emkosti.html');
 const upper=Number(await page.locator('[data-level="upper-working"]').getAttribute('y1'));
 const inlet=Number(await page.locator('[data-level="overflow-inlet"]').getAttribute('y1'));
 const pipeD=await page.locator('[data-emergency-overflow-inlet]').getAttribute('d');
 const pipeStart=Number(pipeD.match(/^M\d+\s+([\d.]+)/)[1]);
 const svgWidth=await page.locator('[data-tank-scheme]').evaluate(el=>el.getBoundingClientRect().width);
 expect(upper).toBeGreaterThan(inlet);
 expect((upper-inlet)*svgWidth/820).toBeGreaterThan(0);
 expect(pipeStart).toBe(inlet);
 await expect(page.locator('.diagram-labels')).toContainText('Верхний рабочий уровень');
 await expect(page.locator('.diagram-labels')).toContainText('Вход аварийного перелива — выше рабочего уровня');
});test('series 5 cards searchable, categorized and present in sitemap',async({page})=>{
 await page.goto('/spravochnik/index.html');
 const queries=[
  ['балансная емкость','raschet-balansnoy-emkosti.html'],
  ['датчики контроллер','avtomatika-basseyna-datchiki-i-blokirovki.html'],
  ['подбор насосов','podbor-cirkulyacionnogo-nasosa.html'],
  ['аварийные ситуации сухой ход','avariynye-situacii-i-zashchity-basseyna.html'],
 ];
 for(const [q,href] of queries){await page.fill('#search',q);await expect(page.locator(`#cards a[href="${href}"]`),q).toBeVisible();}
 await page.fill('#search','');await page.selectOption('#category','Насосное оборудование');await expect(page.locator('#cards .card:visible')).toHaveCount(1);
 const sitemap=fs.readFileSync(path.join(process.cwd(),'sitemap.xml'),'utf8');
 for(const [url] of pages)expect(sitemap).toContain(`https://alpool.ru${url}`);
});
test('new pages contain no outbound user links and local links resolve',async({request})=>{
 for(const [url] of pages){
  const file=path.join(process.cwd(),url.replace(/^\//,''));const html=fs.readFileSync(file,'utf8');
  const anchors=[...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map(match=>match[1]);
  for(const href of anchors){expect(href,`${url} outbound link`).not.toMatch(/^https?:\/\//i);expect(href).not.toMatch(/^\/\//);if(href.startsWith('/')){const response=await request.get(href);expect(response.ok(),`${url} -> ${href}`).toBeTruthy();}}
 }
});
test('series 5 requested mobile audit screenshots',async({page})=>{
 const out=path.join(process.cwd(),'.test-artifacts','series-5');fs.mkdirSync(out,{recursive:true});
 await page.setViewportSize({width:390,height:844});
 await page.goto('/spravochnik/raschet-balansnoy-emkosti.html');
 await page.screenshot({path:path.join(out,'balance-circulation-390.png'),fullPage:true});
 await page.screenshot({path:path.join(out,'balance-level-clearance-390.png'),fullPage:true});
 await page.locator('[data-tank-state=backwash]').click();
 await page.screenshot({path:path.join(out,'balance-backwash-390.png'),fullPage:true});
 await page.goto('/spravochnik/avtomatika-basseyna-datchiki-i-blokirovki.html');
 await page.screenshot({path:path.join(out,'automation-390.png'),fullPage:true});
});