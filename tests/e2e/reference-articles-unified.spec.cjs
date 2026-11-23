const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const articles = [
  'avariynye-situacii-i-zashchity-basseyna','avtomaticheskaya-podpitka-basseyna','avtomaticheskoe-dozirovanie-reagentov','avtomatika-basseyna-datchiki-i-blokirovki','chastotnoe-upravlenie-nasosom','cirkulyaciya-vody-v-chashe','donnyy-sliv-basseyna','elektrobezopasnost-basseyna','gidravlicheskie-poteri','kak-rabotaet-perelivnaya-sistema','kalkulyator-obema-basseyna','koagulyaciya-vody-basseyna','kolichestvo-forsunok','mestnye-soprotivleniya','napor-nasosa','obezzarazhivanie-vody-basseyna','obratnaya-promyvka-filtra','parallelnaya-rabota-filtrov','perepad-davleniya-na-filtre','perevod-rashoda','podbor-cirkulyacionnogo-nasosa','raschet-balansnoy-emkosti','shchelochnost-vody','skorost-vody','svobodnyy-i-svyazannyy-hlor','teploobmennik-basseyna','truby-pvc-u','ventilyaciya-krytogo-basseyna','vodoobmen-basseyna'
];
for (const slug of articles) test(`shared article shell, responsive layout, and contact preserved: ${slug}`, async ({ page }) => {
  const jsErrors=[]; page.on('pageerror',e=>jsErrors.push(e.message));
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(`/spravochnik/${slug}.html`);
    await expect(page.locator('body.reference-article-page')).toHaveCount(1);
    for (const selector of ['#wrapper','#header','#nav','#main','#footer','#contact form','#footer a[href="/tehnicheskoe-zadanie/"]','.reference-article-content','h1','head > title','link[rel="canonical"]']) await expect(page.locator(selector)).toHaveCount(1);
    await expect(page.locator('.links li.active a')).toHaveAttribute('href','/spravochnik/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://alpool.ru/spravochnik/'+slug+'.html');
    const shell=await page.evaluate(()=>{const w=document.querySelector('#wrapper');return ['#header','#nav','#main','#footer'].every(s=>w.contains(document.querySelector(s)))});expect(shell,slug+' shared shell containment').toBeTruthy();
    await expect(page.locator('.top-nav,.brand')).toHaveCount(0);
    const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
    expect(dimensions.scroll,`${slug} has horizontal page overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport+1);
    const css=await page.evaluate(()=>[...document.styleSheets].map(x=>x.href).filter(Boolean));
    expect(css.some(x=>x.endsWith('/assets/css/main.css'))).toBeTruthy();
    expect(css.some(x=>x.endsWith('/spravochnik/reference-article.css'))).toBeTruthy();
  }
  expect(jsErrors,`${slug} JavaScript errors`).toEqual([]);
});

test('shared geometry aligns with catalog and mobile navigation is singular', async ({ page }) => {
  const rects=async()=>page.evaluate(()=>Object.fromEntries(['#header','#nav','#main','#footer'].map(sel=>{const el=document.querySelector(sel);const r=el.getBoundingClientRect();return [sel,{left:r.left,right:r.right}]})));
  for(const width of [390,768,1440]){
    await page.setViewportSize({width,height:900});await page.goto('/spravochnik/');const catalog=await rects();
    for(const slug of ['napor-nasosa','teploobmennik-basseyna','kalkulyator-obema-basseyna']){
      await page.goto(`/spravochnik/${slug}.html`);const article=await rects();
      for(const sel of ['#header','#nav','#main','#footer']){
        expect(Math.abs(article[sel].left-catalog[sel].left),`${slug} ${sel} left edge at ${width}px`).toBeLessThanOrEqual(1);
        expect(Math.abs(article[sel].right-catalog[sel].right),`${slug} ${sel} right edge at ${width}px`).toBeLessThanOrEqual(1);
      }
    }
  }
  await page.setViewportSize({width:390,height:844});await page.goto('/spravochnik/napor-nasosa.html');
  await expect(page.locator('#navPanelToggle')).toHaveCount(1);await expect(page.locator('#navPanel')).toHaveCount(1);
  await page.locator('#navPanelToggle').click();await expect(page.locator('body')).toHaveClass(/is-navPanel-visible/);await expect(page.locator('#navPanel')).toHaveAttribute('aria-hidden','false');
  await page.locator('#navPanel .close').click();await expect(page.locator('body')).not.toHaveClass(/is-navPanel-visible/);await expect(page.locator('#navPanel')).toHaveAttribute('aria-hidden','true');
});
test('capture full-page review screenshots for the three pilot article types', async ({ page }) => {
  test.setTimeout(120000);
  const directory=path.join(process.cwd(),'.test-artifacts','reference-articles-unified');fs.mkdirSync(directory,{recursive:true});
  const samples=[['napor-nasosa','pump-selection'],['perepad-davleniya-na-filtre','filter-table-svg'],['teploobmennik-basseyna','interactive-calculator']];
  for(const width of [390,768,1440])for(const [slug,label] of samples){
    await page.setViewportSize({width,height:900});
    await page.goto(`/spravochnik/${slug}.html`);
    await page.waitForTimeout(2000);
    await page.screenshot({path:path.join(directory,`${width}-${label}-viewport.png`),animations:'disabled'});
    await page.screenshot({path:path.join(directory,`${width}-${label}-full.png`),fullPage:true,animations:'disabled'});
  }
});
