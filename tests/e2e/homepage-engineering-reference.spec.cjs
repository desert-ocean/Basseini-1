const { test, expect } = require('@playwright/test');

for (const width of [390, 768, 1440]) {
	test(`homepage engineering reference is clear and responsive at ${width}px`, async ({ page }) => {
		const errors = [];
		page.on('pageerror', error => errors.push(error.message));
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/');

		const section = page.locator('#main .engineering-reference');
		await expect(section).toBeVisible();
		await expect(page.locator('h1')).toHaveCount(1);
		await expect(section.locator('h2')).toHaveText('Мы не скрываем инженерные знания. Пользуйтесь!');
		await expect(section.locator('.engineering-reference__visual img'))
			.toHaveAttribute('src', '/assets/images/alpool-spravochnik.svg');
		await expect(section.locator('.engineering-reference__visual img')).toHaveAttribute('alt', /Инженерный справочник ALPOOL/);
		await expect(section.locator('a[href="/spravochnik/"]')).toHaveText('Перейти в инженерный справочник');
		await expect(section.locator('a[href="tel:+74956446654"]').first()).toHaveText('Задать вопрос инженеру');
		await expect(section.locator('.engineering-reference__phone a[href="tel:+74956446654"]')).toHaveText('+7 (495) 644-66-54');
		await expect(section.getByText('Первичная консультация по конкретному техническому вопросу бесплатная.')).toBeVisible();
		await expect(section.locator('a[href*="kalkulyatori"]')).toHaveCount(0);
		await expect(page.locator('#contact form')).toBeAttached();
		await expect(page.locator('a[href="/tehnicheskoe-zadanie/"]')).toHaveCount(2);
		await expect(page.request.get('/spravochnik/').then(response => response.status())).resolves.toBe(200);
		await expect(page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).resolves.toBe(true);

		const bounds = await section.locator('.engineering-reference__layout').evaluate(element => {
			const heading = element.querySelector('.engineering-reference__heading').getBoundingClientRect();
			const visual = element.querySelector('.engineering-reference__visual').getBoundingClientRect();
			const copy = element.querySelector('.engineering-reference__copy').getBoundingClientRect();
			return { headingTop: heading.top, headingLeft: heading.left, visualTop: visual.top, visualLeft: visual.left, copyTop: copy.top };
		});
		if (width > 980) {
			expect(bounds.visualLeft).toBeGreaterThan(bounds.headingLeft);
			expect(Math.abs(bounds.visualTop - bounds.headingTop)).toBeLessThan(40);
		} else {
			expect(bounds.visualTop).toBeGreaterThan(bounds.headingTop);
			expect(bounds.copyTop).toBeGreaterThan(bounds.visualTop);
		}

		await section.screenshot({ path: `.test-artifacts/homepage-engineering-reference-${width}.png` });
		expect(errors).toEqual([]);
	});
}
