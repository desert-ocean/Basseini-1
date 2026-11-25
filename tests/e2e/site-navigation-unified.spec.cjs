const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { test, expect } = require('@playwright/test');

const menuItems = [
  { label: 'Услуги', href: '/#services' },
  { label: 'Почему мы', href: '/#why-us' },
  { label: 'Портфолио', href: '/#portfolio' },
  { label: 'Статьи', href: '/blog/blog.html' },
  { label: 'Справочник', href: '/spravochnik/' },
  { label: 'Контакты', href: '/#contact' }
];
const contactLinks = ['tel:+74956446654', 'https://wa.me/79856446654', 'https://t.me/desertocean'];
const routes = [
  '/servis/stroitelstvo-basseynov.html',
  '/napravleniya/premium-resheniya.html',
  '/blog/blog.html',
  '/articles/filtratsiya-vody-v-basseyne.html',
  '/articles/gidroizolyaciya-basseyna-protechek.html',
  '/404.html',
  '/privacy.html',
  '/consent.html',
  '/tehnicheskoe-zadanie/',
  '/generic.html',
  '/elements.html'
];

function expectedActive(route) {
  if (route.startsWith('/servis/') || route.startsWith('/napravleniya/')) return 'Услуги';
  if (route.startsWith('/articles/') || route === '/blog/blog.html') return 'Статьи';
  return null;
}

for (const width of [390, 768, 1440]) {
  test(`all public pages use the shared six-item navigation at ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.route('**/*', route => {
      const requestUrl = new URL(route.request().url());
      return requestUrl.hostname === '127.0.0.1' ? route.continue() : route.abort();
    });
    await page.setViewportSize({ width, height: 844 });
    const audit = execFileSync(process.execPath, ['scripts/sync-site-navigation.cjs'], { encoding: 'utf8' });
    expect(audit).toContain('Checked 62 public pages; changed 0.');
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), route).toBe(200);
      const nav = page.locator('#nav');
      await expect(nav, route).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);

      if (width < 981) {
        const toggle = page.locator('#navPanelToggle');
        await expect(toggle, route).toHaveCount(1);
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        const panel = page.locator('#navPanel');
        await expect(panel).toHaveAttribute('aria-hidden', 'false');
        await expect(panel.locator('.links > li')).toHaveCount(6);
        expect(await panel.locator('.icons > li > a').evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href'))), route).toEqual(contactLinks);
        const mobileItems = await panel.locator('.links > li > a').evaluateAll(anchors => anchors.map(anchor => ({
          label: anchor.textContent.trim(),
          href: anchor.getAttribute('href')
        })));
        expect(mobileItems, route).toEqual(menuItems);
        const activeItems = await panel.locator('.links > li.active > a').allTextContents();
        expect(activeItems, route).toEqual(expectedActive(route) ? [expectedActive(route)] : []);
        await page.keyboard.press('Escape');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(panel).toHaveAttribute('aria-hidden', 'true');
      } else {
        await expect(nav.locator('.links > li'), route).toHaveCount(6);
        await expect(page.locator('#navPanelToggle')).toBeHidden();
        await expect(nav).toBeVisible();
        const actualItems = await nav.locator('.links > li > a').evaluateAll(anchors => anchors.map(anchor => ({
          label: anchor.textContent.trim(),
          href: anchor.getAttribute('href')
        })));
        expect(actualItems, route).toEqual(menuItems);
        expect(await nav.locator('.icons > li > a').evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href'))), route).toEqual(contactLinks);
        const activeItems = await nav.locator('.links > li.active > a').allTextContents();
        expect(activeItems, route).toEqual(expectedActive(route) ? [expectedActive(route)] : []);
        const yPositions = await nav.locator('.links > li').evaluateAll(items => items.map(item => item.getBoundingClientRect().top));
        expect(Math.max(...yPositions) - Math.min(...yPositions), route).toBeLessThanOrEqual(1);
      }
    }

    expect(pageErrors, 'uncaught JavaScript errors while visiting routes').toEqual([]);
  });
}

test('complex pages remain within 320px and retain the standard navigation', async ({ page }) => {
  for (const route of ['/blog/blog.html', '/articles/gidroizolyaciya-basseyna-protechek.html', '/servis/stroitelstvo-basseynov.html', '/tehnicheskoe-zadanie/']) {
    await page.setViewportSize({ width: 320, height: 760 });
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), route).toBe(200);
    await expect(page.locator('#nav'), route).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
  }
});

test('shared navigation screenshots for desktop and mobile', async ({ page }, testInfo) => {
  await page.route('**/*', route => {
    const requestUrl = new URL(route.request().url());
    return requestUrl.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/blog/blog.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toHaveClass(/is-preload/);
    if (width < 981) {
      await page.locator('#navPanelToggle').click();
      await expect(page.locator('#navPanel')).toHaveAttribute('aria-hidden', 'false');
      await page.waitForTimeout(600);
      await page.locator('#navPanel').screenshot({ path: testInfo.outputPath(`site-navigation-${width}.png`) });
    } else {
      await expect(page.locator('#nav')).toBeVisible();
      await page.locator('#nav').screenshot({ path: testInfo.outputPath(`site-navigation-${width}.png`) });
    }
  }
});
