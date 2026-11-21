const { test, expect } = require('@playwright/test');

test.describe('Обеззараживание воды бассейна', () => {
  for (const width of [390, 768, 1440]) {
    test(`содержание, нормативные заметки и адаптивность при ширине ${width} px`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto('/spravochnik/obezzarazhivanie-vody-basseyna.html');

      expect(response.status()).toBe(200);
      await expect(page.locator('h1')).toHaveText('Обеззараживание воды бассейна: хлор, озон, УФ и комбинированные системы');
      await expect(page.locator('#regulation')).toContainText('0,3–0,5 мг/л');
      await expect(page.locator('#regulation')).toContainText('0,1–0,3 мг/л');
      await expect(page.locator('#regulation')).toContainText('1 сентября 2026 года');
      await expect(page.locator('#regulation')).toContainText('значения строки 1230 относятся к питьевой воде');
      await expect(page.locator('#regulation')).not.toContainText(/0,8.?1,2|1,2 мг\/л/);
      await expect(page.locator('#combinations')).toContainText('AOP');
      await expect(page.locator('#combinations')).toContainText('Обычная комбинированная обработка');
      await expect(page.locator('#combinations')).toContainText('Специальная O₃/UV AOP');
      await expect(page.locator('.compatibility-table tbody tr')).toHaveCount(10);
      await expect(page.locator('.method-table tbody tr')).toHaveCount(7);
      await expect(page.locator('#sources a[href="https://02.rospotrebnadzor.ru/upload/iblock/749/td3cen07sl6tt5sp3z9kpc09onwb10br/SP_2.1.4284_26.pdf"]')).toHaveCount(1);
      await expect(page.locator('a[href^="https://"]')).toHaveCount(1);
      await expect(page.locator('#contact form')).toHaveAttribute('action', 'https://api.alpool.ru/api/leads');
      await expect(page.locator('a[href="/tehnicheskoe-zadanie/"]')).toHaveCount(1);

      for (const link of await page.locator('.disinfection-toc a').all()) {
        await expect(page.locator(await link.getAttribute('href'))).toHaveCount(1);
      }

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
      await expect(page.locator('.guide-figure img').first()).toBeVisible();
      await expect(page.locator('.guide-figure img').nth(1)).toBeVisible();
      for (const img of await page.locator('.guide-figure img').all()) {
        await img.scrollIntoViewIfNeeded();
        await expect.poll(() => img.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
      }
      const layout = await page.evaluate(() => ({
        currentImages: [...document.querySelectorAll('.guide-figure img')].map(img => ({src: img.currentSrc, width: img.naturalWidth, complete: img.complete})),
        methodTableScrollable: document.querySelector('.method-table').scrollWidth > document.querySelector('.method-table').parentElement.clientWidth
      }));
      expect(layout.currentImages.map(img => img.src.split('/').pop())).toEqual([
        width <= 600 ? 'obezzarazhivanie-funkcii-mobile.svg' : 'obezzarazhivanie-funkcii-desktop.svg',
        width <= 900 ? 'obezzarazhivanie-ozon-uf-mobile.svg' : 'obezzarazhivanie-ozon-uf-desktop.svg'
      ]);
      if (width === 390) expect(layout.methodTableScrollable).toBe(true);
      for (const link of await page.locator('main a[href^="/"]').all()) {
        const href = await link.getAttribute('href');
        const check = await page.request.get(new URL(href, page.url()).href);
        expect(check.status(), href).toBe(200);
      }
      expect(errors).toEqual([]);
      await page.screenshot({ path: `.test-artifacts/disinfection-water-treatment-${width}.png`, fullPage: true });
    });
  }
});
