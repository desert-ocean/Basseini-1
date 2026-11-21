const { test, expect } = require('@playwright/test');

test.describe('Статья о подборе циркуляционного насоса', () => {
  for (const width of [390, 768, 1440]) {
    test(`содержание и адаптивность при ширине ${width} px`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto('/spravochnik/podbor-cirkulyacionnogo-nasosa.html');

      expect(response.status()).toBe(200);
      await expect(page.locator('h1')).toHaveText('Как подобрать циркуляционный насос бассейна: расход, напор и гидравлические потери');
      await expect(page.locator('#rated-flow')).toContainText('25 м³/ч');
      await expect(page.locator('#flow-losses')).toContainText('2 × (20 / 10)² = 8 м');
      await expect(page.locator('#example')).toContainText('20 м³/ч');
      await expect(page.locator('.pump-guide__table tbody tr')).toHaveCount(7);
      await expect(page.locator('#working-point svg')).toBeVisible();

      for (const link of await page.locator('.pump-guide__toc a').all()) {
        const href = await link.getAttribute('href');
        await expect(page.locator(href)).toHaveCount(1);
      }

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
      await expect(page.locator('#contact form')).toHaveAttribute('action', 'https://api.alpool.ru/api/leads');
      await expect(page.locator('a[href="/tehnicheskoe-zadanie/"]')).toHaveCount(1);
      expect(errors).toEqual([]);
      await page.screenshot({ path: `.test-artifacts/pump-selection-article-${width}.png`, fullPage: true });
    });
  }
});
