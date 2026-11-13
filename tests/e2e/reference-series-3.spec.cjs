const {test,expect}=require('@playwright/test');

const pages=[
 ['avtomaticheskaya-podpitka-basseyna','Автоматическая подпитка бассейна','Датчик уровня'],
 ['koagulyaciya-vody-basseyna','Коагуляция воды в бассейне','хлопья'],
 ['kak-rabotaet-perelivnaya-sistema','Как работает переливная система бассейна','Балансная ёмкость'],
 ['truby-pvc-u','Трубы PVC-U: размеры и проходное сечение','PN10 и PN16'],
 ['skorost-vody','Скорость воды в трубопроводах','Единого рекомендуемого значения']
];

for(const width of [390,768,1440]) test(`series 3 pages render at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 for(const [slug,title,content] of pages){
  const response=await page.goto(`/spravochnik/${slug}.html`);
  expect(response.status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText(title.split(':')[0]);
  await expect(page.locator('main svg[role="img"]')).toHaveCount(1);
  await expect(page.locator('main')).toContainText(new RegExp(content,'i'));
  expect(await page.locator('main svg text').count()).toBe(0);
  if(pages.slice(0,3).some(([newSlug])=>newSlug===slug))
   expect(parseFloat(await page.locator('.diagram-labels-readable').first().evaluate(el=>getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://alpool.ru/spravochnik/${slug}.html`);
  const outgoing=await page.locator('main a[href]').evaluateAll(a=>a.map(x=>x.href));
  expect(outgoing.every(href=>new URL(href).origin==='http://127.0.0.1:4179')).toBeTruthy();
  for(const href of new Set(outgoing)) expect((await page.request.get(href)).status()).toBe(200);
 }
});

test('PN conditions, makeup backflow protection and overflow loop are explicit',async({page})=>{
 await page.goto('/spravochnik/truby-pvc-u.html');
 await expect(page.locator('main')).toContainText('PN10 и PN16 соответствуют номинальным значениям 10 и 16 бар для воды при 20 °C');
 await page.goto('/spravochnik/avtomaticheskaya-podpitka-basseyna.html');
 await expect(page.locator('main')).toContainText('исключить обратный поток воды бассейна в сеть');
 await expect(page.locator('main')).toContainText('сам по себе такой защитой не является');
 await expect(page.locator('svg[role="img"]')).toHaveAttribute('aria-label',/воздушный разрыв/i);
 const makeupGeometry=await page.locator('svg[role="img"]').evaluate(svg=>{
  const outlet=svg.querySelector('#makeup-outlet').getBBox();
  const level=svg.querySelector('#max-water-level').getBBox();
  const overflow=svg.querySelector('#overflow-channel').getBBox();
  return {outletBottom:outlet.y+outlet.height,maxLevel:level.y,overflowLevel:overflow.y};
 });
 expect(makeupGeometry.outletBottom).toBeLessThan(makeupGeometry.maxLevel);
 expect(makeupGeometry.overflowLevel).toBe(makeupGeometry.maxLevel);
 await expect(page.locator('.diagram-labels-readable')).toContainText('Свободное падение через воздушный разрыв');
 await expect(page.locator('.diagram-labels-readable')).toContainText('Максимальный уровень задан переливом');
 await page.goto('/spravochnik/kak-rabotaet-perelivnaya-sistema.html');
 await expect(page.locator('svg[role="img"]')).toHaveAttribute('aria-label',/чаша и перелив обратно в лоток/);
 await expect(page.locator('main')).toContainText('вода из чаши снова поступает через переливной лоток');
 await page.goto('/spravochnik/skorost-vody.html');
 await expect(page.locator('h2').filter({hasText:'Всасывающая и напорная линии'})).toHaveCount(1);
});

test('new materials are searchable, categorized and listed in sitemap',async({page})=>{
 await page.goto('/spravochnik/index.html');
 const sitemap=await(await page.request.get('/sitemap.xml')).text();
 for(const [slug] of pages.slice(0,3)){
  await expect(page.locator(`#cards a[href="${slug}.html"]`)).toHaveCount(1);
  expect(sitemap).toContain(`/spravochnik/${slug}.html`);
 }
 await page.fill('#search','подпитка уровень');
 await expect(page.locator('[data-search]:visible')).toContainText('Автоматическая подпитка');
 await page.fill('#search','');
 await page.selectOption('#category','Переливные системы');
 await expect(page.locator('[data-search]:visible')).toHaveCount(1);
 await expect(page.locator('[data-search]:visible')).toContainText('переливная система');
});
