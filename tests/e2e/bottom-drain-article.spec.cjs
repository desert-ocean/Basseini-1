const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

fs.mkdirSync('.test-artifacts', { recursive: true });

test.describe('Статья о донном сливе бассейна', () => {
  for (const width of [390, 768, 1440]) {
    test(`адаптивная статья и схема при ширине ${width} px`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto('/spravochnik/donnyy-sliv-basseyna.html');
      expect(response.status()).toBe(200);
      await expect(page.locator('h1')).toContainText('Донный слив бассейна');
      await expect(page.locator('#safety')).toContainText('Два донных слива сами по себе');

      const picture = page.locator('.bottom-drain__figure picture');
      const src = await picture.locator('img').evaluate(img => img.currentSrc);
      expect(src).toContain(width === 390 ? 'donnyy-sliv-basseyna-mobile.svg' : 'donnyy-sliv-basseyna-desktop.svg');
      await expect(picture.locator('img')).toBeVisible();
      await expect(page.locator('.bottom-drain__figure figcaption')).toBeVisible();

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
      for (const link of await page.locator('.bottom-drain__toc a').all()) {
        const href = await link.getAttribute('href');
        await expect(page.locator(href)).toHaveCount(1);
      }

      await expect(page.locator('#contact form')).toHaveAttribute('action', 'https://api.alpool.ru/api/leads');
      await expect(page.getByRole('link', { name: 'Заполнить ТЗ' })).toHaveAttribute('href', '/tehnicheskoe-zadanie/');
      expect(pageErrors).toEqual([]);
      await page.screenshot({ path: `.test-artifacts/bottom-drain-${width}.png`, fullPage: true });
    });
  }
});
