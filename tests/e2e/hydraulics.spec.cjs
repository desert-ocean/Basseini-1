const {test,expect}=require('@playwright/test');
const pageUrl='/kalkulyatori/raschet-truboprovodov-basseyna.html';
test.beforeEach(async({page})=>{page.jsErrors=[];page.on('pageerror',e=>page.jsErrors.push(e.message));await page.goto(pageUrl)});
test.afterEach(async({page})=>expect(page.jsErrors||[]).toEqual([]));

for(const width of [390,768,1440])test(`hydraulics tabs, inputs, warnings and no overflow at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await expect(page.locator('#result')).toContainText('Dmin');
 await page.locator('#flow').fill('18');await page.locator('#series').selectOption('PN16');await expect(page.locator('#result')).toContainText('PN16');
 await page.locator('#limit').fill('1.1');await expect(page.locator('#result')).toContainText('Dmin');
 await page.locator('.hyd-tabs [data-mode="check"]').click();await page.locator('#flow').fill('0.42');await expect(page.locator('#result')).toContainText('Переходный режим');
 await page.locator('#flow').fill('');await expect(page.locator('#result')).toContainText('положительными');await page.locator('#flow').fill('20');
 await page.locator('.hyd-tabs [data-mode="line"]').click();await page.locator('#add-segment').click();await expect(page.locator('.segment')).toHaveCount(2);await page.locator('.segment').nth(1).locator('.dia').fill('75');await page.locator('.segment').nth(1).locator('.len').fill('30');await page.locator('.segment').nth(1).locator('.zeta').fill('2');
 await page.locator('#equipment').fill('9.80665');await page.locator('#equipment-unit').selectOption('kpa');await expect(page.locator('#result')).toContainText('м вод. ст.');await page.locator('.segment').nth(1).locator('.remove').click();await expect(page.locator('.segment')).toHaveCount(1);
 const dims=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));expect(dims.scroll).toBeLessThanOrEqual(dims.w);
});

for(const width of [390,1440])for(const [mode,label] of [['size','Подобрать диаметр'],['check','Проверить трубу'],['line','Гидравлическая линия']])test(`full-page screenshot ${mode} ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.locator(`.hyd-tabs [data-mode="${mode}"]`).click();await page.screenshot({path:`.test-artifacts/screenshots/hydraulics-${mode}-${width}.png`,fullPage:true});
});

test('consultation consent blocks request and valid payload preserves user note without duplicate calculation',async({page})=>{
 let count=0,payload;await page.route('https://api.alpool.ru/api/leads',async route=>{const method=route.request().method();if(method==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type'}});return;}count++;payload=route.request().postData();await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'{"id":"mock-lead-1"}'})});
 const form=page.locator('#consult-form');await form.locator('[name=name]').fill('Test User');await form.locator('[name=phone]').fill('+79990000000');await form.locator('[name=message]').fill('Проверить ветку у скиммера');
 await form.getByRole('button',{name:'Получить консультацию'}).click();expect(count).toBe(0);
 await form.locator('[name=personal_data_consent]').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}))});await form.locator('[name=phone]').fill('bad');expect(await form.locator('[name=phone]').evaluate(el=>el.validity.valid)).toBe(false);await form.locator('button[type=submit]').click();expect(count).toBe(0);await form.locator('[name=phone]').fill('+79990000000');await form.locator('button[type=submit]').click();await expect(page.locator('#form-status')).toHaveAttribute('role','status');expect(count).toBe(1);
 const p=JSON.parse(payload);expect(p.name).toBe('Test User');expect(p.personal_data_consent).toBe(true);expect(p.form_type).toBe('calculator-pool-hydraulics');expect(p.message).toContain('Проверить ветку у скиммера');expect(p.message).toContain('Гидравлический расчёт');expect((p.message.match(/Гидравлический расчёт/g)||[]).length).toBe(1);expect(p.message).toContain('м/с');expect(new URL(page.url()).search).toBe('');
});

test('backend error is shown and user message remains intact',async({page})=>{
 await page.route('https://api.alpool.ru/api/leads',async route=>{if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type'}});return route.fulfill({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'{"detail":"mock backend error"}'})});const form=page.locator('#consult-form');await form.locator('[name=name]').fill('Test');await form.locator('[name=phone]').fill('1234567');await form.locator('[name=message]').fill('Мой комментарий');await form.locator('[name=personal_data_consent]').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}))});await form.locator('button[type=submit]').evaluate(el=>el.click());await expect(page.locator('#form-status')).toContainText('mock backend error');await expect(page.locator('#form-status')).toHaveAttribute('role','alert');await expect(form.locator('[name=message]')).toHaveValue(/Мой комментарий/);
});

test('invalid, duplicate, excessive and decimal-comma flow parameters are ignored',async({page})=>{for(const query of ['?flow=-1','?flow=10001','?flow=3&flow=4','?flow=3%2C5']){await page.goto(pageUrl+query);await expect(page.locator('#flow')).toHaveValue('20')}});

test('filter calculator handoff passes calculated flow, remains editable and rejects malformed query',async({page})=>{
 await page.goto('/kalkulyatori/podbor-filtra-i-nasosa.html');await page.locator('#volume').fill('60');await page.locator('#turnover').fill('4');await page.locator('#rate').fill('30');await expect(page.locator('#q-circulation')).toContainText('15');const href=await page.locator('#hydraulics-link').getAttribute('href');expect(href).toContain('flow=15');await page.locator('#hydraulics-link').click();await expect(page).toHaveURL(/raschet-truboprovodov-basseyna\.html\?flow=15/);await expect(page.locator('#flow')).toHaveValue('15');await page.locator('#flow').fill('17');await expect(page.locator('#flow')).toHaveValue('17');
});

test('existing volume, filtration and heating calculators still initialize and calculate',async({page})=>{
 await page.goto('/kalkulyatori/kalkulyator-obema-basseyna.html');await page.locator('#pool-length').fill('10');await page.locator('#pool-width').fill('5');await page.locator('#pool-depth').fill('2');await expect(page.locator('#basin-volume')).toContainText('100');
 await page.goto('/kalkulyatori/podbor-filtra-i-nasosa.html');await page.locator('#volume').fill('60');await page.locator('#turnover').fill('4');await page.locator('#rate').fill('30');await expect(page.locator('#q-circulation')).toContainText('15');
 await page.goto('/kalkulyatori/raschet-nagreva-vody-basseyna.html');await page.locator('#water-volume').fill('60');await page.locator('#water-area').fill('30');await page.locator('#water-start-temp').fill('20');await page.locator('#water-target-temp').fill('28');await page.locator('#pool-location').selectOption('indoor');await page.locator('#heating-hours').fill('24');await page.locator('#heating-condition-power').selectOption('operation');await expect(page.locator('#power-energy')).not.toHaveText('—');expect(page.jsErrors).toEqual([]);
});
