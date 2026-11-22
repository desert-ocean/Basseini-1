'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const outputDir = path.resolve('.test-artifacts/visual-review/parallel-filters');
const widths = [390, 768, 1440];

test('parallel filter article explains operation and renders responsive diagrams', async ({ page, request }) => {
  fs.mkdirSync(outputDir, { recursive: true });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/spravochnik/parallelnaya-rabota-filtrov.html');
    await expect(page.locator('h1')).toContainText('Параллельная работа фильтров бассейна');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://alpool.ru/spravochnik/parallelnaya-rabota-filtrov.html');
    await expect(page.locator('main .article-toc, main nav[aria-label="Оглавление"]')).toHaveCount(1);
    await expect(page.locator('#principle')).toBeVisible();
    await expect(page.locator('#advantages')).toBeVisible();
    await expect(page.locator('#service')).toBeVisible();
    await expect(page.locator('#limits')).toBeVisible();

    const variant = width <= 800 ? 'mobile' : 'desktop';
    for (const [figureId, file] of [
      ['comparison-figure', `parallel-filters-comparison-${variant}.svg`],
      ['service-figure', `parallel-filters-service-${variant}.svg`]
    ]) {
      const figure = page.locator(`#${figureId}`);
      const image = figure.locator('img');
      await expect(image).toBeVisible();
      await figure.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(node => node.currentSrc)).toContain(file);
      await expect(image).toHaveAttribute('alt', /.+/);
      for (const control of ['#navPanelToggle', '#backToTop']) {
        const button = page.locator(control);
        if (await button.isVisible()) {
          const imageBox = await image.boundingBox();
          const buttonBox = await button.boundingBox();
          const overlaps = imageBox && buttonBox && imageBox.x < buttonBox.x + buttonBox.width
            && imageBox.x + imageBox.width > buttonBox.x
            && imageBox.y < buttonBox.y + buttonBox.height
            && imageBox.y + imageBox.height > buttonBox.y;
          expect(overlaps, `${control} overlaps ${figureId} at ${width}px`).toBe(false);
        }
      }
      await image.screenshot({ path: path.join(outputDir, `${figureId}-${width}px.png`) });
    }

    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasOverflow, `horizontal overflow at ${width}px`).toBe(false);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(outputDir, `page-${width}px.png`), fullPage: true });
  }

  await page.locator('nav[aria-label="Оглавление"] a[href="#service"]').click();
  await expect(page).toHaveURL(/#service$/);

  const badAnchors = await page.locator('main a[href^="#"]').evaluateAll(nodes => nodes
    .map(node => node.getAttribute('href').slice(1))
    .filter(id => !document.getElementById(id)));
  expect(badAnchors).toEqual([]);

  const external = await page.locator('main a[href^="http"]').evaluateAll(nodes => nodes.map(node => node.href));
  expect(external).toEqual([]);

  const internalPaths = await page.locator('main a[href^="/"]').evaluateAll(nodes => [...new Set(nodes
    .map(node => node.getAttribute('href').split('#')[0].split('?')[0]))]);
  for (const href of internalPaths) {
    const response = await request.get(href);
    expect(response.ok(), `internal link ${href}`).toBeTruthy();
  }

  for (const file of [
    'parallel-filters-comparison-desktop.svg', 'parallel-filters-comparison-mobile.svg',
    'parallel-filters-service-desktop.svg', 'parallel-filters-service-mobile.svg'
  ]) {
    await expect(await request.get(`/assets/images/${file}`)).toBeOK();
  }
  await expect(page.locator('#footer form')).toBeAttached();
  await expect(page.locator('#footer a[href="/tehnicheskoe-zadanie/"]')).toBeAttached();
  expect(pageErrors).toEqual([]);
});