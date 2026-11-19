const { test, expect } = require('@playwright/test');

test('heat-exchanger article calculator works at desktop and mobile widths', async ({ page }) => {
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/spravochnik/teploobmennik-basseyna.html');
	await expect(page).toHaveTitle(/Теплообменник для бассейна/);
	await expect(page.getByRole('heading', { level: 1, name: /Теплообменник для бассейна/ })).toBeVisible();
	await expect(page.locator('#hx-area-result')).toHaveText('32 м²');
	await expect(page.locator('#hx-volume-result')).toHaveText('48 м³');
	await expect(page.locator('#hx-energy-ideal')).toHaveText(/1\s?172,3 кВт·ч/);
	await expect(page.locator('#hx-heat-result')).not.toHaveText('—');
	await expect(page.locator('#hx-radiation-model')).toHaveCount(0);
	await expect(page.locator('.hx-results dt').filter({ hasText: 'Полезная тепловая энергия, переданная воде' })).toBeVisible();
	await expect(page.locator('#hx-flow-powers')).toContainText('Расходы теплоносителей не заданы');
	await expect(page.locator('#hx-chart-losses path')).toHaveCount(0);
	await expect(page.locator('#hx-chart-losses').locator('..').locator('.hx-bar-row')).toHaveCount(6);
	await expect(page.locator('#hx-chart-air path')).toHaveCount(1);
	await expect(page.locator('#hx-chart-heat path')).toHaveCount(1);
	await expect(page.locator('#hx-advanced-settings')).not.toHaveAttribute('open', '');
	await expect(page.locator('#hx-exchanger-settings')).not.toHaveAttribute('open', '');
	await page.locator('#hx-advanced-settings > summary').click();
	await page.locator('#hx-radiant-temp').fill('12.3');
	await page.locator('#hx-advanced-settings > summary').click();
	await expect(page.locator('#hx-radiant-temp')).toHaveValue('12.3');
	await page.locator('#hx-advanced-settings > summary').click();

	await page.locator('#hx-length').fill('10,5');
	await expect(page.locator('#hx-area-result')).toHaveText(/42/);
	await expect(page.locator('#hx-volume-result')).toHaveText(/63/);

	await page.getByRole('tab', { name: 'Оценить время при известной мощности' }).click();
	await page.locator('#hx-available-power').fill('1');
	await expect(page.locator('#hx-heat-result')).toContainText('цель не достигнута');
	await expect(page.locator('#hx-warnings')).toContainText('недостаточно');

	await page.getByRole('tab', { name: 'Подобрать мощность по времени' }).click();
	await page.locator('#hx-environment').selectOption('indoor');
	await page.locator('#hx-air').fill('30');
	await page.locator('#hx-rh').fill('60');
	await page.locator('#hx-target').fill('27');
	await expect(page.locator('#hx-conv')).toContainText('кВт');
	await expect(page.locator('#hx-conv')).toContainText('-');
	await expect(page.locator('#hx-dewpoint')).toContainText('°C');
	await expect(page.locator('#hx-warnings')).toContainText('Возможна конденсация влаги с выделением тепла');
	await expect(page.locator('#hx-moisture-mode')).toContainText('Расчёт испарения');
	await page.locator('#hx-target').fill('7');
	await expect(page.locator('#hx-moisture-mode')).toContainText('Возможна конденсация');
	await expect(page.locator('#hx-evap')).toHaveText('0 кВт');
	await expect(page.locator('#hx-conv')).toContainText('-');
	await expect(page.locator('#hx-rad')).toContainText('-');
	await expect(page.locator('#hx-warnings')).toContainText('не подтверждена для количественного расчёта конденсации');
	await page.locator('#hx-target').fill('27');

	await page.locator('#hx-cover-on').check();
	await page.locator('#hx-cover-percent').fill('80');
	await page.locator('#hx-cover-hours').fill('12');
	await expect(page.locator('#hx-daily-energy')).toHaveText('—');
	await page.locator('#hx-cover-evap-fraction').fill('0.1');
	await page.locator('#hx-cover-u').fill('1');
	await expect(page.locator('#hx-daily-energy')).not.toHaveText('—');
	await expect(page.locator('#hx-cover-transfer')).toContainText('кВт');
	await expect(page.locator('#hx-scheduled-savings')).toContainText('неизменных погодных условиях');
	await page.locator('#hx-exchanger-settings > summary').click();
	await page.locator('#hx-primary-flow').fill('20');
	await expect(page.locator('#hx-flow-powers')).toContainText('Укажите расходы обоих контуров');
	await expect(page.locator('#hx-flow-powers')).not.toContainText('кВт первичный');
	await page.locator('#hx-primary-flow').fill('');
	await page.locator('#hx-primary-supply').fill('60');
	await expect(page.locator('#hx-temperature-check')).toContainText('нужны все четыре температуры');
	await page.locator('#hx-primary-return').fill('50');
	await page.locator('#hx-pool-inlet').fill('28');
	await page.locator('#hx-pool-outlet').fill('30');
	await page.locator('#hx-primary-flow').fill('20');
	await page.locator('#hx-pool-flow').fill('100');
	await expect(page.locator('#hx-lmtd')).toContainText('K');
	await expect(page.locator('#hx-temperature-check')).toContainText('напора положительны');
	await expect(page.locator('#hx-warnings')).toContainText('характеристику изготовителя');
	await page.locator('#hx-primary-supply').fill('55');
	await page.locator('#hx-pool-outlet').fill('56');
	await expect(page.locator('#hx-temperature-check')).toContainText('физически недопустим');
	await page.locator('#hx-primary-supply').fill('60');
	await page.locator('#hx-pool-outlet').fill('30');

	await page.locator('#hx-length').fill('bad input');
	await expect(page.locator('#hx-error')).toContainText('заполнено некорректно');
	await expect(page.locator('#hx-area-result')).toHaveText('—');
	await page.locator('#hx-length').fill('8');
	await page.locator('#hx-primary-supply').fill('');
	await page.locator('#hx-primary-return').fill('');
	await page.locator('#hx-pool-inlet').fill('');
	await page.locator('#hx-pool-outlet').fill('');
	await page.locator('#hx-primary-flow').fill('');
	await page.locator('#hx-pool-flow').fill('');
	await page.locator('#hx-exchanger-settings > summary').click();
	await page.locator('.hx-calculator details').nth(2).locator('summary').click();
	await page.locator('#hx-copy').click();
	await expect(page.locator('#hx-copy-status')).toContainText(/скопированы|выделены/);
	await page.locator('.hx-calculator details').nth(2).locator('summary').click();
	await page.locator('#hx-advanced-settings > summary').click();
	await expect(page.locator('.hx-toc a[href="#exchanger"]')).toHaveAttribute('href', '#exchanger');
	const tocTargets = await page.locator('.hx-toc a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
	expect(tocTargets.length).toBeGreaterThan(10);
	for (const target of tocTargets) await expect(page.locator(target)).toHaveCount(1);
	await expect(page.locator('#unified-phone')).toBeAttached();
	await expect(page.locator('.contact-cta a[href="/tehnicheskoe-zadanie/"]')).toBeAttached();

	for (const width of [390, 768, 1440]) {
		await page.setViewportSize({ width, height: 1000 });
		await page.waitForTimeout(100);
		const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
		const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
		expect(documentWidth).toBeLessThanOrEqual(viewportWidth + 1);
		if (width <= 600) {
			for (const chart of ['#hx-chart-losses', '#hx-chart-air', '#hx-chart-heat']) {
				const data = page.locator(chart).locator('..').locator('.hx-chart-mobile-data');
				await expect(data).toBeVisible();
				const fontSizes = await data.locator('span,strong').evaluateAll((elements) => elements.map((el) => parseFloat(getComputedStyle(el).fontSize)));
				expect(Math.min(...fontSizes)).toBeGreaterThanOrEqual(13);
				const bounds = await data.boundingBox();
				expect(bounds.width).toBeLessThanOrEqual(width);
			}
		} else {
			await expect(page.locator('#hx-chart-air')).toBeVisible();
			const label = await page.locator('#hx-chart-air text').first().boundingBox();
			expect(label.height).toBeGreaterThanOrEqual(12);
		}
		const barRows = await page.locator('#hx-chart-losses').locator('..').locator('.hx-bar-row').evaluateAll((rows) => rows.map((row) => { const a = row.querySelector('.hx-bar-head').getBoundingClientRect(); const b = row.querySelector('.hx-bar-track').getBoundingClientRect(); const bounds = row.getBoundingClientRect(); return { top: bounds.top, bottom: bounds.bottom, headBottom: a.bottom, trackTop: b.top, trackBottom: b.bottom }; }));
		for (const row of barRows) { expect(row.trackTop).toBeGreaterThanOrEqual(row.headBottom); expect(row.trackBottom).toBeGreaterThan(row.trackTop); }
		for (let i = 1; i < barRows.length; i += 1) expect(barRows[i].top).toBeGreaterThanOrEqual(barRows[i - 1].bottom);
		await page.screenshot({ path: `.test-artifacts/heat-exchanger-${width}.png`, fullPage: true });
		await page.locator('.hx-charts').screenshot({ path: `.test-artifacts/heat-exchanger-charts-${width}.png` });
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.screenshot({ path: `.test-artifacts/heat-exchanger-${width}-viewport.png` });
	}
	expect(errors).toEqual([]);
});
