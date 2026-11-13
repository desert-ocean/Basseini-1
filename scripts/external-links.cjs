'use strict';
const fs=require('node:fs'),path=require('node:path');
// Exact document URLs only. Approval is required before adding a government document here.
const allowedGovernmentDocuments=new Set([]);
const root=process.cwd(),skip=new Set(['.git','.worktrees','node_modules','.test-artifacts','.tmp-edge','seo-rewrite']);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{if(skip.has(e.name)||e.name.startsWith('.'))return [];const p=path.join(dir,e.name);return e.isDirectory()?walk(p):/\.(html|js)$/i.test(e.name)?[p]:[]})}
function classify(raw){let u=raw.trim().replace(/&amp;/g,'&');if(!/^(?:https?:)?\/\//i.test(u))return null;try{const parsed=new URL(u.startsWith('//')?'https:'+u:u);if(['alpool.ru','www.alpool.ru'].includes(parsed.hostname.toLowerCase()))return null;return {url:parsed.href,allowed:allowedGovernmentDocuments.has(parsed.href)}}catch{return null}}
const items=[];
for(const file of walk(root)){
 const text=fs.readFileSync(file,'utf8'),relative=path.relative(root,file).replace(/\\/g,'/');
 const patterns=[['ссылка',/<(?:a|area)\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi],['ссылка',/<(?:a|area)\b[^>]*?\bhref\s*=\s*([^\s"'=<>\x60]+)[^>]*>/gi],['переход в JavaScript',/(?:window\.open|(?:window\.)?location\.(?:assign|replace))\s*\(\s*["'`]([^"'`]+)["'`]/gi],['переход в JavaScript',/(?:window\.)?location(?:\.href)?\s*=\s*["'`]([^"'`]+)["'`]/gi],['переход в JavaScript',/\.href\s*=\s*["'`]([^"'`]+)["'`]/gi],['переход в JavaScript',/\.setAttribute\s*\(\s*["']href["']\s*,\s*["'`]([^"'`]+)["'`]/gi]];
 for(const [kind,re] of patterns)for(const match of text.matchAll(re)){const info=classify(match[1]);if(info)items.push({file:relative,kind,...info})}
 for(const meta of text.matchAll(/<meta\b[^>]*>/gi)){if(!/http-equiv\s*=\s*["']?refresh/i.test(meta[0]))continue;const m=meta[0].match(/\burl\s*=\s*(https?:\/\/[^\s;"'>]+)/i);if(m){const info=classify(m[1]);if(info)items.push({file:relative,kind:'автоматический переход',...info})}}
}
if(process.argv.includes('--report')){
 const esc=s=>s.replace(/\|/g,'\\|');
 let report='# Инвентаризация внешних переходов\n\nПроверены статические адреса в ссылках HTML и буквальные адреса JavaScript-переходов. Технические подключения API, шрифтов, скриптов, аналитики и карты не классифицируются как ссылки. Динамически собираемые адреса требуют ручной проверки. Инвентаризация не изменяет существующие интеграции.\n\n| Файл | Адрес | Назначение | Статус | Рекомендуемое действие |\n|---|---|---|---|---|\n';
 for(const i of items){const host=new URL(i.url).hostname;const contact=['t.me','telegram.me','wa.me','api.whatsapp.com','maps.google.com','yandex.ru','yandex.com'].includes(host);report+=`| ${esc(i.file)} | ${esc(i.url)} | ${contact?'контакт или карта (проверить вручную)':i.kind} | ${i.allowed?'разрешён':'не включён в исключения политики'} | ${i.allowed?'сохранить':contact?'интеграция: не изменять без анализа и отдельного согласования':'проверить назначение; заменить внутренним материалом или библиографией после согласования'} |\n`}
 fs.writeFileSync('EXTERNAL-LINKS-AUDIT.md',report,'utf8');console.log(`Найдено внешних переходов: ${items.length}`);
}else{for(const i of items.filter(i=>!i.allowed))console.error(`${i.file}: ${i.url} (${i.kind})`);const bad=items.filter(i=>!i.allowed);console.log(`Запрещённых внешних переходов: ${bad.length}`);if(bad.length)process.exitCode=1}
