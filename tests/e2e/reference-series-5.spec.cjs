const {test,expect}=require('@playwright/test');
const {allowedGovernmentDocuments,allowedAlpoolContacts}=require('../../scripts/external-link-policy.cjs');
const fs=require('node:fs');
const path=require('node:path');
const pages=[
 ['/spravochnik/raschet-balansnoy-emkosti.html','Расчёт балансного бака бассейна — объём, размеры и калькулятор | ALPOOL'],
 ['/spravochnik/avtomatika-basseyna-datchiki-i-blokirovki.html','Датчики и автоматика бассейна: управление и защитные блокировки | ALPOOL'],
 ['/spravochnik/podbor-cirkulyacionnogo-nasosa.html','Как подобрать циркуляционный насос бассейна: расход, напор и потери | ALPOOL'],
 ['/spravochnik/avariynye-situacii-i-zashchity-basseyna.html','Аварийные ситуации и защита оборудования бассейна — ALPOOL'],
];
for(const [url,title] of pages){
 test(`${url} metadata, SVG and responsive layout`,async({page})=>{
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:900});await page.goto(url);
   await expect(page.locator('h1')).toHaveCount(1);await expect(page).toHaveTitle(title);
   await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',`https://alpool.ru${url}`);
   const images=page.locator('main img[src$=".svg"]');const diagrams=page.locator('main svg[role=img]:visible');
   expect(await images.count()+await diagrams.count(),`${url} has a diagram`).toBeGreaterThan(0);
   for(let i=0;i<await images.count();i++){const image=images.nth(i);await image.scrollIntoViewIfNeeded();await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(node=>node.naturalWidth)).toBeGreaterThan(0);}
   if(await diagrams.count())await expect(diagrams.first()).toBeVisible();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
   expect(overflow,`horizontal overflow at ${width}px`).toBe(false);
  }
 });
}
test('balance tank calculator updates its level diagram from the actual input',async({page})=>{
 await page.goto('/spravochnik/raschet-balansnoy-emkosti.html');
 await page.getByRole('button',{name:'Инженерный расчёт'}).click();
 const diagram=page.locator('[data-tank-diagram]');
 await expect(diagram).toBeVisible();
 const initialY=Number(await diagram.locator('[data-diagram-level="normal"]').getAttribute('y1'));
 await page.locator('[data-field="normalLevelMm"]').fill('1100');
 const changedY=Number(await diagram.locator('[data-diagram-level="normal"]').getAttribute('y1'));
 expect(changedY).not.toBe(initialY);
 await expect(page.locator('[data-diagram-summary]')).toContainText('Нижняя конструктивная зона');
 await page.locator('[data-field="normalLevelMm"]').fill('');
 await expect(diagram).toBeHidden();
});
test('upper working level is below emergency overflow inlet',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/spravochnik/raschet-balansnoy-emkosti.html');
 await page.getByRole('button',{name:'Инженерный расчёт'}).click();
 const diagram=page.locator('[data-tank-diagram]');
 const upper=Number(await diagram.locator('[data-diagram-level="maximum"]').getAttribute('y1'));
 const inlet=Number(await diagram.locator('[data-diagram-level="overflow"]').getAttribute('y1'));
 const svgWidth=await diagram.evaluate(el=>el.getBoundingClientRect().width);
 expect(upper).toBeGreaterThan(inlet);
 expect((upper-inlet)*svgWidth/460).toBeGreaterThan(0);
 await expect(diagram).toHaveAttribute('aria-labelledby',/tank-diagram-title/);
 await expect(page.locator('[data-diagram-summary]')).toContainText(/При нормальном уровне 1\s*000 мм.*Нижняя конструктивная зона/);
});test('series 5 cards searchable, categorized and present in sitemap',async({page})=>{
 await page.goto('/spravochnik/index.html');
 const queries=[
  ['балансной ёмкости','raschet-balansnoy-emkosti.html'],
  ['датчики контроллер','avtomatika-basseyna-datchiki-i-blokirovki.html'],
  ['подбор насосов','podbor-cirkulyacionnogo-nasosa.html'],
  ['аварийные ситуации сухой ход','avariynye-situacii-i-zashchity-basseyna.html'],
 ];
 for(const [q,href] of queries){await page.fill('#search',q);await expect(page.locator(`#cards h2 a[href="${href}"]`),q).toBeVisible();}
 await page.fill('#search','');await page.selectOption('#category','Насосное оборудование');await expect(page.locator('#cards .reference-card:visible')).toHaveCount(2); await expect(page.locator('#cards h2 a[href="chastotnoe-upravlenie-nasosom.html"]')).toBeVisible();
 const sitemap=fs.readFileSync(path.join(process.cwd(),'sitemap.xml'),'utf8');
 for(const [url] of pages)expect(sitemap).toContain(`https://alpool.ru${url}`);
});
test('new pages contain no outbound user links and local links resolve',async({request})=>{
 for(const [url] of pages){
  const file=path.join(process.cwd(),url.replace(/^\//,''));const html=fs.readFileSync(file,'utf8');
  const anchors=[...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map(match=>match[1]);
  for(const href of anchors){if(/^https?:\/\//i.test(href)){expect(allowedAlpoolContacts.has(href)||allowedGovernmentDocuments.has(href),`${url} outbound link`).toBe(true);continue;}expect(href).not.toMatch(/^\/\//);if(href.startsWith('/')){const response=await request.get(href);expect(response.ok(),`${url} -> ${href}`).toBeTruthy();}}
 }
});
test('series 5 requested mobile audit screenshots',async({page})=>{
 const out=path.join(process.cwd(),'.test-artifacts','series-5');fs.mkdirSync(out,{recursive:true});
 await page.setViewportSize({width:390,height:844});
 await page.goto('/spravochnik/raschet-balansnoy-emkosti.html');
 await page.getByRole('button',{name:'Инженерный расчёт'}).click();
 await page.screenshot({path:path.join(out,'balance-circulation-390.png'),fullPage:true});
 await page.screenshot({path:path.join(out,'balance-level-clearance-390.png'),fullPage:true});
 await page.locator('[data-field="normalLevelMm"]').fill('1100');
 await expect(page.locator('[data-diagram-summary]')).toContainText('Нижняя конструктивная зона');
 await page.screenshot({path:path.join(out,'balance-updated-level-390.png'),fullPage:true});
 await page.goto('/spravochnik/avtomatika-basseyna-datchiki-i-blokirovki.html');
 await page.screenshot({path:path.join(out,'automation-390.png'),fullPage:true});
});
