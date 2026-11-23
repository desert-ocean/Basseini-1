const { test, expect } = require('@playwright/test');

const removedSlugs = [
  '/kalkulyatori/podbor-filtra-i-nasosa.html',
  '/articles/filtratsiya-vody-v-basseyne.html',
  '/articles/skimmernyy-ili-perelivnoy-basseyn.html',
  '/kalkulyatori/raschet-nagreva-vody-basseyna.html',
  '/articles/podogrev-vody-v-basseyne.html',
  '/articles/nakrytie-dlya-basseyna.html',
  '/articles/balans-ph-vody-v-basseyne.html',
  '/articles/ochistka-vody-v-basseyne-problemy.html',
  '/articles/skimmernyy-basseyn-pod-klyuch.html'
];

for (const width of [390, 768, 1440]) {
  test(`reference catalog redesign renders and filters at ${width}px`, async ({ page }, testInfo) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto('/spravochnik/');
    expect(response.status()).toBe(200);

    await expect(page.locator('#header .logo')).toHaveAttribute('href', '/');
    await expect(page.locator('#nav a[href="/blog/blog.html"], #navPanel a[href="/blog/blog.html"]')).toHaveCount(1);
    await expect(page.locator('#nav a[href="/spravochnik/"], #navPanel a[href="/spravochnik/"]')).toHaveCount(1);
    await expect(page.locator('#nav a[href*="/kalkulyatori/"], #navPanel a[href*="/kalkulyatori/"]')).toHaveCount(0);
    await expect(page.locator('#main h1')).toHaveCount(1);
    expect(await page.title()).toBe('Инженерный справочник ALPOOL');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Технические данные, формулы и инструменты/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://alpool.ru/spravochnik/index.html');

    const cards = page.locator('#cards > .reference-card');
    await expect(cards).toHaveCount(29);
    await expect(page.locator('#cards img.reference-card__art')).toHaveCount(29);
    const actions = page.locator('#cards .reference-card__action');
    await expect(actions).toHaveCount(29);
    expect(await actions.evaluateAll(elements => elements.every(element => {
      const label = Array.from(element.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      return !element.classList.contains('primary') && label?.textContent.trim() === 'ОТКРЫТЬ МАТЕРИАЛ';
    }))).toBeTruthy();
    const assets = await page.locator('#cards img.reference-card__art').evaluateAll(images => Promise.all(images.map(async image => {
      image.loading = 'eager';
      try {
        await image.decode();
        return { src: new URL(image.src).pathname, loaded: image.naturalWidth === 768 && image.naturalHeight === 512 };
      } catch {
        return { src: new URL(image.src).pathname, loaded: false };
      }
    })));
    expect(new Set(assets.map(asset => asset.src)).size).toBe(29);
    expect(assets.every(asset => asset.loaded)).toBeTruthy();
    await expect(page.getByRole('heading', { name: 'Инженерные калькуляторы' })).toHaveCount(0);
    await expect(page.locator('#main article.post > footer')).toHaveCount(0);
    await expect(page.locator('#main a[href="/kalkulyatori/raschet-truboprovodov-basseyna.html"], #main a[href="/kalkulyatori/podbor-filtra-i-nasosa.html"], #main a[href="/kalkulyatori/raschet-nagreva-vody-basseyna.html"], #main a[href="/articles/filtratsiya-vody-v-basseyne.html"]')).toHaveCount(0);

    for (const route of removedSlugs) {
      await expect(page.locator(`#cards > .reference-card > .reference-card__body > h2 > a[href="${route}"]`)).toHaveCount(0);
    }
    await expect(page.locator('#cards a[href="kalkulyator-obema-basseyna.html"]')).toHaveCount(2);

    await page.fill('#search', 'расчётный расход и предварительное сопоставление');
    for (const route of removedSlugs) {
      await expect(page.locator(`#cards > .reference-card:visible h2 > a[href="${route}"]`)).toHaveCount(0);
    }
    await page.fill('#search', '');
    await page.selectOption('#category', 'Фильтрация');
    await expect(page.locator('#cards > .reference-card:visible')).toHaveCount(5);
    for (const route of removedSlugs) {
      await expect(page.locator(`#cards > .reference-card:visible h2 > a[href="${route}"]`)).toHaveCount(0);
    }
    await page.selectOption('#category', '');
    await expect(page.locator('#cards > .reference-card:visible')).toHaveCount(29);

    const titleSize = await page.locator('#cards .reference-card h2').first().evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    const titleRange = width === 390 ? [22, 25] : width === 768 ? [24, 27] : [26, 30];
    expect(titleSize).toBeGreaterThanOrEqual(titleRange[0]);
    expect(titleSize).toBeLessThanOrEqual(titleRange[1]);
    const buttonStyle = await actions.first().evaluate(element => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, color: style.color, radius: style.borderRadius, shadow: style.boxShadow };
    });
    expect(buttonStyle.background).toBe('rgba(0, 0, 0, 0)');
    expect(buttonStyle.color).toBe('rgb(33, 41, 49)');
    expect(buttonStyle.radius).toBe('999px');
    expect(buttonStyle.shadow).toContain('inset');

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await expect(page.locator('#contact form')).toHaveCount(1);
    await expect(page.locator('#footer a[href="/tehnicheskoe-zadanie/"]')).toBeVisible();
    await expect(page.locator('#footer a[href="tel:+74956446654"]')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`reference-catalog-${width}.png`), fullPage: true });
    if (width === 1440) {
      await cards.evaluateAll(elements => elements.slice(2).forEach(element => { element.hidden = true; }));
      await page.locator('#cards').screenshot({ path: testInfo.outputPath('reference-catalog-card-pair-1440.png') });
    }
    expect(pageErrors).toEqual([]);
  });
}

test('standard mobile menu is accessible and toggles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/spravochnik/');
  const toggle = page.locator('#navPanelToggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#navPanel')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#navPanel a[href="/blog/blog.html"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#navPanel')).toHaveAttribute('aria-hidden', 'true');
});

test('back-to-top uses the shared control and respects reduced motion', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/spravochnik/');
  await expect(page.locator('body')).not.toHaveClass(/is-preload/);
  const top = page.locator('#backToTop');
  await expect(top).toHaveCount(1);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.55));
  await expect(top).toHaveClass(/is-visible/);
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath('reference-catalog-back-to-top-mid-scroll.png') });
  await top.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
});

test('back-to-top does not cover catalog text or actions while scrolling', async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/spravochnik/');
    await expect(page.locator('body')).not.toHaveClass(/is-preload/);
    const collisions = await page.evaluate(async () => {
      const button = document.getElementById('backToTop');
      const max = document.documentElement.scrollHeight - innerHeight;
      const overlaps = [];
      for (let y = 300; y <= max; y += 180) {
        scrollTo(0, y);
        await new Promise(resolve => setTimeout(resolve, 30));
        const b = button.getBoundingClientRect();
        if (getComputedStyle(button).opacity === '0') continue;
        for (const element of document.querySelectorAll('#cards h2, #cards p, #cards .reference-card__action')) {
          const r = element.getBoundingClientRect();
          if (r.width && r.height && r.bottom > 0 && r.top < innerHeight && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top) {
            overlaps.push({ text: element.textContent.trim().slice(0, 40), y, button: { x: Math.round(b.x), y: Math.round(b.y) }, position: button.className });
          }
        }
      }
      scrollTo(0, 0);
      return overlaps;
    });
    expect(collisions, `button overlaps at ${width}px`).toEqual([]);
  }
});
