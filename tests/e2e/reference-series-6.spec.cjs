const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const pages = [
  ['/spravochnik/obezzarazhivanie-vody-basseyna.html', 'Обеззараживание воды бассейна: хлор, УФ и озон — ALPOOL'],
  ['/spravochnik/avtomaticheskoe-dozirovanie-reagentov.html', 'Автоматическое дозирование реагентов бассейна — ALPOOL'],
  ['/spravochnik/ventilyaciya-krytogo-basseyna.html', 'Вентиляция крытого бассейна: влажность и конденсация — ALPOOL'],
  ['/spravochnik/elektrobezopasnost-basseyna.html', 'Электробезопасность бассейна: зоны и защиты — ALPOOL'],
];

for (const [url, title] of pages) {
  test(`${url} metadata, readable diagram and responsive layout`, async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url);
      await expect(page).toHaveTitle(title);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://alpool.ru${url}`);
      if (url === '/spravochnik/elektrobezopasnost-basseyna.html') {
        const diagrams = page.locator('main picture img');
        await expect(diagrams).toHaveCount(4);
        for (let i = 0; i < 4; i++) {
          const image = diagrams.nth(i);
          await expect(image).toBeVisible();
          await expect(image).toHaveAttribute('alt', /\S+/);
          const naturalWidth = await image.evaluate(node => node.naturalWidth);
          expect(naturalWidth, `diagram ${i} loaded at ${width}px`).toBeGreaterThan(0);
          const currentSrc = await image.evaluate(node => node.currentSrc);
          expect(currentSrc).toContain(width <= 600 ? '-mobile.svg' : '-desktop.svg');
        }
        await expect(diagrams.nth(3)).toHaveAttribute('alt', /защитного аппарата, PE и уравнивания потенциалов/);
      } else {
        await expect(page.locator('main svg[role=img]')).toBeVisible();
      }
      const captions = page.locator('figcaption.diagram-labels');
      await expect(captions).toHaveCount(url === '/spravochnik/elektrobezopasnost-basseyna.html' ? 4 : 1);
      await expect(captions.first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
      const file = path.join(process.cwd(), '.test-artifacts', 'series-6', `${path.basename(url, '.html')}-${width}.png`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await page.screenshot({ path: file, fullPage: true });
    }
  });
}

test('series 6 cards are searchable, categorized and listed in sitemap', async ({ page }) => {
  await page.goto('/spravochnik/index.html');
  const queries = [
    ['остаточный дезинфектант озон', 'obezzarazhivanie-vody-basseyna.html'],
    ['ORP насос дозатор', 'avtomaticheskoe-dozirovanie-reagentov.html'],
    ['точке росы конденсации', 'ventilyaciya-krytogo-basseyna.html'],
    ['уравнивания потенциалов УЗО', 'elektrobezopasnost-basseyna.html'],
  ];
  for (const [query, href] of queries) {
    await page.fill('#search', query);
    await expect(page.locator(`#cards a[href="${href}"]`), query).toBeVisible();
  }
  await page.fill('#search', '');
  await page.selectOption('#category', 'Вентиляция');
  await expect(page.locator('#cards .card:visible')).toHaveCount(1);

  const sitemap = fs.readFileSync(path.join(process.cwd(), 'sitemap.xml'), 'utf8');
  for (const [url] of pages) expect(sitemap).toContain(`https://alpool.ru${url}`);
});

test('series 6 pages use only internal user links and their local targets resolve', async ({ request }) => {
  for (const [url] of pages) {
    const file = path.join(process.cwd(), url.replace(/^\//, ''));
    const html = fs.readFileSync(file, 'utf8');
    const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map(match => match[1]);
    for (const href of anchors) {
      if (/^https?:\/\//i.test(href)) {
        expect(['https://wa.me/79856446654', 'https://t.me/desertocean'].includes(href), `${url} outbound user link`).toBe(true);
        continue;
      }
      if (href.startsWith('tel:') || href.startsWith('mailto:')) continue;
      expect(href).not.toMatch(/^\/\//);
      if (href.startsWith('/')) {
        const response = await request.get(href);
        expect(response.ok(), `${url} -> ${href}`).toBeTruthy();
      }
    }
  }
});

test('dosing reference distinguishes ORP from direct free chlorine measurement', async ({ page }) => {
  await page.goto('/spravochnik/avtomaticheskoe-dozirovanie-reagentov.html');
  await expect(page.locator('main')).toContainText('это не прямое измерение свободного хлора');
  await expect(page.locator('main')).toContainText('Дозирование блокируют');
  for (const id of ['dosing-main-flow', 'dosing-sample-branch', 'dosing-measurement-signals', 'dosing-circulation-permissive', 'dosing-pump-commands', 'dosing-reagent-lines']) {
    await expect(page.locator(`#${id}`), `dosing diagram: ${id}`).toHaveCount(1);
  }
  await expect(page.locator('figcaption')).toContainText('Пробу возвращают в допустимую проектом точку либо отводят');
});

test('ventilation diagram distinguishes outdoor air, exhaust and dehumidifier recirculation', async ({ page }) => {
  await page.goto('/spravochnik/ventilyaciya-krytogo-basseyna.html');
  for (const id of ['vent-outdoor-supply', 'vent-exhaust', 'vent-dehumidifier-intake', 'vent-dehumidifier-return']) {
    await expect(page.locator(`#${id}`), `ventilation diagram: ${id}`).toHaveCount(1);
  }
  await expect(page.locator('main')).toContainText('удаление влаги и загрязнений воздуха, включая');
  await expect(page.locator('main')).toContainText('сам по себе не обеспечивает требуемый приток наружного воздуха');
});
