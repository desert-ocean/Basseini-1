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
      await expect(page.locator('svg[role=img]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://alpool.ru/spravochnik/${name}.html`);
    }
    expect(errors).toEqual([]);
  });
}

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
