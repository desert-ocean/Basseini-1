const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

test('loss calculator gets flow, speed and both PVC-U series from the shared core', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/spravochnik/gidravlicheskie-poteri.html');
  await expect(page.locator('h1')).toHaveText('Гидравлические потери в трубопроводах');
  await expect(page.locator('#loss-warning')).toContainText('не введены потери на фильтре');
  await expect(page.locator('#loss-total')).toHaveText('—');
  await expect(page.locator('#loss-head')).toHaveText('—');
  await expect(page.locator('#loss-diameter option[value="PN10:32"]')).toHaveCount(1);
  await expect(page.locator('#loss-diameter option[value="PN16:63"]')).toHaveCount(1);
  const catalogueCounts = await page.evaluate(() => ({
    pn10: PoolHydraulicsCore.catalogs.PN10.length,
    pn16: PoolHydraulicsCore.catalogs.PN16.length,
    options: document.querySelectorAll('#loss-diameter option').length
  }));
  expect(catalogueCounts.options).toBe(catalogueCounts.pn10 + catalogueCounts.pn16);

  const image = page.locator('#hydraulic-loss-calculator .loss-figure img');
  await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0)).toBe(true);
  const initial = await page.evaluate(() => {
    const [series, rawOd] = document.querySelector('#loss-diameter').value.split(':');
    const selected = PoolHydraulicsCore.catalogs[series].find(item => item.od === Number(rawOd));
    const flow = Number(document.querySelector('#loss-flow').value.replace(',', '.'));
    return PoolHydraulicsCore.pipe({ flow, diameter: selected.id, length: 20 });
  });
  await expect(page.locator('#loss-speed-result')).toHaveText(initial.velocity.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  await expect(page.locator('#loss-straight')).toHaveText(`${initial.hf.toLocaleString('ru-RU', { maximumFractionDigits: 4 })} м`);
  await expect(page.locator('#loss-equivalent-length')).toHaveText('20 м');

  await page.fill('#loss-flow', '4,2');
  const changedFlow = await page.evaluate(() => {
    const [series, rawOd] = document.querySelector('#loss-diameter').value.split(':');
    const selected = PoolHydraulicsCore.catalogs[series].find(item => item.od === Number(rawOd));
    return PoolHydraulicsCore.pipe({ flow: 4.2, diameter: selected.id, length: 20 });
  });
  await expect(page.locator('#loss-speed-result')).toHaveText(changedFlow.velocity.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  await page.selectOption('#loss-diameter', 'PN16:63');
  const changedDiameter = await page.evaluate(() => {
    const selected = PoolHydraulicsCore.catalogs.PN16.find(item => item.od === 63);
    return PoolHydraulicsCore.pipe({ flow: 4.2, diameter: selected.id, length: 20 });
  });
  await expect(page.locator('#loss-speed-result')).toHaveText(changedDiameter.velocity.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  await expect(page.locator('#loss-diameter-result')).toContainText('внутренний 53,6 мм');

  await page.fill('#loss-filter-input', '1,2');
  const direct = await page.locator('#loss-straight').textContent();
  await page.locator('#loss-elbows').fill('1');
  await page.locator('#loss-tee').fill('2');
  await page.locator('#loss-shutoff').fill('1');
  await page.locator('#loss-check-valves').fill('1');
  await expect(page.locator('#loss-equivalent-length')).toHaveText('70 м');
  const expectedFit = await page.evaluate(() => {
    const selected = PoolHydraulicsCore.catalogs.PN16.find(item => item.od === 63);
    return PoolHydraulicsCore.pipe({ flow: 4.2, diameter: selected.id, length: 50 });
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
  await page.locator('label[for="loss-equipment-meter"]').click();
  await page.locator('[data-equipment-row="meter"] input[type="text"]').fill('0,1');
  await page.locator('label[for="loss-equipment-chiller"]').click();
  await page.locator('[data-equipment-row="chiller"] input[type="text"]').fill('0,5');
  await expect(page.locator('[data-equipment][value="meter"]')).toHaveCount(1);
  await expect(page.locator('#loss-equipment')).toHaveText('1,2 м');

  await page.selectOption('#loss-pool-type', 'overflow');
  await expect(page.locator('#loss-overflow-controls')).toBeVisible();
  await page.fill('#loss-static-input', '0,6');
  await page.locator('label:has(#loss-static-confirm)').click();
  await expect(page.locator('#loss-static-confirm')).toBeChecked();
  await page.selectOption('#loss-static-mode', 'plus');
  const total = Number((await page.locator('#loss-total').textContent()).replace(' м', '').replace(',', '.'));
  await expect(page.locator('#loss-head')).toHaveText(`${(total + 0.6).toLocaleString('ru-RU', { maximumFractionDigits: 4 })} м`);
  await page.selectOption('#loss-static-mode', 'minus');
  await expect(page.locator('#loss-head')).toHaveText(`${(total - 0.6).toLocaleString('ru-RU', { maximumFractionDigits: 4 })} м`);
  await page.selectOption('#loss-pool-type', 'skimmer');
  await expect(page.locator('#loss-overflow-controls')).toBeHidden();

  await page.fill('#loss-flow', '-1');
  await expect(page.locator('#loss-speed-result')).toHaveText('—');
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
    for (const image of await page.locator('.loss-diagram img, .loss-nomogram img, .loss-figure img').all()) {
      await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0)).toBe(true);
    }
    const metrics = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(metrics.document, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(metrics.viewport);
    await expect(page.locator('#contact form[action="https://api.alpool.ru/api/leads"]')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Заполнить ТЗ' })).toHaveCount(1);
    await expect(page.locator('#hydraulic-loss-calculator a[href^="http"]')).toHaveCount(0);
    await page.screenshot({ path: path.join(outDir, `hydraulic-loss-${width}.png`), fullPage: true });
  }
});
