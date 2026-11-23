const {test,expect}=require('@playwright/test');
const {allowedGovernmentDocuments,allowedAlpoolContacts}=require('../../scripts/external-link-policy.cjs');
const pages=['svobodnyy-i-svyazannyy-hlor','shchelochnost-vody','donnyy-sliv-basseyna','kolichestvo-forsunok','cirkulyaciya-vody-v-chashe'];
for(const width of [390,768,1440])test(`series 2 renders on ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const name of pages){const r=await page.goto('/spravochnik/'+name+'.html');expect(r.status()).toBe(200);await expect(page.locator('h1')).toBeVisible();const images=page.locator('main picture img');const diagrams=page.locator('main svg[role=img]');expect(await images.count()+await diagrams.count(),`${name} has a diagram`).toBeGreaterThan(0);for(let i=0;i<await images.count();i++){const image=images.nth(i);await image.scrollIntoViewIfNeeded();await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(node=>node.naturalWidth)).toBeGreaterThan(0)}if(await diagrams.count())await expect(diagrams.first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://alpool.ru/spravochnik/'+name+'.html')}
 expect(errors).toEqual([]);
});
test('inlet count handles unequal division, decimals, invalid and extreme inputs',async({page})=>{
 await page.goto('/spravochnik/kolichestvo-forsunok.html');
 await expect(page.locator('#floor-count-result')).toHaveText('8');
 await page.locator('#floor-turnover').fill('3.5');
 await expect(page.locator('#floor-flow-result')).toHaveText('21,43');
 await expect(page.locator('#floor-count-result')).not.toHaveText('—');
 await page.locator('#floor-length').fill('0');
 await expect(page.locator('#floor-error')).not.toBeEmpty();
 await expect(page.locator('#floor-results')).toBeHidden();
 await page.locator('#wall-placement').selectOption('oppositeLong');
 await expect(page.locator('#wall-layout-result')).toContainText('Две противоположные продольные стены');
 await page.locator('#wall-length').fill('0');
 await expect(page.locator('#wall-error')).not.toBeEmpty();
 await expect(page.locator('#wall-results')).toBeHidden();
});
test('catalog categories, links, sitemap and no external navigation',async({page})=>{
 await page.goto('/spravochnik/index.html');await page.fill('#search','связанный хлор');await expect(page.locator('[data-search]:visible')).toHaveCount(1);
 await page.fill('#search','');await page.selectOption('#category','Закладные элементы');await expect(page.locator('[data-search]:visible')).toHaveCount(3);
 const xml=await(await page.request.get('/sitemap.xml')).text();
 for(const name of pages){expect(xml).toContain('/spravochnik/'+name+'.html');await page.goto('/spravochnik/'+name+'.html');const links=await page.locator('a[href]').evaluateAll(as=>as.map(a=>a.href));for(const href of links){const target=new URL(href);if(target.protocol==='tel:'||target.protocol==='mailto:')continue;if(target.origin!=='http://127.0.0.1:4179'){expect(allowedAlpoolContacts.has(target.href)||allowedGovernmentDocuments.has(target.href),`${name}: ${href}`).toBe(true);continue;}expect((await page.request.get(href)).status()).toBe(200)}}
});
