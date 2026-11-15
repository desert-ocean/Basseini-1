const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

test('loss calculator uses the shared hydraulic core and marks unknown inputs incomplete', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/spravochnik/gidravlicheskie-poteri.html');
  await expect(page.locator('h1')).toHaveText('Гидравлические потери в трубопроводах');
  await expect(page.locator('#loss-reference-body tr')).toHaveCount(5);
  await expect(page.locator('#loss-warning')).toContainText('не введены потери на фильтре');
  await expect(page.locator('#loss-total')).toHaveText('—');
  await expect(page.locator('#loss-head')).toHaveText('—');

  const image = page.locator('#hydraulic-loss-calculator .loss-figure img');
  await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0)).toBe(true);
  const equipmentFields = page.locator('[data-equipment-row] input[type="text"]');
  await expect(equipmentFields).toHaveCount(5);
  for (let index = 0; index < 5; index += 1) await expect(equipmentFields.nth(index)).toBeHidden();
  const initial = await page.evaluate(() => {
    const selected = PoolHydraulicsCore.catalogs.PN10.find(item => item.od === Number(document.querySelector('#loss-diameter').value));
    const diameter = selected.id;
    const flow = 1.5 * Math.PI * (diameter / 1000) ** 2 / 4 * 3600;
    return PoolHydraulicsCore.pipe({ flow, diameter, length: 20 });
  });
  await expect(page.locator('#loss-straight')).toHaveText(`${initial.hf.toLocaleString('ru-RU', { maximumFractionDigits: 4 })} м`);
  await expect(page.locator('#loss-equivalent-length')).toHaveText('20 м');

  await page.fill('#loss-filter-input', '1,2');
  const direct = await page.locator('#loss-straight').textContent();
  await page.locator('#loss-elbows').fill('1');
  await page.locator('#loss-tee').fill('2');
  await page.locator('#loss-shutoff').fill('1');
  await page.locator('#loss-check-valves').fill('1');
  await expect(page.locator('#loss-equivalent-length')).toHaveText('70 м');
  const expectedFit = await page.evaluate(() => {
    const selected = PoolHydraulicsCore.catalogs.PN10.find(item => item.od === Number(document.querySelector('#loss-diameter').value));
    const diameter = selected.id;
    const flow = 1.5 * Math.PI * (diameter / 1000) ** 2 / 4 * 3600;
    return PoolHydraulicsCore.pipe({ flow, diameter, length: 50 });
  });
  await expect(page.locator('#loss-fitting')).toHaveText(`${expectedFit.hf.toLocaleString('ru-RU', { maximumFractionDigits: 4 })} м`);
  await expect(page.locator('#loss-total')).not.toHaveText('—');
  expect(direct).not.toBe(await page.locator('#loss-total').textContent());

  const equipmentCheck = page.locator('[data-equipment][value="heat-exchanger"]');
  await page.locator('label[for="loss-equipment-heat-exchanger"]').click();
  await expect(equipmentCheck).toBeChecked();
  await expect(page.locator('[data-equipment-row="heat-exchanger"] input[type="text"]')).toBeVisible();
  await expect(page.locator('#loss-warning')).toContainText('не введены паспортные потери: теплообменник');
  await expect(page.locator('#loss-total')).toHaveText('—');
  await page.locator('[data-equipment-row="heat-exchanger"] input[type="text"]').fill('0,4');
  await page.locator('label[for="loss-equipment-uv"]').click();
  await page.locator('[data-equipment-row="uv"] input[type="text"]').fill('0,2');
  await page.locator('label[for="loss-equipment-water-meter"]').click();
  await page.locator('[data-equipment-row="water-meter"] input[type="text"]').fill('0,1');
  await page.locator('label[for="loss-equipment-flow-meter"]').click();
  await page.locator('[data-equipment-row="flow-meter"] input[type="text"]').fill('0,15');
  await page.locator('label[for="loss-equipment-chiller"]').click();
  await page.locator('[data-equipment-row="chiller"] input[type="text"]').fill('0,5');
  await expect(page.locator('#loss-equipment')).toHaveText('1,35 м');

  await page.selectOption('#loss-pool-type', 'overflow');
  await expect(page.locator('#loss-overflow-controls')).toBeVisible();
  await page.fill('#loss-static-input', '0,6');
  await page.locator('#loss-static-confirm').check();
  await page.selectOption('#loss-static-mode', 'plus');
  const total = Number((await page.locator('#loss-total').textContent()).replace(' м', '').replace(',', '.'));
  await expect(page.locator('#loss-head')).toHaveText(`${(total + 0.6).toLocaleString('ru-RU', { maximumFractionDigits: 4 })} м`);
  await page.selectOption('#loss-static-mode', 'minus');
  await expect(page.locator('#loss-head')).toHaveText(`${(total - 0.6).toLocaleString('ru-RU', { maximumFractionDigits: 4 })} м`);
  await page.selectOption('#loss-pool-type', 'skimmer');
  await expect(page.locator('#loss-overflow-controls')).toBeHidden();

  await page.selectOption('#loss-diameter-mode', 'custom');
  await page.fill('#loss-custom-diameter', '40');
  await expect(page.locator('#loss-diameter-result')).toHaveText('40 мм');
  await page.fill('#loss-speed', '-1');
  await expect(page.locator('#loss-equivalent-length')).toHaveText('—');
  await expect(page.locator('#loss-total')).toHaveText('—');
  expect(errors).toEqual([]);
});

test('loss article remains responsive and does not add outbound user links', async ({ page }) => {
  const outDir = path.join('.test-artifacts', 'hydraulic-loss');
  fs.mkdirSync(outDir, { recursive: true });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/spravochnik/gidravlicheskie-poteri.html');
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(metrics.document, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(metrics.viewport);
    await expect(page.locator('#contact form[action="https://api.alpool.ru/api/leads"]')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Заполнить ТЗ' })).toHaveCount(1);
    await expect(page.locator('#hydraulic-loss-calculator a[href^="http"]')).toHaveCount(0);
    await page.screenshot({ path: path.join(outDir, `hydraulic-loss-${width}.png`), fullPage: true });
  }
});
