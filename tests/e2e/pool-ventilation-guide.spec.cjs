const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { allowedGovernmentDocuments, allowedAlpoolContacts } = require('../../scripts/external-link-policy.cjs');

const widths = [390, 768, 1440];
const output = path.resolve('.test-artifacts/visual-review/pool-ventilation-guide');

test('pool ventilation guide at mobile, tablet and desktop sizes', async ({ page, request }) => {
  fs.mkdirSync(output, { recursive: true });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/spravochnik/ventilyaciya-krytogo-basseyna.html');
    await expect(page.locator('h1')).toContainText('Вентиляция крытого бассейна');
    await expect(page.locator('#why picture img')).toBeVisible();
    await expect(page.locator('#condensation picture img')).toBeVisible();
    await expect(page.locator('#systems picture img')).toBeVisible();
    await expect(page.locator('#vent-calculator')).toBeVisible();
    await expect(page.locator('#vent-rate-result')).toHaveText('3.00');
    await expect(page.locator('#vent-dew-result')).toHaveText('21.4');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
    const fileTag = `${width}px`;
    if (width === 390) {
      const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const maxScroll = documentHeight - 900;
      const positions = [];
      for (let top = 0; top <= maxScroll; top += 900) positions.push(top);
      if (positions[positions.length - 1] !== maxScroll) positions.push(maxScroll);
      fs.writeFileSync(path.join(output, 'full-390-segments.json'), JSON.stringify({ documentHeight, positions }, null, 2));
      let captureStyle;
      for (let i = 0; i < positions.length; i += 1) {
        if (i > 0) {
          if (i === 1) captureStyle = await page.addStyleTag({ content: '#navPanelToggle,#backToTop{visibility:hidden!important}' });
          await page.evaluate(top => window.scrollTo(0, top), positions[i]);
          await page.waitForTimeout(60);
        }
        await page.screenshot({ path: path.join(output, `full-390-segment-${String(i).padStart(2, '0')}.png`) });
      }
      if (captureStyle) await captureStyle.evaluate(node => node.remove());
    } else {
      await page.screenshot({ path: path.join(output, `full-${fileTag}.png`), fullPage: true });
    }
    const diagrams = ['#why .vent-diagram', '#condensation .vent-diagram', '#systems .vent-diagram'];
    for (let index = 0; index < diagrams.length; index += 1) {
      const figure = page.locator(diagrams[index]);
      await figure.scrollIntoViewIfNeeded();
      await figure.screenshot({ path: path.join(output, `diagram-${index + 1}-${fileTag}.png`) });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/spravochnik/ventilyaciya-krytogo-basseyna.html');
  const nav = page.locator('#header');
  await expect(nav).toBeVisible();
  await expect(page.locator('#footer form')).toBeAttached();
  await expect(page.locator('#footer a[href="/tehnicheskoe-zadanie/"]')).toBeAttached();
  await expect(page.getByRole('link', { name: 'Кратность и расход воздуха' })).toHaveAttribute('href', '#air-rate');
  const externalLinks = await page.locator('a[href^="http"]').evaluateAll(anchors => anchors.map(anchor => anchor.href));
  for (const href of externalLinks) expect(allowedAlpoolContacts.has(href) || allowedGovernmentDocuments.has(href), href).toBe(true);
  const links = await page.locator('a[href^="/"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  for (const href of links) {
    const target = href.split('#')[0];
    const response = await request.get(target || '/spravochnik/ventilyaciya-krytogo-basseyna.html');
    expect(response.ok(), `internal link ${href}`).toBeTruthy();
  }
  const missingAnchors = await page.locator('main a[href*="#"]').evaluateAll(nodes => nodes.map(node => new URL(node.href)).filter(url =>
    url.pathname === location.pathname && url.hash && !document.getElementById(url.hash.slice(1))
  ).map(url => url.href));
  expect(missingAnchors).toEqual([]);
  const heatPage = await request.get('/spravochnik/teploobmennik-basseyna.html');
  expect(await heatPage.text()).toContain('id="hx-calc-title"');
});
