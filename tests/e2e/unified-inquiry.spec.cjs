const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const groups = ['articles', 'blog', 'kalkulyatori', 'napravleniya', 'servis', 'spravochnik'];
const pages = groups.flatMap(group => fs.readdirSync(group)
	.filter(name => name.endsWith('.html'))
	.map(name => `/${group}/${name}`));
const sharedIds = ['contact-title', 'unified-name', 'unified-phone', 'unified-email',
	'unified-message', 'unified-lead-files', 'unified-lead-files-help', 'unified-lead-files-selected',
	'unified-alpool-personal-data-consent-home', 'unified-alpool-personal-data-consent-home-links'];

test('every target keeps one shared inquiry form and has no separate task CTA', async ({ page }) => {
	test.setTimeout(180000);
	const pageErrors = [];
	page.on('pageerror', error => pageErrors.push(error.message));
	for (const url of pages) {
		await page.goto(url);
		const footer = page.locator('#footer');
		await expect(footer.locator('#contact-title'), url).toHaveText('Задайте вопрос специалисту');
		await expect(page.locator('[aria-labelledby="tech-task-title"]'), url).toHaveCount(0);
		await expect(footer.locator('form[action="https://api.alpool.ru/api/leads"]'), url).toHaveCount(1);
		await expect(footer.locator('a[href^="tel:"]'), url).toHaveCount(1);
		await expect(footer.locator('a[href^="mailto:"]'), url).toHaveCount(1);
		await expect(footer.locator('.contact-messengers a'), url).toHaveCount(2);
		const duplicateSharedIds = await page.evaluate(ids => ids.filter(id => document.querySelectorAll(`[id="${id}"]`).length !== 1), sharedIds);
		expect(duplicateSharedIds, url).toEqual([]);
		await expect(footer.locator('a[href="/tehnicheskoe-zadanie/"]'), url).toHaveCount(1);
	}
	expect(pageErrors).toEqual([]);
});

test('shared blocks use the same computed styles as the homepage', async ({ page }) => {
	const selectors = ['#footer', '#contact-title', '#footer .contact-form-section header p', '#footer label', '#footer input[type="tel"]', '#footer .contact-cta'];
	const readStyles = async () => page.evaluate(selectorsToRead => selectorsToRead.map(selector => {
		const style = getComputedStyle(document.querySelector(selector));
		return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'borderRadius', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'display', 'gridTemplateColumns', 'gap', 'alignItems', 'alignSelf', 'justifyItems', 'textAlign', 'borderColor', 'borderWidth', 'width'].map(property => [property, style[property]]));
	}), selectors);
	for (const width of [390, 768, 1440]) {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/');
		await page.evaluate(() => document.fonts.ready);
		await expect(page.locator('[aria-labelledby="tech-task-title"]')).toHaveCount(1);
		const homepage = await readStyles();
		const homeFooterShot = path.join('.test-artifacts', 'unified-inquiry', `home-footer-${width}.png`);
		fs.mkdirSync(path.dirname(homeFooterShot), { recursive: true });
		await page.locator('#footer').screenshot({ path: homeFooterShot });
		await page.goto('/spravochnik/truby-pvc-u.html');
		await page.evaluate(() => document.fonts.ready);
		await expect(page.locator('[aria-labelledby="tech-task-title"]')).toHaveCount(0);
		expect(await readStyles(), `shared component styles at ${width}px`).toEqual(homepage);
		await page.locator('#footer').screenshot({ path: path.join('.test-artifacts', 'unified-inquiry', `reference-footer-${width}.png`) });
	}
	await page.locator('#footer a[href="/tehnicheskoe-zadanie/"]').click();
	await expect(page).toHaveURL(/\/tehnicheskoe-zadanie\/$/);
});

for (const url of ['/articles/filtratsiya-vody-v-basseyne.html', '/spravochnik/truby-pvc-u.html', '/spravochnik/gidravlicheskie-poteri.html']) {
	test(`${url} mobile layout and form submission`, async ({ page }) => {
		for (const width of [390, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(url);
			await page.evaluate(() => document.fonts.ready);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${url} ${width}`).toBe(true);
			const screenshot = path.join('.test-artifacts', 'unified-inquiry', `${path.basename(url, '.html')}-${width}.png`);
			fs.mkdirSync(path.dirname(screenshot), { recursive: true });
			await page.locator('#footer').screenshot({ path: screenshot });
		}

		let leadRequests = 0;
		let attachmentRequests = 0;
		await page.route('https://api.alpool.ru/api/leads', async route => {
			leadRequests++;
			const data = route.request().postDataJSON();
			expect(data.personal_data_consent).toBe(true);
			expect(data.name).toBe('Тест');
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 123 }) });
		});
		await page.route('https://api.alpool.ru/api/leads/123/attachments', async route => {
			attachmentRequests++;
			await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
		});

		const form = page.locator('#footer form');
		await form.locator('[name=name]').fill('Тест');
		await form.locator('[name=phone]').fill('+7 999 123-45-67');
		await form.locator('[name=files]').setInputFiles({ name: 'plan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('test') });
		await expect(form.locator('.lead-file-list')).toContainText('plan.pdf');
		await form.locator('[type=submit]').click();
		expect(leadRequests).toBe(0);
		await form.locator('label[for="unified-alpool-personal-data-consent-home"]').click();
		await expect(form.locator('[name=personal_data_consent]')).toBeChecked();
		await form.locator('[type=submit]').click();
		await expect(form.locator('.lead-status')).toContainText('Заявка отправлена');
		expect(leadRequests).toBe(1);
		expect(attachmentRequests).toBe(1);
	});
}
