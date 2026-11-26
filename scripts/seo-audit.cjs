'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = process.cwd();
const base = 'https://alpool.ru';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'seo-exclusions.json'), 'utf8'));
const excluded = new Map(manifest.excludedFromIndexingAndSitemap.map(item => [item.path, item.reason]));
const knownOrphans = new Set(manifest.knownIndexableOrphans);
const removedDemos = new Set(manifest.removedDemonstrationPages);
const errors = [];
const warnings = [];

function walk(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', '.worktrees', '.test-artifacts'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, result);
    else if (/\.html?$/i.test(entry.name)) result.push(file);
  }
  return result;
}

function rel(file) { return path.relative(root, file).replaceAll('\\', '/'); }
function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3] ?? '').replaceAll('&amp;', '&').trim() : '';
}
function tags(html, name) { return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => match[0]); }
function metaContent(html, selector) {
  const found = tags(html, 'meta').filter(tag => selector(tag));
  return { count: found.length, value: found.length ? attr(found[0], 'content') : '' };
}
function plain(html) { return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, ' ').trim(); }
function canonicalUrl(file, html) {
  const matches = tags(html, 'link').filter(tag => /\brel\s*=\s*["'][^"']*\bcanonical\b/i.test(tag));
  return { count: matches.length, value: matches.length ? attr(matches[0], 'href') : '' };
}
function robotsNoindex(html) {
  const meta = metaContent(html, tag => /\bname\s*=\s*["']robots["']/i.test(tag));
  return /\bnoindex\b/i.test(meta.value);
}
function pathFromUrl(raw, sourceFile) {
  try {
    const u = new URL(raw, `${base}/${sourceFile}`);
    if (u.origin !== base) return null;
    let pathname = decodeURIComponent(u.pathname).replace(/^\/+/, '');
    if (!pathname || pathname.endsWith('/')) pathname += 'index.html';
    const candidate = path.resolve(root, pathname);
    if (!candidate.startsWith(path.resolve(root) + path.sep) && candidate !== path.resolve(root, 'index.html')) return null;
    if (!fs.existsSync(candidate) && fs.existsSync(`${candidate}.html`)) return `${candidate}.html`;
    return candidate;
  } catch { return null; }
}
function fragmentExists(file, hash) {
  if (!hash) return true;
  const decoded = decodeURIComponent(hash.replace(/^#/, ''));
  const html = fs.readFileSync(file, 'utf8');
  return new RegExp(`\\b(?:id|name)\\s*=\\s*["']${decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i').test(html);
}

const htmlFiles = walk(root).sort();
const routeByFile = new Map(htmlFiles.map(file => [rel(file), file]));
const indexed = [];
const inbound = new Map(htmlFiles.map(file => [rel(file), new Set()]));
const titleOwners = new Map();
const descriptionOwners = new Map();
const h1Owners = new Map();
const checkedCss = new Set();

for (const file of htmlFiles) {
  const route = rel(file);
  const html = fs.readFileSync(file, 'utf8');
  const head = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i) || [null, ''])[1];
  const noindex = robotsNoindex(head);
  const redirect = /<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i.test(head);
  const intentional = excluded.has(route);
  const canonical = canonicalUrl(file, head);
  const titleTags = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)];
  const title = titleTags.length ? plain(titleTags[0][1]) : '';
  const desc = metaContent(head, tag => /\bname\s*=\s*["']description["']/i.test(tag));
  const lang = attr((html.match(/<html\b[^>]*>/i) || [''])[0], 'lang');
  const viewport = metaContent(head, tag => /\bname\s*=\s*["']viewport["']/i.test(tag));
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/gi)].map(match => plain(match[1])).filter(Boolean);
  const isIndexable = !intentional && !noindex && !redirect;

  if (intentional && !noindex && !redirect && !['404.html', 'yandex_7501679aa8a44979.html'].includes(route)) {
    errors.push(`${route}: listed as intentionally excluded but lacks noindex/redirect`);
  }
  if (!intentional && !noindex && !redirect) {
    indexed.push({ file, route, html, head, canonical, title, desc, h1 });
    if (titleTags.length !== 1 || !title) errors.push(`${route}: expected one nonempty title, found ${titleTags.length}`);
    if (desc.count !== 1 || !desc.value) errors.push(`${route}: expected one nonempty meta description, found ${desc.count}`);
    if (h1.length !== 1) errors.push(`${route}: expected exactly one nonempty H1, found ${h1.length}`);
    if (canonical.count !== 1) errors.push(`${route}: expected exactly one canonical, found ${canonical.count}`);
    else {
      let parsed;
      try { parsed = new URL(canonical.value); } catch {}
      if (!parsed || parsed.protocol !== 'https:' || parsed.hostname !== 'alpool.ru') errors.push(`${route}: canonical must be an absolute HTTPS ALPOOL URL`);
      else if (canonical.value !== `${base}/${route.replace(/index\.html$/, '')}` && canonical.value !== `${base}/${route}`) errors.push(`${route}: canonical does not point to this page (${canonical.value})`);
      else {
        const target = pathFromUrl(canonical.value, route);
        if (!target || !fs.existsSync(target)) errors.push(`${route}: canonical target does not exist (${canonical.value})`);
      }
    }
    if (!lang || lang.toLowerCase() !== 'ru') errors.push(`${route}: html lang must be ru`);
    if (!viewport.count) errors.push(`${route}: missing viewport meta`);
    for (const [value, map, label] of [[title.toLocaleLowerCase('ru'), titleOwners, 'title'], [desc.value.toLocaleLowerCase('ru'), descriptionOwners, 'description'], [h1[0]?.toLocaleLowerCase('ru') || '', h1Owners, 'H1']]) {
      if (!value) continue;
      if (!map.has(value)) map.set(value, []);
      map.get(value).push(route);
      if (map.get(value).length === 2) warnings.push(`duplicate ${label}: ${map.get(value).join(' ↔ ')}`);
    }

    const ogRequired = ['og:title', 'og:description', 'og:type', 'og:url', 'og:image', 'og:image:alt', 'og:site_name', 'og:locale'];
    for (const property of ogRequired) {
      const matches = tags(head, 'meta').filter(tag => attr(tag, 'property') === property);
      if (matches.length !== 1 || !attr(matches[0] || '', 'content')) errors.push(`${route}: ${property} must occur once with content`);
    }
    const ogUrl = tags(head, 'meta').find(tag => attr(tag, 'property') === 'og:url');
    if (ogUrl && canonical.value && attr(ogUrl, 'content') !== canonical.value) errors.push(`${route}: og:url differs from canonical`);
    const ogImage = tags(head, 'meta').find(tag => attr(tag, 'property') === 'og:image');
    if (ogImage) {
      const imageUrl = attr(ogImage, 'content');
      const imagePath = pathFromUrl(imageUrl, route);
      if (!imagePath || !fs.existsSync(imagePath)) errors.push(`${route}: Open Graph image is not a local existing resource (${imageUrl})`);
      if (!/\.(?:jpe?g|png|gif)(?:[?#].*)?$/i.test(imageUrl)) warnings.push(`${route}: review social-platform compatibility of Open Graph image format`);
    }
    for (const [property, expected] of [['og:site_name', 'ALPOOL'], ['og:locale', 'ru_RU']]) {
      const item = tags(head, 'meta').find(tag => attr(tag, 'property') === property);
      if (item && attr(item, 'content') !== expected) errors.push(`${route}: ${property} should be ${expected}`);
    }
    const jsonLd = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)];
    for (const block of jsonLd) {
      try { JSON.parse(block[1]); } catch (error) { errors.push(`${route}: invalid JSON-LD (${error.message})`); }
    }
    for (const img of tags(html, 'img')) {
      if (!/\balt\s*=/.test(img)) errors.push(`${route}: img missing alt (${attr(img, 'src') || 'no src'})`);
    }
    if (!jsonLd.length) warnings.push(`${route}: no structured data; add only when a supported schema matches the page`);
  }

  const references = [
    ...[...html.matchAll(/<(?:a|area)\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi)].map(m => ({ tag: m[0], value: m[1] ?? m[2] ?? m[3], kind: 'link' })),
    ...tags(html, 'img').map(tag => ({ tag, value: attr(tag, 'src'), kind: 'resource' })),
    ...tags(html, 'script').filter(tag => /\bsrc\s*=/.test(tag)).map(tag => ({ tag, value: attr(tag, 'src'), kind: 'resource' })),
    ...tags(html, 'link').filter(tag => /\brel\s*=\s*["'][^"']*stylesheet/i.test(tag)).map(tag => ({ tag, value: attr(tag, 'href'), kind: 'resource' }))
  ];
  for (const ref of references) {
    if (!ref.value || /^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(ref.value) || /^https?:\/\//i.test(ref.value) || ref.value.startsWith('//')) continue;
    const resolved = pathFromUrl(ref.value, route);
    if (!resolved) continue;
    if (ref.kind === 'resource') {
      if (!fs.existsSync(resolved)) errors.push(`${route}: missing local resource ${ref.value}`);
      else if (/\.css(?:[?#].*)?$/i.test(resolved) && !checkedCss.has(resolved)) {
        checkedCss.add(resolved);
        const css = fs.readFileSync(resolved, 'utf8');
        for (const match of css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) {
          const resource = match[2].trim();
          if (!resource || /^(?:data:|https?:|\/\/|#|var\()/i.test(resource)) continue;
          const clean = resource.split(/[?#]/, 1)[0];
          const target = path.resolve(path.dirname(resolved), clean.replace(/^\//, ''));
          const rootTarget = clean.startsWith('/') ? path.resolve(root, clean.slice(1)) : target;
          if (!fs.existsSync(rootTarget)) errors.push(`${rel(resolved)}: missing CSS resource ${resource}`);
        }
      }
      continue;
    }
    let url;
    try { url = new URL(ref.value, `${base}/${route}`); } catch { continue; }
    const target = pathFromUrl(ref.value, route);
    if (!target || !fs.existsSync(target)) { errors.push(`${route}: broken internal link ${ref.value}`); continue; }
    if (url.hash && !fragmentExists(target, url.hash)) errors.push(`${route}: broken internal fragment ${ref.value}`);
    const targetRoute = rel(target);
    if (targetRoute !== route && inbound.has(targetRoute)) inbound.get(targetRoute).add(route);
  }
}

for (const [route] of routeByFile) {
  if (removedDemos.has(route) && fs.existsSync(path.join(root, route))) errors.push(`demonstration page still exists: ${route}`);
}

const sitemapText = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
if (!/^\s*<\?xml\b/i.test(sitemapText) || !/<urlset\b[^>]*>[\s\S]*<\/urlset>\s*$/i.test(sitemapText)) errors.push('sitemap.xml: invalid XML envelope');
const sitemapUrls = [...sitemapText.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map(match => match[1].trim().replaceAll('&amp;', '&'));
if (sitemapUrls.length !== new Set(sitemapUrls).size) errors.push('sitemap.xml: duplicate URL entries');
const sitemapSet = new Set(sitemapUrls);
for (const url of sitemapUrls) {
  let parsed;
  try { parsed = new URL(url); } catch { errors.push(`sitemap.xml: invalid URL ${url}`); continue; }
  if (parsed.origin !== base) errors.push(`sitemap.xml: non-canonical host or scheme ${url}`);
  const file = pathFromUrl(url, 'sitemap.xml');
  if (!file || !fs.existsSync(file)) errors.push(`sitemap.xml: route has no local HTML ${url}`);
  const route = file && fs.existsSync(file) ? rel(file) : '';
  if (excluded.has(route)) errors.push(`sitemap.xml: intentionally excluded page is listed (${route})`);
  const page = indexed.find(item => item.route === route);
  if (page && page.canonical.value !== url) errors.push(`sitemap.xml: URL conflicts with canonical (${url} vs ${page.canonical.value})`);
}
for (const page of indexed) {
  const canonical = page.canonical.value;
  if (canonical && !sitemapSet.has(canonical)) errors.push(`${page.route}: indexable page canonical missing from sitemap (${canonical})`);
}
for (const page of indexed) {
  const sources = inbound.get(page.route) || new Set();
  if (!sources.size && !knownOrphans.has(page.route)) errors.push(`${page.route}: indexable page has no inbound internal links`);
  else if (!sources.size) warnings.push(`${page.route}: documented indexable orphan pending approved commercial-linking plan`);
}

for (const [label, owners] of [['title', titleOwners], ['description', descriptionOwners]]) {
  for (const [value, routes] of owners) {
    if (routes.length > 1) errors.push(`duplicate ${label} on ${routes.join(' ↔ ')}: ${value}`);
  }
}
for (const [value, routes] of h1Owners) {
  if (routes.length > 1) warnings.push(`shared H1 across distinct routes; review intent before editing: ${routes.join(' ↔ ')}`);
}

const external = spawnSync(process.execPath, [path.join(root, 'scripts/external-links.cjs')], { cwd: root, encoding: 'utf8' });
if (external.status !== 0) errors.push(`external-link policy failed: ${(external.stderr || external.stdout).trim()}`);

console.log(`SEO audit: ${htmlFiles.length} HTML files, ${indexed.length} indexable pages, ${sitemapUrls.length} sitemap URLs.`);
console.log(`Errors: ${errors.length}; informational warnings: ${warnings.length}.`);
for (const warning of warnings.slice(0, 20)) console.warn(`INFO: ${warning}`);
if (warnings.length > 20) console.warn(`INFO: ${warnings.length - 20} additional informational warnings (see seo-technical-fixes-stage2-report.md).`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) process.exitCode = 1;
