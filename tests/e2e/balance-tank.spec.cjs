const { test, expect } = require('@playwright/test');

test('balance tank guide, calculator modes, level diagram and responsive illustrations', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/spravochnik/raschet-balansnoy-emkosti.html');
  await expect(page).toHaveTitle(/Расчёт балансного бака бассейна/);
  await expect(page.locator('h1')).toContainText('Расчёт балансной ёмкости');
  await expect(page.locator('form[action="https://api.alpool.ru/api/leads"]')).toBeAttached();
  await expect(page.locator('a.contact-cta__button[href="/tehnicheskoe-zadanie/"]')).toBeAttached();
  const staticImage = page.locator('.balance-figure img');
  await expect(staticImage).toBeVisible();
  expect(await staticImage.evaluate(image => image.currentSrc)).toContain('raschet-balansnoy-emkosti-mobile.svg');
  await staticImage.screenshot({ path: '.test-artifacts/balance-tank-mobile-illustration.png' });

  const simple = page.locator('[data-balance-panel="simple"]');
  await expect(simple.locator('[data-result="simpleArea"]')).toContainText('32');
  await expect(simple.locator('[data-result="simplePoolVolume"]')).toContainText('48');
  await expect(simple.locator('[data-result="simpleDisplacement"]')).toContainText('0,6');
  await expect(simple.locator('[data-result="simpleWaves"]')).toContainText('1,92');
  await expect(simple.locator('[data-result="simpleTotal"]')).toContainText('2,52');
  await simple.locator('[data-field="simpleBackwashFromTank"]').check();
  await simple.locator('[data-field="simpleBackwashM3"]').fill('2,4');
  await expect(simple.locator('[data-result="simpleTotal"]')).toContainText('4,92');
  await simple.locator('[data-field="lengthM"]').fill('0');
  await expect(simple.locator('[data-simple-error]')).toBeVisible();
  await expect(simple.locator('[data-result="simpleTotal"]')).toHaveText('—');
  await simple.locator('[data-field="lengthM"]').fill('8');
  await expect(simple.locator('[data-simple-error]')).toBeHidden();

  await page.locator('[data-balance-mode="engineering"]').click();
  const engineering = page.locator('[data-balance-panel="engineering"]');
  await expect(engineering.locator('[data-result="geometric"]')).toContainText('12');
  await expect(engineering.locator('[data-result="bottomZone"]')).toContainText('0,9');
  await expect(engineering.locator('[data-result="topZone"]')).toContainText('0,9');
  await expect(engineering.locator('[data-result="operatingRange"]')).toContainText('8,4');
  await expect(engineering.locator('[data-status]')).toContainText('проходят заданные проверки');
  const diagram = engineering.locator('[data-tank-diagram]');
  await expect(diagram.locator('[data-diagram-upper-zone]')).toHaveText('Верхняя зона: 150 мм');
  await expect(diagram.locator('[data-diagram-lower-zone]')).toHaveText('Нижняя зона: 150 мм');
  await expect(diagram.locator('[data-diagram-water]')).toContainText('6 м³');
  await expect(diagram.locator('[data-diagram-free]')).toContainText('4,2 м³');
  await expect(engineering.locator('[data-diagram-summary]')).toContainText('Нижняя конструктивная зона — 150 мм');
  const initialY = await diagram.locator('[data-diagram-level="normal"]').getAttribute('y1');
  await engineering.locator('[data-field="normalLevelMm"]').fill('1100');
  const changedY = await diagram.locator('[data-diagram-level="normal"]').getAttribute('y1');
  expect(Number(changedY)).toBeLessThan(Number(initialY));
  await engineering.locator('[data-field="tankHeightM"]').fill('0,2');
  await expect(engineering.locator('[data-error]')).toBeVisible();
  await expect(diagram).toBeHidden();
  await engineering.locator('[data-field="tankHeightM"]').fill('2');
  await expect(engineering.locator('[data-error]')).toBeHidden();
  await engineering.locator('[data-field="backwashFromTank"]').check();
  await expect(engineering.locator('[data-backwash-fields]')).toBeVisible();
  await engineering.locator('[data-field="filterAreaMode"]').selectOption('area');
  await expect(engineering.locator('[data-filter-area]')).toBeVisible();
  await engineering.locator('[data-field="filterAreaPerFilterM2"]').fill('0,5');
  await engineering.locator('[data-field="backwashIntensityLsM2"]').fill('12');
  await engineering.locator('[data-field="backwashDurationMinutes"]').fill('5');
  await expect(engineering.locator('[data-result="backwash"]')).toContainText('1,8');
  await engineering.screenshot({ path: '.test-artifacts/balance-tank-calculator-390.png' });

  await page.locator('.toc a[href="#calculator"]').click();
  await expect(page).toHaveURL(/#calculator$/);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    const layout = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(layout.document, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport);
    await page.screenshot({ path: `.test-artifacts/balance-tank-viewport-${width}.png` });
    const expected = width <= 600 ? 'raschet-balansnoy-emkosti-mobile.svg' : 'raschet-balansnoy-emkosti-desktop.svg';
    expect(await staticImage.evaluate(image => image.currentSrc)).toContain(expected);
    if (width === 1440) await staticImage.screenshot({ path: '.test-artifacts/balance-tank-desktop-illustration.png' });
    await page.screenshot({ path: `.test-artifacts/balance-tank-${width}.png`, fullPage: true });
  }
  expect(pageErrors).toEqual([]);
});
