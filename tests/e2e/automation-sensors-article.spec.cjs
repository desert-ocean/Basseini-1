const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

fs.mkdirSync('.test-artifacts', { recursive: true });

test.describe('Статья о датчиках и автоматике бассейна', () => {
  for (const width of [390, 768, 1440]) {
    test(`содержание и адаптивность при ширине ${width} px`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto('/spravochnik/avtomatika-basseyna-datchiki-i-blokirovki.html');

      expect(response.status()).toBe(200);
      await expect(page.locator('h1')).toHaveText('Датчики и автоматика бассейна: управление и защитные блокировки');
      await expect(page.locator('#level')).toContainText('Гидростатические датчики');
      await expect(page.locator('#flow')).toContainText('Насос может работать при закрытой задвижке');
      await expect(page.locator('#pressure')).toContainText('Перепад рассчитывают как разность');
      await expect(page.locator('#water-quality')).toContainText('ОВП не является прямым измерением концентрации свободного хлора');
      await expect(page.locator('#interlocks table tbody tr')).toHaveCount(6);

      for (const link of await page.locator('.automation-guide__toc a').all()) {
        const href = await link.getAttribute('href');
        await expect(page.locator(href)).toHaveCount(1);
      }
      await expect(page.locator('.automation-guide__diagram svg')).toBeVisible();
      if (width <= 980) {
        await page.locator('#navPanelToggle').click();
        await expect(page.locator('body')).toHaveClass(/is-navPanel-visible/);
        await expect(page.locator('#navPanel')).toBeVisible();
        await page.locator('#navPanel .close').click();
        await expect(page.locator('body')).not.toHaveClass(/is-navPanel-visible/);
        await page.waitForTimeout(350);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
      await expect(page.locator('#contact form')).toHaveAttribute('action', 'https://api.alpool.ru/api/leads');
      await expect(page.getByRole('link', { name: 'Заполнить ТЗ' })).toHaveAttribute('href', '/tehnicheskoe-zadanie/');
      expect(errors).toEqual([]);
      await page.screenshot({ path: `.test-artifacts/automation-sensors-${width}.png`, fullPage: true });
    });
  }
});
