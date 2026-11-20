const { test, expect } = require('@playwright/test');

test('circulation in the pool bowl guide is responsive and internally consistent', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/spravochnik/cirkulyaciya-vody-v-chashe.html');
  await expect(page.locator('h1')).toContainText('Циркуляция воды в чаше бассейна');
  await expect(page.locator('.bowl-circulation__toc a')).toHaveCount(8);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
    expect(layout.page <= layout.viewport, JSON.stringify(layout)).toBeTruthy();
    const img = page.locator('.bowl-circulation__figure img');
    await img.evaluate(element => element.loading = 'eager');
    await img.scrollIntoViewIfNeeded();
    await expect(img).toBeVisible();
    const src = await img.evaluate(element => element.currentSrc);
    expect(src).toContain(width <= 900 ? 'cirkulyaciya-vody-v-chashe-mobile.svg' : 'cirkulyaciya-vody-v-chashe-desktop.svg');
    await page.screenshot({ path: `.test-artifacts/pool-bowl-circulation-${width}.png` });
  }
  for (const link of await page.locator('.bowl-circulation a[href^="/spravochnik/"]').all()) {
    const href = await link.getAttribute('href');
    const response = await page.request.get(href);
    expect(response.status(), href).toBe(200);
  }
  expect(errors).toEqual([]);
});
