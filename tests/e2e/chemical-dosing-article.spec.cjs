const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

fs.mkdirSync('.test-artifacts', { recursive: true });

test.describe('Автоматическое дозирование реагентов в бассейне', () => {
  for (const width of [390, 768, 1440]) {
    test(`содержание, защита и адаптивность при ширине ${width} px`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto('/spravochnik/avtomaticheskoe-dozirovanie-reagentov.html');

      expect(response.status()).toBe(200);
      await expect(page).toHaveTitle('Автоматическое дозирование реагентов в бассейне — датчики, нормы и защита | ALPOOL');
      await expect(page.locator('h1')).toHaveText('Автоматическое дозирование реагентов в бассейне: как работает станция и как она защищает от передозировки');
      await expect(page.locator('#parameters')).toContainText('ОВП не заменяет анализ свободного хлора');
      await expect(page.locator('#parameters')).toContainText('Электропроводность зависит от всех подвижных ионов');
      await expect(page.locator('#norms')).toContainText('0,3–0,5 мг/л');
      await expect(page.locator('#norms')).toContainText('0,1–0,3 мг/л');
      await expect(page.locator('#norms')).toContainText('7,2–7,6');
      await expect(page.locator('#norms')).toContainText('перед началом работы бассейна и далее каждые четыре часа');
      await expect(page.locator('#norms')).toContainText('переходное правило');
      await expect(page.locator('#norms')).toContainText('не переносится на бромирование');
      await expect(page.locator('.dosing-table:not(.dosing-protection-table) tbody tr')).toHaveCount(6);
      await expect(page.locator('.dosing-protection-table tbody tr')).toHaveCount(7);
      await expect(page.locator('#scheme .dosing-flow span')).toHaveCount(5);
      await expect(page.locator('#scheme picture source')).toHaveAttribute('srcset', '/assets/images/avtomaticheskoe-dozirovanie-reagentov-mobile.svg');

      const image = page.locator('.dosing-figure img');
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
      const imageInfo = await image.evaluate(el => ({ src: el.currentSrc, width: el.naturalWidth }));
      expect(imageInfo.src.split('/').pop()).toBe(width <= 600 ? 'avtomaticheskoe-dozirovanie-reagentov-mobile.svg' : 'avtomaticheskoe-dozirovanie-reagentov-desktop.svg');
      expect(imageInfo.width).toBeGreaterThan(0);

      for (const link of await page.locator('.dosing-toc a').all()) {
        const href = await link.getAttribute('href');
        await expect(page.locator(href)).toHaveCount(1);
      }
      await expect(page.locator('#sources a[href^="https://"]')).toHaveCount(4);
      await page.locator('.dosing-toc a[href="#norms"]').click();
      await expect(page).toHaveURL(/#norms$/);
      await expect(page.locator('#contact form')).toHaveAttribute('action', 'https://api.alpool.ru/api/leads');
      await expect(page.locator('#contact form input[type=submit]')).toBeVisible();
      await expect(page.locator('#contact input[name=phone]')).toBeVisible();
      await expect(page.locator('#contact input[name=email]')).toBeVisible();
      await expect(page.locator('#contact input[name=personal_data_consent]')).toBeAttached();
      await expect(page.locator('#contact label[for=unified-alpool-personal-data-consent-home]')).toBeVisible();
      await expect(page.locator('#footer a[href^="tel:"]')).toBeVisible();
      await expect(page.locator('#footer a[href^="mailto:"]')).toBeVisible();
      await expect(page.locator('a[href="/tehnicheskoe-zadanie/"]').last()).toBeVisible();

      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        tableWidth: document.querySelector('.dosing-table-wrap').scrollWidth,
        viewportWidth: window.innerWidth,
        formVisible: Boolean(document.querySelector('#contact form'))
      }));
      expect(layout.overflow).toBe(false);
      expect(layout.formVisible).toBe(true);
      if (width <= 900) expect(layout.tableWidth).toBeLessThanOrEqual(layout.viewportWidth);

      const internalHrefs = [...new Set(await page.locator('main a[href^="/"]').evaluateAll(links => links.map(link => link.getAttribute('href'))))];
      const internalResponses = await Promise.all(internalHrefs.map(href => page.request.get(new URL(href, page.url()).href)));
      for (let index = 0; index < internalResponses.length; index++) expect(internalResponses[index].status(), internalHrefs[index]).toBe(200);
      expect(errors).toEqual([]);
      await page.screenshot({ path: `.test-artifacts/chemical-dosing-${width}.png`, fullPage: true });
    });
  }
});
