// Generate static copies from index.html so pages work before JavaScript loads.
// Usage: node scripts/sync-inquiry-footer.cjs [--check]
const fs = require('node:fs');
const path = require('node:path');
const home = fs.readFileSync('index.html', 'utf8');
const ctaMatch = home.match(/<section class="post cta-section cta-light" aria-labelledby="tech-task-title">[\s\S]*?<\/section>/);
const footerMatch = home.match(/<footer id="footer">[\s\S]*?<\/footer>/);
if (!ctaMatch || !footerMatch) throw new Error('Homepage reference blocks not found');
const groups = ['articles', 'blog', 'kalkulyatori', 'napravleniya', 'servis', 'spravochnik'];
const files = groups.flatMap(g => fs.readdirSync(g).filter(n => n.endsWith('.html')).sort().map(n => `${g}/${n}`));
const specialCalculators = new Set(['kalkulyatori/kalkulyator-obema-basseyna.html','kalkulyatori/podbor-filtra-i-nasosa.html','kalkulyatori/raschet-nagreva-vody-basseyna.html','kalkulyatori/raschet-truboprovodov-basseyna.html']);
const ctaBegin = '<!-- BEGIN ALPOOL SHARED TASK CTA -->', ctaEnd = '<!-- END ALPOOL SHARED TASK CTA -->';
const footerBegin = '<!-- BEGIN ALPOOL SHARED INQUIRY -->', footerEnd = '<!-- END ALPOOL SHARED INQUIRY -->';
const sharedCta = `${ctaBegin}\n${ctaMatch[0]}\n${ctaEnd}`;
let footerHtml = footerMatch[0];
// Keep #footer and #contact as existing navigation targets; form IDs are namespaced
// to coexist with the calculators' purpose-specific consultation forms.
for (const id of ['name','phone','email','message','lead-files','lead-files-help','lead-files-selected','alpool-personal-data-consent-home','alpool-personal-data-consent-home-links']) {
  footerHtml = footerHtml.replaceAll(`id="${id}"`, `id="unified-${id}"`).replaceAll(`for="${id}"`, `for="unified-${id}"`);
}
footerHtml = footerHtml.replace(/aria-describedby="([^"]+)"/g, (_, value) => `aria-describedby="${value.split(/\s+/).map(id => `unified-${id}`).join(' ')}"`);
const sharedFooter = `${footerBegin}\n${footerHtml}\n${footerEnd}`;
const dependencies = ['jquery.min.js','jquery.scrollex.min.js','jquery.scrolly.min.js','browser.min.js','breakpoints.min.js','util.js','main.js'].map(n => `<script src="/assets/js/${n}"></script>`).join('');
let changed=0; const pending=[];
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8'); let html = before;
  const replaceMarked = (text, begin, end, replacement) => {
    const start = text.indexOf(begin), finish = text.indexOf(end);
    if (start < 0 || finish < start) throw new Error(`${file}: invalid shared markers`);
    return text.slice(0,start) + replacement + text.slice(finish + end.length);
  };
  if (html.includes(ctaBegin) || html.includes(footerBegin)) {
    html = replaceMarked(html, ctaBegin, ctaEnd, sharedCta);
    html = replaceMarked(html, footerBegin, footerEnd, sharedFooter);
  } else if (specialCalculators.has(file)) {
    if (!/<footer id="footer"/.test(html)) throw new Error(`${file}: calculator form missing`);
    html = html.replace('<footer id="footer"', '<footer id="calculator-context-footer"');
    if (!html.includes('</main>')) throw new Error(`${file}: main not found`);
    html = html.replace('</main>', `${sharedCta}\n</main>\n${sharedFooter}`);
  } else if (file.startsWith('spravochnik/')) {
    if (/<footer id="footer"/.test(html) || !html.includes('</main>')) throw new Error(`${file}: unexpected structure`);
    html = html.replace('</main>', `${sharedCta}\n</main>\n${sharedFooter}`);
    html = html.replace('</body>', `${dependencies}</body>`);
  } else {
    const oldFooter = /<footer id="footer">[\s\S]*?<\/footer>/;
    if (!oldFooter.test(html)) throw new Error(`${file}: footer not found`);
    if (!html.includes('</main>')) throw new Error(`${file}: main not found`);
    html = html.replace('</main>', `${sharedCta}\n</main>`).replace(oldFooter, sharedFooter);
  }
  if (html !== before) { changed++; pending.push([file,html]); if (process.argv.includes('--check')) console.error(`Out of date: ${file}`); }
}
if (!process.argv.includes('--check')) for (const [file,html] of pending) fs.writeFileSync(file, html, 'utf8');
console.log(`${files.length} target pages; ${changed} ${process.argv.includes('--check') ? 'out of date' : 'updated'}`);
if (process.argv.includes('--check') && changed) process.exitCode = 1;
