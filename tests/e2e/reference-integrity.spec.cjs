const {test,expect}=require('@playwright/test');
const fs=require('fs');
const path=require('path');
const {TextDecoder}=require('util');
const files=['index.html','truby-pvc-u.html','skorost-vody.html','gidravlicheskie-poteri.html'];
test('UTF-8 content, categories, metadata, sitemap and local links',async({page})=>{
 const decoder=new TextDecoder('utf-8',{fatal:true});
 for(const file of [...files,'reference.js','reference.css']){
  const text=decoder.decode(fs.readFileSync(path.join('spravochnik',file)));
  expect(text).not.toContain('\ufffd');expect(text).not.toMatch(/\?{3,}/);
 }
 const titles=new Set(),descriptions=new Set();
 const sitemap=fs.readFileSync('sitemap.xml','utf8');
 for(const file of files){
  const response=await page.goto('/spravochnik/'+file);expect(response.status()).toBe(200);
  expect(await page.locator('meta[charset]').getAttribute('charset')).toMatch(/^utf-8$/i);
  const title=await page.title(),description=await page.locator('meta[name="description"]').getAttribute('content');
  expect(title).toMatch(/[А-Яа-яЁё]/);expect(description).toMatch(/[А-Яа-яЁё]/);titles.add(title);descriptions.add(description);
  await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('h2').first()).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://alpool.ru/spravochnik/'+file);
  expect(sitemap).toContain('https://alpool.ru/spravochnik/'+file);
  for(const href of await page.locator('a[href]').evaluateAll(as=>as.map(a=>a.getAttribute('href')))){
   if(href.startsWith('http')||href.startsWith('#')||href.startsWith('tel:')||href.startsWith('mailto:'))continue;
   const target=new URL(href,page.url());const resolved=target.pathname==='/'?'index.html':target.pathname.slice(1);
   expect(fs.existsSync(resolved),`${file}: ${href}`).toBeTruthy();
  }
 }
 expect(titles.size).toBe(4);expect(descriptions.size).toBe(4);
 await page.goto('/spravochnik/index.html');
 const categories=await page.locator('#category option').allTextContents();
 expect(categories).toContain('Гидравлика');expect(categories).toContain('Трубопроводы и материалы');
 for(const cat of await page.locator('[data-category]').evaluateAll(es=>es.map(e=>e.dataset.category)))expect(categories).toContain(cat);
 await page.fill('#search','внутренний диаметр');await expect(page.locator('[data-search]:visible')).toHaveCount(1);
});
test('PVC-U results agree with the shared core and speed article no longer has the sample table',async({page})=>{
 await page.goto('/spravochnik/truby-pvc-u.html');
 await page.selectOption('#diameter','50');
 const expected=await page.evaluate(()=>{const x=PoolHydraulicsCore.catalogs.PN10.find(p=>p.od===50);return PoolHydraulicsCore.pipe({flow:20,diameter:x.id})});
 await expect(page.locator('#area')).toHaveText(expected.area*1e6<1000?(expected.area*1e6).toLocaleString('ru-RU',{maximumFractionDigits:1}):(expected.area*1e6).toLocaleString('ru-RU',{maximumFractionDigits:1}));
 await expect(page.locator('#velocity')).toHaveText(expected.velocity.toLocaleString('ru-RU',{maximumFractionDigits:2}));
 await page.goto('/spravochnik/skorost-vody.html');
 await expect(page.getByRole('heading',{name:'Таблица скоростей по типовым трубам'})).toHaveCount(0);
 await expect(page.locator('tbody[data-generated="reference"]')).toHaveCount(0);
 await expect(page.locator('#loss-curve-chart')).toBeVisible();
});
