const { test, expect } = require('@playwright/test');

const pages = ['perevod-rashoda', 'mestnye-soprotivleniya', 'napor-nasosa', 'vodoobmen-basseyna', 'obratnaya-promyvka-filtra'];

for (const width of [390, 768, 1440]) {
  test(`new references on ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const name of pages) {
      const response = await page.goto(`/spravochnik/${name}.html`);
      expect(response.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      if (name === 'vodoobmen-basseyna') await expect(page.locator('.water-turnover-scheme img')).toBeVisible();
      else await expect(page.locator('svg[role=img]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://alpool.ru/spravochnik/${name}.html`);
    }
    expect(errors).toEqual([]);
  });
}

test('turnover calculator uses shared core, validates inputs and keeps the universal SVG responsive', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/spravochnik/vodoobmen-basseyna.html');
  expect(await page.title()).toBe('Что такое время водообмена бассейна — ALPOOL');
  await expect(page.locator('h1')).toHaveText('Что такое время водообмена бассейна');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://alpool.ru/spravochnik/vodoobmen-basseyna.html');
  await expect(page.locator('#turnover-volume')).toHaveValue('48');
  await expect(page.locator('#turnover-time')).toHaveValue('6');
  await expect(page.locator('#circulation-flow-result')).toHaveText('8');
  await expect(page.locator('#turnover-recommendation')).toContainText('не менее 8 м³/ч');
  await expect(page.locator('.water-turnover-scheme img')).toHaveAttribute('src', '/assets/images/vodoobmen-universal.svg');
  await expect(page.locator('.water-turnover-scheme img')).toHaveJSProperty('complete', true);
  await expect(page.locator('.water-turnover-standards tbody tr')).toHaveCount(21);
  await expect(page.locator('.water-turnover-standards tbody')).toContainText('0,2 × Qгорки');
  await expect(page.locator('.water-turnover-standards tbody')).toContainText('35 м³/ч на одну горку');
  await expect(page.locator('body')).toContainText('не более 6 часов');
  await expect(page.locator('body')).toContainText('не обязательное требование ГОСТ');
  await expect(page.locator('.water-turnover-calculator a[href="/spravochnik/gidravlicheskie-poteri.html"]')).toHaveText('Рассчитать гидравлические потери для подбора насоса');
  await expect(page.locator('#contact form[action*=leads]')).toHaveCount(1);
  await expect(page.locator('#footer a[href="/tehnicheskoe-zadanie/"]')).toHaveCount(1);

  for (const [volume, hours, flow] of [['24','6','4'],['36','6','6'],['48','6','8'],['60','6','10'],['90','6','15'],['48','4','12']]) {
    await page.locator('#turnover-volume').fill(volume);
    await page.locator('#turnover-time').fill(hours);
    const expected = await page.evaluate(([v,t]) => FilterPumpCore.circulationFlow(Number(v),Number(t)), [volume,hours]);
    await expect(page.locator('#circulation-flow-result')).toHaveText(flow);
    expect(Number((await page.locator('#circulation-flow-result').innerText()).replace(',','.'))).toBe(expected);
    await expect(page.locator('#turnover-recommendation')).toContainText(`не менее ${flow} м³/ч`);
  }

  await page.locator('#turnover-volume').fill('32,5');
  await page.locator('#turnover-time').fill('2.5');
  await expect(page.locator('#circulation-flow-result')).toHaveText('13');
  await expect(page.evaluate(() => document.activeElement.id)).resolves.toBe('turnover-time');
  for (const invalid of ['', '0', '-1', 'Infinity', 'not a number', '1e309']) {
    await page.locator('#turnover-time').fill(invalid);
    await expect(page.locator('#turnover-error')).not.toBeEmpty();
    await expect(page.locator('#circulation-flow-result')).toHaveText('—');
  }
  await page.locator('#turnover-volume').fill('0');
  await page.locator('#turnover-time').fill('6');
  await expect(page.locator('#turnover-error')).not.toBeEmpty();
  await expect(page.locator('#circulation-flow-result')).toHaveText('—');

  const outDir = require('node:path').join('.test-artifacts', 'vodoobmen');
  require('node:fs').mkdirSync(outDir, { recursive: true });
  for (const width of [390,768,1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/spravochnik/vodoobmen-basseyna.html');
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.evaluate(() => {
      const img = document.querySelector('.water-turnover-scheme img');
      const rect = img.getBoundingClientRect();
      return { viewport: innerWidth, document: document.documentElement.scrollWidth, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, renderedWidth: rect.width, renderedHeight: rect.height };
    });
    expect(geometry.document, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.naturalWidth).toBeGreaterThan(0);
    expect(geometry.renderedWidth / geometry.renderedHeight).toBeCloseTo(geometry.naturalWidth / geometry.naturalHeight, 2);
    if ([390, 768, 1440].includes(width)) await page.screenshot({ path: require('node:path').join(outDir, `vodoobmen-${width}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('three flow-unit fields convert bidirectionally and validate input', async ({ page }) => {
  await page.goto('/spravochnik/perevod-rashoda.html');
  await expect(page.locator('#flow-m3h')).toHaveValue('12');
  await expect(page.locator('#flow-lmin')).toHaveValue('200');
  await expect(page.locator('#flow-ls')).toHaveValue('3,3333');

  await page.fill('#flow-m3h', '12');
  await expect(page.locator('#flow-lmin')).toHaveValue('200');
  await expect(page.locator('#flow-ls')).toHaveValue('3,3333');
  await expect(page.evaluate(() => document.activeElement.id)).resolves.toBe('flow-m3h');

  await page.fill('#flow-lmin', '60');
  await expect(page.locator('#flow-m3h')).toHaveValue('3,6');
  await expect(page.locator('#flow-ls')).toHaveValue('1');
  await page.fill('#flow-ls', '3.6');
  await expect(page.locator('#flow-m3h')).toHaveValue('12,96');
  await expect(page.locator('#flow-lmin')).toHaveValue('216');

  await page.fill('#flow-m3h', '12,5');
  await expect(page.locator('#flow-lmin')).toHaveValue('208,3333');
  await expect(page.locator('#flow-ls')).toHaveValue('3,4722');
  await page.fill('#flow-lmin', '0.5');
  await expect(page.locator('#flow-m3h')).toHaveValue('0,03');
  await expect(page.locator('#flow-ls')).toHaveValue('0,0083');

  await page.fill('#flow-ls', '0');
  await expect(page.locator('#flow-m3h')).toHaveValue('0');
  await expect(page.locator('#flow-lmin')).toHaveValue('0');
  await page.fill('#flow-m3h', '1000000000000');
  await expect(page.locator('#flow-lmin')).not.toHaveValue('');
  await expect(page.locator('#flow-lmin')).not.toHaveValue(/Infinity|NaN/);
  await page.fill('#flow-m3h', '');
  await expect(page.locator('#flow-convert-error')).not.toBeEmpty();
  await expect(page.locator('#flow-lmin')).toHaveValue('');
  await page.fill('#flow-ls', '-1');
  await expect(page.locator('#flow-convert-error')).not.toBeEmpty();
  await page.fill('#flow-ls', 'not a number');
  await expect(page.locator('#flow-convert-error')).not.toBeEmpty();
  await page.fill('#flow-ls', '1e308');
  await expect(page.locator('#flow-convert-error')).not.toBeEmpty();
  await expect(page.locator('#flow-m3h')).toHaveValue('');

  await expect(page.locator('#contact form[action*=leads]')).toHaveCount(1);
  await expect(page.getByText('Заполнить ТЗ', { exact: true })).toHaveCount(1);
});

test('conversion article keeps internal links, search and sitemap integration', async ({ page }) => {
  await page.goto('/spravochnik/perevod-rashoda.html');
  await expect(page.locator('h1')).toHaveText('Как перевести м³/ч в л/с');
  await expect(page.locator('.flow-conversion-table tbody tr')).toHaveCount(6);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://alpool.ru/spravochnik/perevod-rashoda.html');
  await page.goto('/spravochnik/index.html');
  await page.fill('#search', 'перевод расхода');
  await expect(page.locator('#cards a[href="perevod-rashoda.html"]')).toBeVisible();
  const sitemap = await (await page.request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/spravochnik/perevod-rashoda.html');
});
