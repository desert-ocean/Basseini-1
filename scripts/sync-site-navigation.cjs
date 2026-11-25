'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const protectedFiles = new Set([
  'index.html',
  'kalkulyatori/kalkulyator-obema-basseyna.html',
  'yandex_7501679aa8a44979.html'
]);
const nonPublicDirectories = ['consent-versions/'];
const additionalPublicPages = new Set([
  'privacy.html',
  'consent.html',
  'tehnicheskoe-zadanie/index.html'
]);
const sharedScripts = [
  '/assets/js/jquery.min.js',
  '/assets/js/jquery.scrollex.min.js',
  '/assets/js/jquery.scrolly.min.js',
  '/assets/js/browser.min.js',
  '/assets/js/breakpoints.min.js',
  '/assets/js/util.js',
  '/assets/js/main.js'
];

function getTrackedHtml() {
  return execFileSync('git', ['ls-files', '-z', '--', '*.html'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .map(file => file.replaceAll('\\', '/'));
}

function isNonPublicHtml(file, html) {
  return file === 'yandex_7501679aa8a44979.html'
    || nonPublicDirectories.some(directory => file.startsWith(directory))
    || /<meta\b[^>]*http-equiv=["']refresh["']/i.test(html);
}

function isManagedPage(file) {
  return !protectedFiles.has(file) && !file.startsWith('spravochnik/');
}

function activeSection(file) {
  if (file === 'index.html' || file.startsWith('servis/') || file.startsWith('napravleniya/')) return 'services';
  if (file.startsWith('spravochnik/')) return 'reference';
  if (file.startsWith('articles/') || file === 'blog/blog.html') return 'articles';
  if (file.startsWith('portfolio/')) return 'portfolio';
  return '';
}

function renderNavigation(file) {
  const active = activeSection(file);
  const entries = [
    ['services', '/#services', 'Услуги'],
    ['why-us', '/#why-us', 'Почему мы'],
    ['portfolio', '/#portfolio', 'Портфолио'],
    ['articles', '/blog/blog.html', 'Статьи'],
    ['reference', '/spravochnik/', 'Справочник'],
    ['contact', '/#contact', 'Контакты']
  ];
  const links = entries.map(([key, href, label]) =>
    `\t\t\t<li${key === active ? ' class="active"' : ''}><a href="${href}">${label}</a></li>`
  ).join('\n');

  return [
    '<nav id="nav" aria-label="Основная навигация">',
    '\t<ul class="links">',
    links,
    '\t</ul>',
    '\t<ul class="icons">',
    '\t\t<li><a href="tel:+74956446654" class="icon solid fa-phone"><span class="label">Телефон</span></a></li>',
    '\t\t<li><a href="https://wa.me/79856446654" class="icon brands fa-whatsapp"><span class="label">WhatsApp</span></a></li>',
    '\t\t<li><a href="https://t.me/desertocean" class="icon brands fa-telegram-plane"><span class="label">Telegram</span></a></li>',
    '\t</ul>',
    '</nav>'
  ].join('\n');
}

function addSharedScripts(html) {
  const tags = sharedScripts
    .filter(src => !new RegExp(`<script\\b[^>]*src=["']${src.replaceAll('/', '\\/')}["']`, 'i').test(html))
    .map(src => `\t<script src="${src}"></script>`)
    .join('\n');
  if (!tags) return html;
  return html.replace(/<\/body>/i, `${tags}\n</body>`);
}

function syncSpecialPage(file, original) {
  if (hasExpectedMenu(file, original)) return original;
  let html = original;
  const navigation = renderNavigation(file);

  if (file === 'privacy.html' || file === 'consent.html') {
    html = html.replace(/<body([^>]*)>/i, '<body class="is-preload">');
    html = html.replace(/(<header\s+id=["']header["'][^>]*>[\s\S]*?<\/header>)/i, `$1\n${navigation}`);
    return addSharedScripts(html);
  }

  if (file === 'tehnicheskoe-zadanie/index.html') {
    html = html.replace(/(<meta\s+name=["']viewport["'][^>]*>)/i, '$1\n  <link rel="stylesheet" href="/assets/css/main.css">');
    html = html.replace(
      /<body[^>]*>\s*<header class=["']site-header["'][^>]*>[\s\S]*?<\/header>\s*<div class=["']container["']>/i,
      `<body class="is-preload">\n<div id="wrapper">\n\t<header id="header"><a href="/" class="logo">АЛ Пулс</a></header>\n${navigation}\n\t<main id="main">\n\t\t<div class="container">`
    );
    html = html.replace(/<\/form>\s*<\/div>\s*<audio\s+id=["']clickSound["']/i, '</form>\n\t\t</div>\n\t</main>\n</div>\n\n<audio id="clickSound"');
    html = html.replace(/<script>\s*\(function\(\)\{\s*const header = document\.querySelector\(["']\.site-header["']\);[\s\S]*?<\/script>/i, '');
    return addSharedScripts(html);
  }

  return html;
}

function updatePage(file, write) {
  const original = fs.readFileSync(file, 'utf8');
  if (isNonPublicHtml(file, original)) return { file, excluded: true, changed: false };
  if (!isManagedPage(file)) return { file, changed: false, valid: hasExpectedMenu(file, original) };

  let updated = original;
  if (additionalPublicPages.has(file)) {
    updated = syncSpecialPage(file, original);
  } else {
    const menuPattern = /<nav\b(?=[^>]*\bid=["']nav["'])[^>]*>[\s\S]*?<\/nav>/i;
    if (!menuPattern.test(updated)) return { file, error: 'No primary #nav element found', changed: false };
    updated = updated.replace(menuPattern, renderNavigation(file));
  }

  const changed = updated !== original;
  if (write && changed) fs.writeFileSync(file, updated, 'utf8');
  return { file, changed, valid: hasExpectedMenu(file, updated) };
}

function hasExpectedMenu(file, html) {
  const menuPattern = /<nav\b(?=[^>]*\bid=["']nav["'])[^>]*>[\s\S]*?<\/nav>/i;
  const menu = html.match(menuPattern)?.[0];
  if (!menu) return false;
  const anchors = [...menu.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const links = anchors.slice(0, 6).map(([, href]) => href);
  const labels = anchors.slice(0, 6).map(([, , label]) => label.replace(/<[^>]*>/g, '').trim());
  const expectedHrefs = file === 'index.html'
    ? ['#services', '#why-us', '#portfolio', '/blog/blog.html', '/spravochnik/', '#contact']
    : ['/#services', '/#why-us', '/#portfolio', '/blog/blog.html', '/spravochnik/', '/#contact'];
  const expectedLabels = ['Услуги', 'Почему мы', 'Портфолио', 'Статьи', 'Справочник', 'Контакты'];
  const active = [...menu.matchAll(/<li\b[^>]*class=["'][^"']*\bactive\b[^"']*["'][^>]*>/gi)].length;
  const expectedActive = activeSection(file) ? 1 : 0;
  return links.length === 6
    && links.every((href, index) => href === expectedHrefs[index])
    && labels.every((label, index) => label === expectedLabels[index])
    && (anchors.length - 6) === 3
    && active === expectedActive
    && /id=["']nav["']/.test(menu)
    && /class=["']links["']/.test(menu)
    && /class=["']icons["']/.test(menu);
}

const allHtml = getTrackedHtml();
const publicHtml = allHtml.filter(file => {
  const html = fs.readFileSync(file, 'utf8');
  return !isNonPublicHtml(file, html);
});
const managedPages = publicHtml.filter(isManagedPage);
const write = process.argv.includes('--write');
const results = [...publicHtml].sort().map(file => updatePage(file, write && isManagedPage(file)));
const errors = results.filter(result => result.error || result.valid === false);
console.log(`${write ? `Synchronized ${managedPages.length} managed pages` : `Checked ${results.length} public HTML pages`}; changed ${results.filter(result => result.changed).length}.`);
if (errors.length) {
  console.error(errors.map(result => `${result.file}: ${result.error || 'menu contract failed'}`).join('\n'));
  process.exitCode = 1;
}
