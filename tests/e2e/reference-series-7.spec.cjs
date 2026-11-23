'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { allowedGovernmentDocuments } = require('../../scripts/external-link-policy.cjs');

const slugs = [
  'chastotnoe-upravlenie-nasosom',
  'parallelnaya-rabota-filtrov',
  'perepad-davleniya-na-filtre',
  'teploobmennik-basseyna'
];

for (const slug of slugs) {
  test(`${slug} responsive diagrams and links`, async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/spravochnik/${slug}.html`);
      await page.evaluate(() => document.fonts.ready);

      const diagramImage = page.locator('.reference-article-content figure img').first();
      if (await diagramImage.count()) {
        await diagramImage.scrollIntoViewIfNeeded();
        await expect.poll(() => diagramImage.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
        await expect(diagramImage).toBeVisible();
      } else {
        const diagram = page.locator('.reference-article-content figure svg[role="img"]').first();
        expect(await diagram.count(), `${slug}: expected an accessible inline diagram`).toBeGreaterThan(0);
        await diagram.scrollIntoViewIfNeeded();
        await expect(diagram).toBeVisible();
      }
      await expect(page.locator('.reference-article-content figcaption').first()).toBeVisible();

      for (const image of await page.locator('.reference-article-content figure img').all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
      }

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const screenshot = path.join(process.cwd(), '.test-artifacts', 'series-7', `${slug}-${width}.png`);
      fs.mkdirSync(path.dirname(screenshot), { recursive: true });
      await page.screenshot({ path: screenshot, fullPage: true });
    }

    for (const href of await page.locator('main a[href^="/"]').evaluateAll(links => links.map(link => link.getAttribute('href')))) {
      expect((await page.request.get(href)).ok(), href).toBe(true);
    }

    const articleOutbound = await page.locator('.reference-article-content a[href^="http"], .reference-article-content a[href^="//"]')
      .evaluateAll(links => links.map(link => link.href));
    expect(articleOutbound.every(href => allowedGovernmentDocuments.has(href))).toBe(true);
  });
}

test('new references are searchable and in sitemap', async ({ page }) => {
  await page.goto('/spravochnik/index.html');
  const sitemap = await (await page.request.get('/sitemap.xml')).text();

  for (const slug of slugs) {
    const titleLink = page.locator(`#cards h2 a[href="${slug}.html"]`);
    await expect(titleLink).toHaveCount(1);
    const title = await titleLink.innerText();
    await page.fill('#search', title);
    await expect(titleLink, title).toBeVisible();
    await expect(page.locator('#cards article:visible')).toHaveCount(1);
    expect(sitemap).toContain(`/spravochnik/${slug}.html`);
  }
});
