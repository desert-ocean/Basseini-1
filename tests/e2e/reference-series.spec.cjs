const {test,expect}=require('@playwright/test');
const pages=['perevod-rashoda','mestnye-soprotivleniya','napor-nasosa','vodoobmen-basseyna','obratnaya-promyvka-filtra'];
for(const width of [390,768,1440])test(`new references on ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const name of pages){const response=await page.goto('/spravochnik/'+name+'.html');expect(response.status()).toBe(200);await expect(page.locator('h1')).toBeVisible();await expect(page.locator('svg[role=img]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://alpool.ru/spravochnik/'+name+'.html')}
 expect(errors).toEqual([]);
});
test('conversion preserves small positive values and updates units on invalid input',async({page})=>{
 await page.goto('/spravochnik/perevod-rashoda.html');
 await page.fill('#flow-convert-value','0,000001');
 const result=await page.locator('#flow-convert-result').textContent();
 expect(Number(result.replace(/\s/g,'').replace(',','.'))).toBeGreaterThan(0);
 await page.fill('#flow-convert-value','-1');
 await page.selectOption('#flow-convert-direction','to-m3h');
 await expect(page.locator('#flow-convert-result')).toHaveText('—');
 await expect(page.locator('#flow-convert-unit')).toHaveText('м³/ч');
 await page.selectOption('#flow-convert-direction','to-ls');
 await expect(page.locator('#flow-convert-unit')).toHaveText('л/с');
});
test('conversion, search and internal reference links',async({page})=>{
 await page.goto('/spravochnik/perevod-rashoda.html');await expect(page.locator('#flow-convert-result')).toHaveText('5');await page.selectOption('#flow-convert-direction','to-m3h');await expect(page.locator('#flow-convert-from')).toHaveText('л/с');await expect(page.locator('#flow-convert-to')).toHaveText('× 3,6 → м³/ч');await page.fill('#flow-convert-value','2,5');await expect(page.locator('#flow-convert-result')).toHaveText('9');await page.fill('#flow-convert-value','-1');await expect(page.locator('#flow-convert-result')).toHaveText('—');await expect(page.locator('#flow-convert-error')).not.toBeEmpty();
 await page.goto('/spravochnik/index.html');await page.fill('#search','промывка фильтра');await expect(page.locator('[data-search]:visible')).toHaveCount(4);await expect(page.locator('#cards a[href="obratnaya-promyvka-filtra.html"]')).toBeVisible();await page.fill('#search','');await page.selectOption('#category','Фильтрация');await expect(page.locator('[data-search]:visible')).toHaveCount(6);await expect(page.locator('#cards a[href="parallelnaya-rabota-filtrov.html"]')).toBeVisible();await expect(page.locator('#cards a[href="perepad-davleniya-na-filtre.html"]')).toBeVisible();
 const sitemap=await (await page.request.get('/sitemap.xml')).text();for(const name of pages){expect(sitemap).toContain('/spravochnik/'+name+'.html');const response=await page.request.get('/spravochnik/'+name+'.html');expect(response.status()).toBe(200)}
});
