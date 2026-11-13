const {test,expect}=require('@playwright/test');
test('search accepts inflection, order and technical abbreviations',async({page})=>{
 await page.goto('/spravochnik/index.html');
 for(const q of ['воды скорость','скорости воды','PVC-U PN10','DN','OD','ID']){await page.fill('#search',q);await expect(page.locator('[data-search]:visible').first(),q).toBeVisible()}
 await expect(page.locator('#category option')).toHaveCount(4);
});
test('geometry remains when flow is invalid and actual ID uses core',async({page})=>{
 for(const f of ['truby-pvc-u','skorost-vody']){await page.goto('/spravochnik/'+f+'.html');const area=await page.locator('#area').textContent();for(const value of ['0','-1','abc','']){await page.fill('#flow',value);await expect(page.locator('#area')).toHaveText(area);await expect(page.locator('#velocity')).toHaveText('—');await expect(page.locator('#flow-error')).not.toBeEmpty()}await page.selectOption('#pipe-mode','actual');await page.fill('#custom-id','50,0');await page.fill('#flow','20');await expect(page.locator('#id')).toHaveText('50');await expect(page.locator('#velocity')).toHaveText('2,83');await page.fill('#custom-id','0');await expect(page.locator('#id-error')).not.toBeEmpty()}
});
test('source bibliography and no outgoing links in reference',async({page})=>{
 for(const f of ['index','truby-pvc-u','skorost-vody','gidravlicheskie-poteri']){await page.goto('/spravochnik/'+f+'.html');expect(await page.locator('a[href^="http"],a[href^="//"]').count()).toBe(0)}
 await page.goto('/spravochnik/truby-pvc-u.html');await expect(page.locator('body')).toContainText('Price List 2026');await expect(page.locator('body')).toContainText('PIPEV2103206L');
});
