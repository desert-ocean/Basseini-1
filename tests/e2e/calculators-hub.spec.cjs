const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const repoRoot = path.resolve(__dirname, '../..');

const retiredRoutes = [
  '/kalkulyatori/',
  '/kalkulyatori/podbor-filtra-i-nasosa.html',
  '/kalkulyatori/raschet-nagreva-vody-basseyna.html',
  '/kalkulyatori/raschet-truboprovodov-basseyna.html'
];

for (const width of [390, 768, 1440]) {
  test(`retired calculator routes return 404 and reference remains available at ${width}px`, async ({ page, request }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });

    for (const route of retiredRoutes) expect((await request.get(route)).status()).toBe(404);

    await page.goto('/spravochnik/');
    await expect(page.locator('#cards > .reference-card')).toHaveCount(29);
    await expect(page.locator('#nav a[href="/blog/blog.html"], #navPanel a[href="/blog/blog.html"]')).toHaveCount(1);
    await expect(page.locator('#nav a[href="/spravochnik/"], #navPanel a[href="/spravochnik/"]')).toHaveCount(1);
    await expect(page.locator('a[href^="/kalkulyatori/"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('volume calculator and its legacy redirect are retained; removed routes are absent from sitemap', async ({ page, request }) => {
  expect(fs.existsSync(path.join(repoRoot, 'generate_kalkulyatori.py'))).toBe(false);
  const htmlFiles = ['articles', 'blog', 'kalkulyatori', 'napravleniya', 'servis', 'spravochnik']
    .flatMap(directory => fs.readdirSync(path.join(repoRoot, directory), { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
      .map(entry => path.join(repoRoot, directory, entry.name)));
  htmlFiles.push(...fs.readdirSync(repoRoot, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
    .map(entry => path.join(repoRoot, entry.name)));
  const staleLinks = htmlFiles.flatMap(file => {
    const html = fs.readFileSync(file, 'utf8');
    return Array.from(html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi), match => ({ file, href: match[1] }))
      .filter(link => /(?:^|\/)kalkulyatori\/(?:index\.html|podbor-filtra-i-nasosa\.html|raschet-nagreva-vody-basseyna\.html|raschet-truboprovodov-basseyna\.html)(?:$|[?#])/i.test(link.href));
  });
  expect(staleLinks).toEqual([]);
  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.status()).toBe(200);
  const sitemap = await sitemapResponse.text();
  for (const route of retiredRoutes) expect(sitemap).not.toContain(route.replace(/\/$/, ''));
  expect(sitemap).toContain('https://alpool.ru/spravochnik/kalkulyator-obema-basseyna.html');

  const volume = await request.get('/spravochnik/kalkulyator-obema-basseyna.html');
  expect(volume.status()).toBe(200);
  await page.goto('/kalkulyatori/kalkulyator-obema-basseyna.html');
  await expect(page).toHaveURL(/\/spravochnik\/kalkulyator-obema-basseyna\.html$/);
  await expect(page.locator('[data-volume-calculator]')).toBeVisible();
});
