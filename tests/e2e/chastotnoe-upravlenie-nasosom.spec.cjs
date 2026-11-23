const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = '/spravochnik/chastotnoe-upravlenie-nasosom.html';
const widths = [390, 768, 1440];
test('статья о частотном управлении: адаптивность, схемы, навигация и CTA', async ({ page, browserName, baseURL }) => {
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(error.message));
  const artifactDir = path.resolve('.test-artifacts/visual-review/pump-vfd');
  fs.mkdirSync(artifactDir, { recursive: true });

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(pagePath);
    await expect(page.locator('h1')).toHaveText('Частотное управление насосом бассейна');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://alpool.ru/spravochnik/chastotnoe-upravlenie-nasosom.html');
    await expect(page.locator('#contact form')).toBeVisible();
    await expect(page.locator('.contact-cta__button')).toBeVisible();
    await expect(page.locator('.vfd-toc a')).toHaveCount(8);
    expect(await page.locator('.vfd-toc a').evaluateAll(links => links.every(link => document.getElementById(decodeURIComponent(link.hash.slice(1)))))).toBe(true);
    await expect(page.locator('table tbody tr')).toHaveCount(7);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    for (let i = 0; i < 4; i += 1) {
      const figure = page.locator('.vfd-figure').nth(i);
      const image = figure.locator('img');
      await figure.scrollIntoViewIfNeeded();
      await expect(image).toBeVisible();
      expect(await image.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
      expect(await image.evaluate((img, version) => new URL(img.currentSrc).pathname.endsWith(`-${version}.svg`), width <= 800 ? 'mobile' : 'desktop')).toBe(true);
      await expect(image).toHaveAttribute('alt', /.+/);
      const source = figure.locator('source');
      await expect(source).toHaveAttribute('media', '(max-width: 800px)');
      await page.screenshot({ path: path.join(artifactDir, `full-${width}.png`), fullPage: true });
      await image.screenshot({ path: path.join(artifactDir, `diagram-${i + 1}-${width}.png`) });
    }

    const fixedControls = await page.locator('body *').evaluateAll(nodes => nodes.filter(node => {
      const style = getComputedStyle(node);
      return style.position === 'fixed' && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
    }).map(node => ({ tag: node.tagName, text: (node.textContent || '').trim().slice(0, 32), rect: node.getBoundingClientRect().toJSON() })));
    for (const control of fixedControls.filter(item => item.text.toLowerCase() === 'menu')) {
      const importantRects = await page.locator('.vfd-figure img').evaluateAll(images => images.map(img => img.getBoundingClientRect().toJSON()));
      for (const rect of importantRects) {
        if (rect.bottom <= 0 || rect.top >= 900) continue;
        const overlapX = Math.max(0, Math.min(rect.right, control.rect.right) - Math.max(rect.left, control.rect.left));
        const overlapY = Math.max(0, Math.min(rect.bottom, control.rect.bottom) - Math.max(rect.top, control.rect.top));
        if (overlapX * overlapY > 0) {
          // On tablet the shared fixed Menu can touch only the blank top-right SVG margin.
          expect(Math.min(rect.bottom, control.rect.bottom) - rect.top, `Menu covers diagram content at ${width}px`).toBeLessThanOrEqual(24);
        }
      }
    }
  }
  // Link targets are viewport-independent; request them once after checking all layouts.
  const hrefs = await page.locator('main a[href^="/"]').evaluateAll(links => [...new Set(links.map(link => link.getAttribute('href')).filter(href => href && !href.startsWith('#')))]);
  await expect(page.locator('main a[href^="http"]')).toHaveCount(0);
  const linkResponses = [];
  for (const href of hrefs) {
    linkResponses.push({ href, response: await page.request.get(new URL(href, baseURL).toString()) });
  }
  for (const { href, response } of linkResponses) expect(response.status(), `broken internal link ${href}`).toBeLessThan(400);
  expect(browserName).toBe('chromium');
  expect(consoleErrors).toEqual([]);
});
