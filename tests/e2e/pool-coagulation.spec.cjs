const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const output = path.join('.test-artifacts', 'coagulation');
const pagePath = '/spravochnik/koagulyaciya-vody-basseyna.html';

for (const width of [390, 768, 1440]) {
  test(`coagulation article is responsive and loads the right SVG at ${width}px`, async ({ page, request }) => {
    fs.mkdirSync(output, { recursive: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(pagePath);
    expect(response.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Коагуляция воды в бассейне: дозировка и точка впрыска');

    const image = page.locator('.coagulation-figure img');
    await expect(image).toBeVisible();
    await expect(image).toHaveJSProperty('complete', true);
    const selected = width <= 600
      ? '/assets/images/koagulyaciya-vody-basseyna-mobile.svg'
      : '/assets/images/koagulyaciya-vody-basseyna-desktop.svg';
    expect((await request.get(selected)).status()).toBe(200);
    await expect(image).toHaveJSProperty('currentSrc', new URL(selected, page.url()).href);
    const dimensions = await image.evaluate(element => ({
      width: element.naturalWidth,
      height: element.naturalHeight,
      alt: element.alt
    }));
    expect(dimensions.width).toBe(width <= 600 ? 440 : 1280);
    expect(dimensions.height).toBe(width <= 600 ? 1320 : 760);
    expect(dimensions.alt.length).toBeGreaterThan(20);

    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      tocWorks: [...document.querySelectorAll('.coagulation-toc a[href^="#"]')]
        .every(link => document.getElementById(link.hash.slice(1)))
    }));
    expect(layout.document).toBeLessThanOrEqual(width);
    expect(layout.tocWorks).toBeTruthy();
    expect(errors).toEqual([]);

    if (width === 390) await image.screenshot({ path: path.join(output, 'coagulation-svg-mobile.png') });
    if (width === 1440) await image.screenshot({ path: path.join(output, 'coagulation-svg-desktop.png') });
    await page.screenshot({ path: path.join(output, `koagulyaciya-${width}.png`), fullPage: true });
  });
}

test('calculator computes both modes and validates inputs', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(pagePath);

  await expect(page.locator('[data-coag-status]').first()).toContainText('Паспортная дозировка');
  await page.getByRole('button', { name: 'Показать условный пример' }).first().click();
  await expect(page.locator('[data-pump-mlh]')).toHaveText('7,5 мл/ч');
  await expect(page.locator('[data-pump-lh]')).toHaveText('0,0075 л/ч');
  await expect(page.locator('[data-daily-ml]')).toHaveText('90 мл/сут');
  await expect(page.locator('[data-daily-l]')).toHaveText('0,09 л/сут');
  await expect(page.locator('[data-turnover]')).toHaveText('4 ч');

  await page.getByRole('button', { name: 'Разовая обработка' }).click();
  await page.getByRole('button', { name: 'Показать условный пример' }).click();
  await expect(page.locator('[data-single-ml]')).toHaveText('400 мл');
  await expect(page.locator('[data-single-l]')).toHaveText('0,4 л');
  await page.fill('#coag-single-dose', '-1');
  await expect(page.locator('[data-coag-status]').last()).toContainText('проверьте введённое значение');

  await expect(page.locator('#contact form[action="https://api.alpool.ru/api/leads"]')).toHaveCount(1);
  await expect(page.locator('.contact-cta__button[href="/tehnicheskoe-zadanie/"]')).toHaveText('Заполнить ТЗ');
  expect(await page.locator('#coagulation-article a[href^="http"]').count()).toBe(0);
  expect(errors).toEqual([]);
});
