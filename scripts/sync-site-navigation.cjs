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

  const originalIsValid = hasExpectedMenu(file, original);
  if (!write && originalIsValid) return { file, changed: false, valid: true };

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
  return {
    file,
    changed,
    valid: write ? hasExpectedMenu(file, updated) : originalIsValid,
    needsWrite: !originalIsValid
  };
}

function hasExpectedMenu(file, html) {
  const navs = [...html.matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav\s*>/gi)]
    .filter(([, attrs]) => readAttribute(attrs, 'id') === 'nav');
  if (navs.length !== 1) return false;
  const menu = navs[0][2];
  const lists = [...menu.matchAll(/<ul\b([^>]*)>([\s\S]*?)<\/ul\s*>/gi)];
  const linkLists = lists.filter(([, attrs]) => hasClass(attrs, 'links'));
  const iconLists = lists.filter(([, attrs]) => hasClass(attrs, 'icons'));
  if (linkLists.length !== 1 || iconLists.length !== 1) return false;

  const links = listItems(linkLists[0][2]);
  const icons = listItems(iconLists[0][2]);
  const expectedHrefs = file === 'index.html'
    ? ['#services', '#why-us', '#portfolio', '/blog/blog.html', '/spravochnik/', '#contact']
    : ['/#services', '/#why-us', '/#portfolio', '/blog/blog.html', '/spravochnik/', '/#contact'];
  const expectedLabels = ['Услуги', 'Почему мы', 'Портфолио', 'Статьи', 'Справочник', 'Контакты'];
  const expectedContacts = [
    { href: 'tel:+74956446654', label: 'Телефон', icon: 'fa-phone' },
    { href: 'https://wa.me/79856446654', label: 'WhatsApp', icon: 'fa-whatsapp' },
    { href: 'https://t.me/desertocean', label: 'Telegram', icon: 'fa-telegram-plane' }
  ];
  const expectedActive = activeSection(file);

  return links.length === 6
    && links.every((item, index) => item.href === expectedHrefs[index]
      && item.label === expectedLabels[index]
      && item.active === (expectedActive === ['services', 'why-us', 'portfolio', 'articles', 'reference', 'contact'][index]))
    && icons.length === expectedContacts.length
    && icons.every((item, index) => item.href === expectedContacts[index].href
      && item.label === expectedContacts[index].label
      && item.classes.includes(expectedContacts[index].icon));
}

function readAttribute(attrs, name) {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : '';
}

function hasClass(attrs, className) {
  return readAttribute(attrs, 'class').split(/\s+/).includes(className);
}

function listItems(listHtml) {
  return [...listHtml.matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li\s*>/gi)].map(([, liAttrs, content]) => {
    const anchor = content.match(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/i);
    if (!anchor) return { href: '', label: '', classes: '', active: hasClass(liAttrs, 'active') };
    const anchorText = anchor[2].replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').trim();
    return {
      href: readAttribute(anchor[1], 'href'),
      label: anchorText,
      classes: readAttribute(anchor[1], 'class').split(/\s+/).filter(Boolean),
      active: hasClass(liAttrs, 'active')
    };
  });
}

if (require.main === module) {
  const allHtml = getTrackedHtml();
  const publicHtml = allHtml.filter(file => {
    if (!fs.existsSync(file)) return false;
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
}

module.exports = {
  activeSection,
  hasExpectedMenu,
  listItems,
  renderNavigation,
  updatePage
};
