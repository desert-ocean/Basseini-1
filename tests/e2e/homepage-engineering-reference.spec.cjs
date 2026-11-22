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
		await expect(page.locator('#nav a[href="/blog/blog.html"], #navPanel a[href="/blog/blog.html"]').first()).toHaveText('Статьи');
		await expect(page.locator('#nav a[href="/spravochnik/"], #navPanel a[href="/spravochnik/"]').first()).toHaveText('Справочник');
		const contactLink = section.getByRole('link', { name: 'Задать вопрос инженеру' });
		await expect(contactLink).toHaveAttribute('href', '#contact');
		await expect(section.getByText('Телефон ALPOOL: +7 (495) 644-66-54')).toHaveCount(0);
		await expect(section.getByText('Первичная консультация по конкретному техническому вопросу бесплатная.')).toBeVisible();
		await expect(section.locator('a[href*="kalkulyatori"]')).toHaveCount(0);
		await expect(page.locator('#contact form')).toBeAttached();
		await expect(page.locator('a[href="/tehnicheskoe-zadanie/"]')).toHaveCount(2);
		await expect(page.request.get('/spravochnik/').then(response => response.status())).resolves.toBe(200);
		await expect(page.request.get('/blog/blog.html').then(response => response.status())).resolves.toBe(200);
		await expect(page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).resolves.toBe(true);
		await section.screenshot({ path: `.test-artifacts/homepage-engineering-reference-${width}.png` });
		if (width <= 980) {
			await page.locator('#navPanelToggle').click();
			await expect(page.locator('#navPanel')).toHaveAttribute('aria-hidden', 'false');
			await expect(page.locator('#navPanel a[href="/blog/blog.html"]')).toHaveText('Статьи');
			await page.locator('#navPanel a.close').click();
		}
		await contactLink.click();
		const contactHeading = page.locator('#contact-title');
		await expect(contactHeading).toBeInViewport();
		await expect.poll(() => contactHeading.evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
		await expect.poll(() => contactHeading.evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(await page.evaluate(() => innerHeight));
		if (width <= 980) {
			const overlapsMenu = await page.evaluate(() => {
				const heading = document.querySelector('#contact-title').getBoundingClientRect();
				const menu = document.querySelector('#navPanelToggle').getBoundingClientRect();
				return heading.left < menu.right && heading.right > menu.left && heading.top < menu.bottom && heading.bottom > menu.top;
			});
			expect(overlapsMenu).toBe(false);
		}
		const backToTop = page.locator('#backToTop');
		await expect(backToTop).toBeVisible();
		await expect(backToTop).toHaveAttribute('aria-label', 'Наверх');
		const consultationTop = await section.locator('.engineering-reference__consultation').evaluate(element => element.getBoundingClientRect().top + window.scrollY);
		await page.evaluate(top => window.scrollTo(0, top - (window.innerHeight - 330)), consultationTop);
		if (width <= 480) {
			await expect(backToTop).toHaveClass(/is-over-engineering-reference/);
			const textOverlap = await page.evaluate(() => {
				const button = document.querySelector('#backToTop').getBoundingClientRect();
				return [...document.querySelectorAll('.engineering-reference__consultation h3, .engineering-reference__consultation p, .engineering-reference__consultation a')]
					.some(element => {
						const text = element.getBoundingClientRect();
						return button.left < text.right && button.right > text.left && button.top < text.bottom && button.bottom > text.top;
					});
			});
			expect(textOverlap).toBe(false);
		}

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
		expect(errors).toEqual([]);
	});
}

test('contact anchor works without JavaScript', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
	const page = await context.newPage();
	await page.goto('/');
	await page.locator('.engineering-reference__contact-link').click();
	await expect.poll(() => page.evaluate(() => location.hash)).toBe('#contact');
	await expect(page.locator('#contact-title')).toBeInViewport();
	await context.close();
});
