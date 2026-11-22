'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const sizes = [390, 768, 1440];
const outputDir = path.resolve('.test-artifacts/visual-review/filter-pressure-drop-guide');

test.use({ locale: 'ru-RU' });

test('filter pressure article and calculators are usable at mobile, tablet and desktop widths', async ({ page, request }) => {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsErrors = [];
  page.on('pageerror', error => jsErrors.push(error.message));

  for (const width of sizes) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/spravochnik/perepad-davleniya-na-filtre.html');
    await expect(page.locator('h1')).toContainText('Перепад давления на фильтре бассейна');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('#required-area-result')).toHaveText('1,000');
    await expect(page.locator('#group-total-area')).toHaveText('1,131');
    await expect(page.locator('#group-area-status')).toContainText('Площади хватает');
    await expect(page.locator('#wash-one-flow')).toHaveText('15,27');
    await expect(page.locator('#wash-all-flow')).toHaveText('61,07');
    await expect(page.locator('#group-one-out-rate')).toBeVisible();
    await expect(page.locator('#area-rate-figure img')).toBeVisible();
    await expect(page.locator('#pressure-baseline-figure img')).toBeVisible();
    await expect(page.locator('#pressure-baseline-figure picture source')).toHaveAttribute('srcset', /filter-pressure-clean-dirty-mobile\.svg/);
    const expectedVariant = width === 390 ? 'mobile' : 'desktop';
    for (const selector of ['#area-rate-figure img', '#pressure-baseline-figure img']) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await expect.poll(() => page.locator(selector).evaluate(image => image.currentSrc)).toContain(`-${expectedVariant}.svg`);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `horizontal page overflow at ${width}px`).toBe(false);

    const tag = `${width}px`;
    if (width === 390) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(outputDir, `page-${tag}.png`) });
      const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const maxScroll = Math.max(0, documentHeight - 900);
      const positions = [];
      for (let top = 0; top <= maxScroll; top += 840) positions.push(top);
      if (positions[positions.length - 1] !== maxScroll) positions.push(maxScroll);
      fs.writeFileSync(path.join(outputDir, 'page-390-segments.json'), JSON.stringify({ documentHeight, positions }, null, 2));
      let captureStyle;
      for (let index = 0; index < positions.length; index += 1) {
        if (index === 1) captureStyle = await page.addStyleTag({ content: '#navPanelToggle,#backToTop{visibility:hidden!important}' });
        await page.evaluate(top => window.scrollTo(0, top), positions[index]);
        await page.waitForTimeout(60);
        await page.screenshot({ path: path.join(outputDir, `page-390-segment-${String(index).padStart(2, '0')}.png`) });
      }
      if (captureStyle) await captureStyle.evaluate(node => node.remove());
    } else {
      await page.screenshot({ path: path.join(outputDir, `page-${tag}.png`), fullPage: true });
    }
    for (const [name, selector] of [
      ['area-rate', '#area-rate-figure'],
      ['clean-dirty', '#pressure-baseline-figure']
    ]) {
      const figure = page.locator(selector);
      await figure.scrollIntoViewIfNeeded();
      await figure.screenshot({ path: path.join(outputDir, `${name}-${tag}.png`) });
    }
    if (width === 390) {
      const table = page.locator('.filter-table-wrap');
      await table.screenshot({ path: path.join(outputDir, `speed-table-${tag}.png`) });
      await table.evaluate(node => { node.scrollLeft = node.scrollWidth; });
      await table.screenshot({ path: path.join(outputDir, `speed-table-${tag}-right.png`) });
      await table.evaluate(node => { node.scrollLeft = 0; });
      for (const [name, selector] of [
        ['required-area', '#calc1-title'],
        ['filter-group', '#calc2-title'],
        ['backwash-flow', '#calc3-title']
      ]) {
        await page.locator(selector).locator('..').screenshot({ path: path.join(outputDir, `${name}-${tag}.png`) });
      }
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/spravochnik/perepad-davleniya-na-filtre.html');
  await page.locator('#required-rate').fill('0');
  await expect(page.locator('#required-area-result')).toHaveText('—');
  await expect(page.locator('#required-error')).toContainText('допустимо');
  await page.locator('#required-rate').fill('30');
  await page.locator('#required-flow').fill('30,5');
  await expect(page.locator('#required-area-result')).toHaveText('1,017');
  await page.locator('#required-flow').fill('30.5');
  await expect(page.locator('#required-area-result')).toHaveText('1,017');
  await page.locator('#required-flow').fill('30');
  await page.locator('#required-rate').fill('0,5');
  await expect(page.locator('#required-area-result')).toHaveText('60,000');
  await page.locator('#required-rate').fill('0.5');
  await expect(page.locator('#required-area-result')).toHaveText('60,000');
  await page.locator('#required-rate').fill('30');
  await page.locator('#group-count').fill('1');
  await expect(page.locator('#group-one-out-note')).toBeHidden();
  await expect(page.locator('#footer form')).toBeAttached();
  await expect(page.locator('#footer a[href="/tehnicheskoe-zadanie/"]')).toBeAttached();
  await expect(page.getByRole('link', { name: 'Расчёт площади фильтрации' })).toHaveAttribute('href', '#area');

  const badAnchors = await page.locator('main a[href*="#"]').evaluateAll(nodes => nodes
    .map(node => node.getAttribute('href'))
    .filter(href => href && href.includes('#') && !document.getElementById(href.split('#')[1])));
  expect(badAnchors).toEqual([]);

  const internalLinks = await page.locator('main a[href^="/"]').evaluateAll(nodes => [...new Set(nodes
    .map(node => node.getAttribute('href').split('#')[0].split('?')[0] || '/'))]);
  const prohibitedExternalLinks = await page.locator('main a[href^="http"]').evaluateAll(nodes => nodes
    .map(node => node.href)
    .filter(href => !['publication.pravo.gov.ru', 'protect.gost.ru'].includes(new URL(href).hostname)));
  expect(prohibitedExternalLinks).toEqual([]);
  for (const href of internalLinks) {
    const response = await request.get(href);
    expect(response.ok(), `internal link ${href}`).toBeTruthy();
  }
  await expect(await request.get('/tehnicheskoe-zadanie/')).toBeOK();

  for (const file of [
    'filter-area-rate-desktop.svg', 'filter-area-rate-mobile.svg',
    'filter-pressure-clean-dirty-desktop.svg', 'filter-pressure-clean-dirty-mobile.svg'
  ]) {
    const response = await request.get(`/assets/images/${file}`);
    expect(response.ok(), `${file} responds successfully`).toBeTruthy();
  }
  expect(jsErrors).toEqual([]);
});
