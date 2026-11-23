const { test, expect } = require('@playwright/test');
const { allowedGovernmentDocuments, allowedAlpoolContacts } = require('../../scripts/external-link-policy.cjs');

test.describe('Электробезопасность бассейна', () => {
  for (const width of [390, 768, 1440]) {
    test('нормы, схемы и контактные элементы при ' + width + 'px', async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.goto('/spravochnik/elektrobezopasnost-basseyna.html');
      await expect(page).toHaveTitle('Электробезопасность бассейна: зоны и защиты — ALPOOL');
      await expect(page.locator('h1')).toContainText('УЗО 30 мА, заземление и уравнивание потенциалов');
      await expect(page.locator('#rcd')).toContainText('не безопасный ток через человека');
      await expect(page.locator('#rcd')).toContainText('гладкий постоянный дифференциальный ток');
      await expect(page.locator('#equipment')).toContainText('702.55.104.2');
      await expect(page.locator('#equipment')).toContainText('2 м выше границы нижележащей зоны 1');
      await expect(page.locator('#bonding')).toContainText('обычно не включают');
      await expect(page.locator('#corrosion')).toContainText('Отсутствие защитного соединения само по себе не доказывает');
      await expect(page.locator('#norms')).toContainText('ГОСТ Р 50571.5.54-2024');
      await expect(page.locator('.electrical-toc a[href="#norms"]')).toBeVisible();
      await page.locator('.electrical-toc a[href="#norms"]').click();
      await expect(page).toHaveURL(/#norms$/);

      const diagramNames = ['uzo', 'equipotential', 'technical-room', 'touch-voltage'];
      for (const name of diagramNames) {
        const image = page.locator('picture img[src*="elektrobezopasnost-basseyna-' + name + '-desktop.svg"]');
        await expect(image).toHaveCount(1);
        await expect(image).toBeVisible();
        const naturalWidth = await image.evaluate(node => node.naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
        const selected = await image.evaluate(node => node.currentSrc);
        expect(selected).toContain(width <= 600 ? name + '-mobile.svg' : name + '-desktop.svg');
        if (name === 'touch-voltage') await expect(image).toHaveAttribute('alt', /защитного аппарата, PE и уравнивания потенциалов/);
      }

      await expect(page.locator('.electrical-table')).toHaveCount(5);
      const tableFits = await page.locator('.table-scroll').evaluateAll(nodes =>
        nodes.every(node => node.scrollWidth >= node.clientWidth && node.clientWidth <= window.innerWidth)
      );
      expect(tableFits).toBe(true);
      const noOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      );
      expect(noOverflow).toBe(true);

      await expect(page.locator('#footer form')).toBeAttached();
      await expect(page.locator('#footer input[type="checkbox"]')).toBeAttached();
      await expect(page.locator('#footer label[for="unified-alpool-personal-data-consent-home"]')).toBeVisible();
      await expect(page.locator('#footer a[href^="tel:"]')).toBeVisible();
      await expect(page.locator('#footer a[href^="mailto:"]')).toBeVisible();
      await expect(page.locator('#footer a[href*="tehnicheskoe-zadanie"]')).toBeVisible();
      await expect(page.locator('a[href="https://wa.me/79856446654"]')).toHaveCount(1);
      await expect(page.locator('a[href="https://t.me/desertocean"]')).toHaveCount(1);
      const outbound = await page.locator('a[href^="https://"]').evaluateAll(links => links.map(link => link.href));
      expect(outbound.every(href => allowedGovernmentDocuments.has(href) || allowedAlpoolContacts.has(href))).toBe(true);
      expect(pageErrors).toEqual([]);
    });
  }
});
