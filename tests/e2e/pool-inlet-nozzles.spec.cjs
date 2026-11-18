const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const out = path.join('.test-artifacts', 'nozzles');

for (const width of [390, 768, 1440]) test(`nozzle page loads diagrams and fits ${width}px`, async ({ page }) => {
  fs.mkdirSync(out, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  const response = await page.goto('/spravochnik/kolichestvo-forsunok.html');
  expect(response.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText('Сколько форсунок нужно для бассейна: расчёт, расположение и нормы');
  for (const [selector, desktop, mobile, stem] of [
    ['.nozzle-figure img[src*="stenovye"]', '/assets/images/forsunki-stenovye-vysota.svg', '/assets/images/forsunki-stenovye-vysota-mobile.svg', 'forsunki-stenovye-vysota'],
    ['.nozzle-figure img[src*="donnye"]', '/assets/images/forsunki-donnye-shag.svg', '/assets/images/forsunki-donnye-shag-mobile.svg', 'forsunki-donnye-shag']
  ]) {
    const image = page.locator(selector);
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect(image).toHaveJSProperty('complete', true);
    const selected = width <= 600 ? mobile : desktop;
    expect((await page.request.get(selected)).status()).toBe(200);
    await expect(image).toHaveJSProperty('currentSrc', new URL(selected, page.url()).href);
    if (width === 390 || width === 1440) await image.screenshot({ path: path.join(out, `${stem}-${width === 390 ? 'mobile' : 'desktop'}.png`) });
  }
  const state = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    imageWidths: [...document.querySelectorAll('.nozzle-figure img')].map(image => image.getBoundingClientRect().width),
    tocTargets: [...document.querySelectorAll('.nozzle-toc a[href^="#"]')].every(link => document.getElementById(link.hash.slice(1))),
    images: [...document.querySelectorAll('.nozzle-figure img')].map(image => ({ alt: image.alt, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, currentSrc: image.currentSrc }))
  }));
  expect(state.scrollWidth).toBeLessThanOrEqual(width);
  expect(state.tocTargets).toBeTruthy();
  expect(state.images.every(image => image.alt && image.naturalWidth === (width <= 600 ? 780 : 1200))).toBeTruthy();
  expect(state.images.every(image => Math.abs(image.naturalWidth / image.naturalHeight - (width <= 600 ? 780 / (image.currentSrc.includes('stenovye') ? 1420 : 1510) : (image.currentSrc.includes('stenovye') ? 1200 / 720 : 1200 / 760))) < 0.01)).toBeTruthy();
  const loadedVariants = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => new URL(entry.name).pathname).filter(url => /forsunki-(?:stenovye-vysota|donnye-shag)(?:-mobile)?\.svg$/.test(url)));
  for (const image of state.images) {
    const selected = new URL(image.currentSrc).pathname;
    const unselected = selected.endsWith('-mobile.svg') ? selected.replace('-mobile.svg', '.svg') : selected.replace('.svg', '-mobile.svg');
    expect(loadedVariants).toContain(selected);
    expect(loadedVariants).not.toContain(unselected);
  }
  await page.screenshot({ path: path.join(out, `kolichestvo-forsunok-${width}.png`), fullPage: true });
  expect(errors).toEqual([]);
});

test('both calculators compute the reference pool, respond to settings, and reject invalid inputs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/spravochnik/kolichestvo-forsunok.html');
  await expect(page.locator('#floor-area-result')).toHaveText('50');
  await expect(page.locator('#floor-volume-result')).toHaveText('75');
  await expect(page.locator('#floor-flow-result')).toHaveText('18,75');
  await expect(page.locator('#floor-count-result')).toHaveText('8');
  await expect(page.locator('#floor-grid-result')).toHaveText('4 × 2');
  await expect(page.locator('#floor-per-result')).toHaveText('2,34 м³/ч');
  await expect(page.locator('#wall-count-result')).toHaveText('7');
  await page.getByText('По расходу форсунки', { exact: true }).first().click();
  await expect(page.locator('#floor-method-note')).toContainText('пропускная способность');
  await page.fill('#floor-length', '12');
  await expect(page.locator('#floor-count-result')).not.toHaveText('8');
  await page.locator('#wall-placement').selectOption('oppositeLong');
  await expect(page.locator('#wall-layout-result')).toContainText('Две противоположные продольные стены');
  await page.locator('#wall-staggered').check();
  await expect(page.locator('#wall-layout-result')).toContainText('шахматно');
  await page.fill('#floor-length', '0');
  await expect(page.locator('#floor-error')).not.toBeEmpty();
  await expect(page.locator('#floor-results')).toBeHidden();
  await expect(page.locator('#floor-plan svg')).toHaveAttribute('aria-label', /донных/);
  await expect(page.locator('#wall-plan svg')).toHaveAttribute('aria-label', /стеновых/);
});

test('article preserves contact form, technical assignment CTA, and internal links resolve', async ({ page, request }) => {
  await page.goto('/spravochnik/kolichestvo-forsunok.html');
  await expect(page.locator('#contact form[action="https://api.alpool.ru/api/leads"]')).toHaveCount(1);
  await expect(page.locator('.contact-cta__button[href="/tehnicheskoe-zadanie/"]')).toHaveText('Заполнить ТЗ');
  const links = await page.locator('article a[href^="/"]').evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href')));
  for (const href of [...new Set(links)]) expect((await request.get(href)).status(), href).toBe(200);
  expect(await page.locator('article a[href^="http"]').count()).toBe(0);
});
