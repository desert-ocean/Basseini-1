const { test, expect } = require('@playwright/test');
const { allowedGovernmentDocuments, allowedAlpoolContacts } = require('../../scripts/external-link-policy.cjs');
const fs = require('node:fs');
const path = require('node:path');

const pages = [
  ['/spravochnik/obezzarazhivanie-vody-basseyna.html', 'Обеззараживание воды бассейна: хлор, озон, УФ и комбинированные системы | ALPOOL'],
  ['/spravochnik/avtomaticheskoe-dozirovanie-reagentov.html', 'Автоматическое дозирование реагентов в бассейне — датчики, нормы и защита | ALPOOL'],
  ['/spravochnik/ventilyaciya-krytogo-basseyna.html', 'Вентиляция крытого бассейна: нормы и расчёт воздухообмена — ALPOOL'],
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
      } else if (url === '/spravochnik/ventilyaciya-krytogo-basseyna.html') {
        const diagrams = page.locator('main picture img');
        await expect(diagrams).toHaveCount(3);
        for (let i = 0; i < 3; i++) {
          const image = diagrams.nth(i);
          await expect(image).toBeVisible();
          await expect(image).toHaveAttribute('alt', /\S+/);
          const naturalWidth = await image.evaluate(node => node.naturalWidth);
          expect(naturalWidth, `diagram ${i} loaded at ${width}px`).toBeGreaterThan(0);
          const currentSrc = await image.evaluate(node => node.currentSrc);
          expect(currentSrc).toContain(width <= 600 ? '-mobile.svg' : '-desktop.svg');
        }
      } else {
        const images = page.locator('main picture img');
        const diagrams = page.locator('main svg[role=img]');
        expect(await images.count() + await diagrams.count(), `${url} has an accessible diagram`).toBeGreaterThan(0);
        for (let index = 0; index < await images.count(); index += 1) {
          const image = images.nth(index);
          await image.scrollIntoViewIfNeeded();
          await expect(image).toBeVisible();
          await expect.poll(() => image.evaluate(node => node.naturalWidth)).toBeGreaterThan(0);
        }
        if (await diagrams.count()) await expect(diagrams.first()).toBeVisible();
      }
      const figures = page.locator('main figure:has(img[src$=".svg"])');
      const captions = figures.locator('figcaption');
      await expect(captions).toHaveCount(await figures.count(), `${url} gives every SVG figure a caption`);
      for (const caption of await captions.all()) {
        await expect(caption).toBeVisible();
        await expect(caption).not.toBeEmpty();
      }
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
    await expect(page.locator(`#cards h2 a[href="${href}"]`), query).toBeVisible();
  }
  await page.fill('#search', '');
  await page.selectOption('#category', 'Вентиляция');
  await expect(page.locator('#cards .reference-card:visible')).toHaveCount(1);

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
        expect(allowedAlpoolContacts.has(href) || allowedGovernmentDocuments.has(href), `${url} outbound user link`).toBe(true);
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
  await expect(page.locator('main')).toContainText('ОВП не заменяет анализ свободного хлора');
  await expect(page.locator('main')).toContainText('нельзя пересчитать любое значение Redox в универсальную концентрацию свободного хлора');
  await expect(page.locator('main')).toContainText('Разрешает или блокирует дозирование по схеме защит');
  const diagram = page.locator('.dosing-figure img');
  await diagram.scrollIntoViewIfNeeded();
  await expect(diagram).toBeVisible();
  await expect.poll(() => diagram.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  const diagramPath = new URL(await diagram.evaluate(image => image.currentSrc)).pathname;
  const diagramSvg = await (await page.request.get(diagramPath)).text();
  expect(diagramSvg).toContain('Проток');
  expect(diagramSvg).toContain('Контроллер');
  expect(diagramSvg).toContain('останов');
  expect(diagramSvg).toContain('насос');
  await expect(page.locator('.dosing-figure figcaption')).toContainText('путь измерения и реагента');
});

test('ventilation article uses responsive engineering diagrams and explains compliant dehumidification', async ({ page }) => {
  await page.goto('/spravochnik/ventilyaciya-krytogo-basseyna.html');
  await expect(page.locator('main picture img')).toHaveCount(3);
  await expect(page.locator('main')).toContainText('удаляет загрязнители и влагу');
  await expect(page.locator('main')).toContainText('ГОСТ Р 72128-2025, п. 6.2 допускает осушители только для осушения подаваемого наружного воздуха');
  await expect(page.locator('main')).toContainText('не заменяет вентиляцию');
  await expect(page.locator('main')).toContainText('80 м³/ч на занимающегося и 20 м³/ч на зрителя');
});
