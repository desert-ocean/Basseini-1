const {test,expect}=require('@playwright/test');
const pages=['svobodnyy-i-svyazannyy-hlor','shchelochnost-vody','donnyy-sliv-basseyna','kolichestvo-forsunok','cirkulyaciya-vody-v-chashe'];
for(const width of [390,768,1440])test(`series 2 renders on ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const name of pages){const r=await page.goto('/spravochnik/'+name+'.html');expect(r.status()).toBe(200);await expect(page.locator('h1')).toBeVisible();await expect(page.locator('svg[role=img]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://alpool.ru/spravochnik/'+name+'.html')}
 expect(errors).toEqual([]);
});
test('inlet count handles unequal division, decimals, invalid and extreme inputs',async({page})=>{
 await page.goto('/spravochnik/kolichestvo-forsunok.html');await expect(page.locator('#inlet-count')).toHaveText('4');
 await page.fill('#inlet-flow','10');await expect(page.locator('#inlet-count')).toHaveText('4');await expect(page.locator('#inlet-per')).toHaveText('2,5');
 await page.fill('#inlet-flow','0,07');await page.fill('#inlet-capacity','0,01');await expect(page.locator('#inlet-count')).toHaveText('7');
 await page.fill('#inlet-flow','0');await expect(page.locator('#inlet-count')).toHaveText('—');await expect(page.locator('#inlet-flow')).toHaveAttribute('aria-invalid','true');
 await page.fill('#inlet-flow','12');await page.fill('#inlet-capacity','foo');await expect(page.locator('#inlet-capacity')).toHaveAttribute('aria-invalid','true');await expect(page.locator('#inlet-error')).not.toBeEmpty();
 await page.fill('#inlet-flow','10001');await page.fill('#inlet-capacity','1');await expect(page.locator('#inlet-count')).toHaveText('—');
});
test('catalog categories, links, sitemap and no external navigation',async({page})=>{
 await page.goto('/spravochnik/index.html');await page.fill('#search','связанный хлор');await expect(page.locator('[data-search]:visible')).toHaveCount(1);
 await page.fill('#search','');await page.selectOption('#category','Закладные элементы');await expect(page.locator('[data-search]:visible')).toHaveCount(4);
 const xml=await(await page.request.get('/sitemap.xml')).text();
 for(const name of pages){expect(xml).toContain('/spravochnik/'+name+'.html');await page.goto('/spravochnik/'+name+'.html');const hrefs=await page.locator('a[href]').evaluateAll(a=>a.map(x=>x.href));for(const href of new Set(hrefs)){expect(new URL(href).origin).toBe('http://127.0.0.1:4179');expect((await page.request.get(href)).status()).toBe(200)}}
});
