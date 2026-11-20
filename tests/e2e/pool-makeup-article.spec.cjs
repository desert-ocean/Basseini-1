const { test, expect } = require('@playwright/test');

test('автоматическая подпитка: статья и калькулятор', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/spravochnik/avtomaticheskaya-podpitka-basseyna.html');
  await expect(page.locator('h1')).toContainText('Автоматическая подпитка бассейна');
  await expect(page.locator('#makeup-time-result')).toHaveText('3 ч');
  await expect(page.locator('#makeup-flow-result')).toContainText('8,33');
  await expect(page.locator('#makeup-share-result')).toContainText('2,5');
  await expect(page.locator('form[action="https://api.alpool.ru/api/leads"]')).toBeAttached();
  await expect(page.locator('a.contact-cta__button[href="/tehnicheskoe-zadanie/"]')).toBeAttached();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
    expect(layout.page <= layout.viewport, JSON.stringify(layout)).toBeTruthy();
    const image = page.locator('.makeup-figure').first().locator('img');
    await expect(image).toBeVisible();
    expect(await image.evaluate(img => img.currentSrc)).toContain(width <= 900 ? 'avtomaticheskaya-podpitka-basseyna-mobile.svg' : 'avtomaticheskaya-podpitka-basseyna-desktop.svg');
    await image.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.test-artifacts/pool-makeup-${width}.png` });
    const technologies = page.locator('.makeup-figure').nth(1).locator('img');
    await technologies.scrollIntoViewIfNeeded();
    await expect(technologies).toBeVisible();
    expect(await technologies.evaluate(img => img.currentSrc)).toContain(width <= 900 ? 'podpitka-sposoby-kontrolya-urovnya-mobile.svg' : 'podpitka-sposoby-kontrolya-urovnya-desktop.svg');
    await page.screenshot({ path: `.test-artifacts/pool-makeup-sensors-${width}.png` });
  }
  await page.locator('#makeup-volume').fill('0');
  await expect(page.locator('#makeup-time-result')).toHaveText('0 ч');
  await page.locator('#makeup-flow').fill('0');
  await expect(page.locator('#makeup-flow-error')).toBeVisible();
  await expect(page.locator('#makeup-flow-error')).toContainText('больше нуля');
  await page.locator('#makeup-flow').fill('0,5');
  await expect(page.locator('#makeup-calculator-error')).toBeHidden();
  await expect(page.locator('#makeup-time-result')).toHaveText('0 ч');
  await page.locator('#makeup-volume').fill('1,5');
  await expect(page.locator('#makeup-time-result')).toHaveText('3 ч');
  await page.locator('#makeup-volume').fill('-1');
  await expect(page.locator('#makeup-volume-error')).toContainText('объём воды');
  await page.locator('#makeup-volume').fill('');
  await expect(page.locator('#makeup-volume-error')).toContainText('объём воды');
  expect(errors).toEqual([]);
});
