const { test, expect } = require('@playwright/test');

const volumeUrl = '/spravochnik/kalkulyator-obema-basseyna.html';

for (const width of [390, 768, 1440]) {
	test(`moved volume calculator works without overflow at ${width}px`, async ({ page }) => {
		const errors = [];
		page.on('pageerror', error => errors.push(error.message));
		await page.setViewportSize({ width, height: 900 });
		await page.goto(volumeUrl);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://alpool.ru/spravochnik/kalkulyator-obema-basseyna.html');
		await expect(page.locator('nav.breadcrumbs a[href="/spravochnik/"]')).toHaveCount(1);
		await expect(page.locator('#nav a[href="/spravochnik/"], #navPanel a[href="/spravochnik/"]')).toHaveCount(1);
		await expect(page.locator('[data-volume-calculator]')).toBeVisible();
		await expect(page.locator('#contact form')).toBeAttached();

		await page.locator('#pool-shape').selectOption('rectangular');
		await page.locator('#pool-length').fill('10');
		await page.locator('#pool-width').fill('5');
		await page.locator('#pool-depth').fill('2');
		await expect(page.locator('#basin-volume')).toContainText('100');
		await expect(page.locator('#heating-calculator-link')).toHaveAttribute('href', '/spravochnik/teploobmennik-basseyna.html#hx-calc-title');

		await page.locator('#pool-shape').selectOption('rectangular-slope');
		await page.locator('#slope-length').fill('10');
		await page.locator('#slope-width').fill('4');
		await page.locator('#shallow-depth').fill('1');
		await page.locator('#deep-depth').fill('2');
		await expect(page.locator('#basin-volume')).toContainText('60');

		await page.locator('#pool-shape').selectOption('circular');
		await page.locator('#pool-diameter').fill('4');
		await page.locator('#round-depth').fill('2');
		await expect.poll(async () => Number((await page.locator('#basin-volume').innerText()).replace(/\s/g, '').replace(',', '.'))).toBeCloseTo(25.13, 1);

		await page.locator('#pool-shape').selectOption('irregular');
		await page.locator('#water-area').fill('25');
		await page.locator('#average-depth').fill('2');
		await expect(page.locator('#basin-volume')).toContainText('50');
		await page.locator('#include-balance-tank').check();
		await expect(page.locator('#balance-volume')).toContainText('5');
		await expect(page.locator('#total-volume')).toContainText('55');

		await expect(page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).resolves.toBe(true);
		await page.screenshot({ path: `.test-artifacts/volume-calculator-migration-${width}.png`, fullPage: true });
		expect(errors).toEqual([]);
	});
}

test('reference navigation keeps articles and guide separate', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/spravochnik/');
	await expect(page.locator('#nav a[href="/blog/blog.html"]')).toHaveCount(1);
	await expect(page.locator('#nav a[href="/spravochnik/"]')).toHaveCount(1);
	await expect(page.locator('#nav a[href*="/kalkulyatori/"]')).toHaveCount(0);
	await expect(page.locator('#cards .reference-card')).toHaveCount(29);
	await expect(page.locator('#cards a[href="kalkulyator-obema-basseyna.html"]')).toHaveCount(2);

	await page.setViewportSize({ width: 390, height: 900 });
	await page.locator('#navPanelToggle').click();
	await expect(page.locator('#navPanel')).toHaveAttribute('aria-hidden', 'false');
	await expect(page.locator('#navPanel a[href="/blog/blog.html"]')).toHaveCount(1);
	await expect(page.locator('#navPanel a[href="/spravochnik/"]')).toHaveCount(1);
});
test('retired calculator URL contains a noindex redirect to the canonical reference page', async ({ page, request }) => {
	const response = await request.get('/kalkulyatori/kalkulyator-obema-basseyna.html');
	expect(response.status()).toBe(200);
	const html = await response.text();
	expect(html).toContain('<meta name="robots" content="noindex, follow">');
	expect(html).toContain('<link rel="canonical" href="https://alpool.ru/spravochnik/kalkulyator-obema-basseyna.html">');
	expect(html).toContain('<meta http-equiv="refresh" content="0; url=/spravochnik/kalkulyator-obema-basseyna.html">');
	expect(html).toContain('<a href="/spravochnik/kalkulyator-obema-basseyna.html">Перейти к калькулятору объёма бассейна</a>');

	await page.goto('/kalkulyatori/kalkulyator-obema-basseyna.html');
	await expect(page).toHaveURL(/\/spravochnik\/kalkulyator-obema-basseyna\.html$/);
});
