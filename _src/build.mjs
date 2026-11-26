// Builds frederickuy.com: pre-renders every page from _src/pages and every
// Journal post from content/journal/*.md. No dependencies: `node _src/build.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, '_src');
const require = createRequire(import.meta.url);
const DC = require(path.join(SRC, 'runtime.js'));
const SITE = 'https://frederickuy.com';
const read = (p) => fs.readFileSync(p, 'utf8');
const write = (rel, s) => { const p = path.join(ROOT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* ---------------- Journal posts ---------------- */
function frontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^".*"$/.test(v)) v = JSON.parse(v);
    else if (/^'.*'$/.test(v)) v = v.slice(1, -1).replace(/''/g, "'");
    if (v === 'true') v = true; else if (v === 'false') v = false;
    data[kv[1]] = v;
  }
  return { data, body: m[2] };
}

function inline(s) {
  return s
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src) => `<img src="${src}" alt="${escAttr(alt)}" loading="lazy" style="max-width: 100%; border-radius: 6px">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|\W)_(?!\s)(.+?)_(?=\W|$)/g, '$1<em>$2</em>');
}

const LIST_STYLE = 'margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 10px';
function markdown(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = []; let para = [], list = null, quote = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag} style="${LIST_STYLE}">${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
  const flushQuote = () => { if (quote.length) { out.push(`<blockquote style="margin: 8px 0; padding: 4px 0 4px 24px; border-left: 3px solid #A5521E; font-family: Fraunces, Georgia, serif; font-size: 24px; line-height: 1.45; color: #26231F">${inline(quote.join(' '))}</blockquote>`); quote = []; } };
  const flush = () => { flushPara(); flushList(); flushQuote(); };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flush(); continue; }
    if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/))) {
      flush();
      out.push(`<figure style="margin: 16px 0"><img src="${m[2]}" alt="${escAttr(m[1])}" loading="lazy" style="width: 100%; border-radius: 6px; display: block">${m[3] ? `<figcaption style="font-size: 14px; color: #6A6258; margin-top: 10px; text-align: center">${inline(m[3])}</figcaption>` : ''}</figure>`);
      continue;
    }
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flush();
      const lvl = Math.max(2, m[1].length), size = lvl === 2 ? 30 : 24;
      out.push(`<h${lvl} style="font-size: ${size}px; line-height: 1.2; margin-top: 28px">${inline(m[2])}</h${lvl}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { flush(); out.push('<hr style="border: 0; border-top: 1px solid #DCD3C3; margin: 16px 0">'); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); continue; }
    if ((m = line.match(/^\s*([-*+]|\d+[.)])\s+(.*)$/))) {
      flushPara(); flushQuote();
      const tag = /\d/.test(m[1]) ? 'ol' : 'ul';
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push(m[2]); continue;
    }
    if (list && /^\s{2,}\S/.test(raw)) { list.items[list.items.length - 1] += ' ' + line.trim(); continue; }
    flushList(); flushQuote(); para.push(line.trim());
  }
  flush();
  return out.join('\n');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function loadPosts() {
  const dir = path.join(ROOT, 'content/journal');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const { data, body } = frontmatter(read(path.join(dir, f)));
    const slug = data.slug || f.replace(/\.md$/, '');
    const d = new Date(String(data.date || '1970-01-01').slice(0, 10) + 'T12:00:00Z');
    const words = body.replace(/!\[[^\]]*\]\([^)]*\)/g, '').split(/\s+/).filter(Boolean).length;
    return {
      slug, title: data.title || slug, draft: data.draft === true, date: d,
      dateLabel: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`,
      year: String(d.getUTCFullYear()), read: `${Math.max(1, Math.round(words / 230))} min read`,
      excerpt: data.excerpt || '', image: data.image || '', imageAlt: data.image_alt || data.title || '',
      original: data.original_url || '', html: markdown(body), url: `/journal/${slug}/`,
    };
  }).filter((p) => !p.draft).sort((a, b) => b.date - a.date);
}

/* ---------------- Pages ---------------- */
function parseDC(src) {
  const title = (src.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'Frederick Uy';
  const helmet = (src.match(/<helmet>([\s\S]*?)<\/helmet>/) || [])[1] || '';
  const tpl = src.slice(src.indexOf('</helmet>') + 9, src.lastIndexOf('</x-dc>')).trim();
  const script = (src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/) || [])[1] || 'class Component extends DCLogic { renderVals() { return {}; } }';
  return { title, helmet, tpl, script };
}

function ssr(tpl, script) {
  const ctx = vm.createContext({ DCLogic: DC.DCLogic, window: { addEventListener() {}, matchMedia: () => ({ matches: false }) }, console });
  const Component = vm.runInContext(script + '\n;Component', ctx);
  const comp = new Component({});
  return DC.render(tpl, comp.renderVals(), { handlers: [] });
}

function head({ title, description, url, image, helmet }) {
  const img = SITE + (image || '/images/site/fred-glass.jpg');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${escAttr(description)}">
<link rel="canonical" href="${SITE}${url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Frederick Uy">
<meta property="og:title" content="${escAttr(title)}">
<meta property="og:description" content="${escAttr(description)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
${helmet.trim()}
</head>`;
}

function pageHTML(dc, meta, interactive) {
  const body = ssr(dc.tpl, dc.script);
  let js = '';
  if (interactive) {
    js = `\n<script src="/assets/runtime.js"></script>\n<script>\nvar DCLogic = DC.DCLogic;\n${dc.script.trim()}\nDC.mount(Component, document.getElementById('dc-root'), ${JSON.stringify(dc.tpl).replace(/<\//g, '<\\/')});\n</script>`;
  }
  return `${head({ ...meta, helmet: dc.helmet })}\n<body>\n<div id="dc-root">${body}</div>${js}\n</body>\n</html>\n`;
}

const PAGES = [
  { file: 'home', url: '/', title: 'Frederick Uy · Data engineer and photographer', description: 'Frederick Uy is a data engineer and the photographer behind FMU Photography, based in Tacoma, Washington.' },
  { file: 'about', url: '/about/', title: 'About · Frederick Uy', description: 'First-gen Filipino immigrant, data engineer focused on organizational health and strategy, and the photographer behind FMU Photography.' },
  { file: 'work', url: '/work/', title: 'Work · Frederick Uy', description: 'Data engineering for headcount, hiring and strategy: case studies, experience and toolkit.' },
  { file: 'photography', url: '/photography/', title: 'Photography · FMU Photography', description: 'Portraits, graduations and proposals around Tacoma and Seattle. Natural light, real moments.', image: '/images/gallery/portrait-01.jpg' },
  { file: 'journal', url: '/journal/', title: 'Journal · Frederick Uy', description: 'Notes on growing up, college, internships, data and photography.' },
  { file: 'contact', url: '/contact/', title: 'Contact · Frederick Uy', description: 'Hiring, booking a shoot, or just saying hi? Get in touch.' },
];

function homeLatest(tpl, posts) {
  const cards = posts.slice(0, 3).map((p) => `<a href="${p.url}" class="jcard" style="text-decoration: none; color: #26231F; display: flex; flex-direction: column; gap: 14px">
<span style="display: block; overflow: hidden; border-radius: 4px; aspect-ratio: 3 / 2; background: #E9E2D6"><img src="${p.image}" alt="${escAttr(p.imageAlt)}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block"></span>
<span class="mono" style="color: #A5521E">${p.dateLabel} · ${p.read}</span>
<h3 style="font-size: 24px; line-height: 1.25">${p.title}</h3>
<p style="font-size: 16px; line-height: 1.6; color: #4F4942">${p.excerpt}</p>
</a>`).join('\n');
  return tpl.replace(/<div class="cols3">\s*<a href="\/journal\/[\s\S]*?<\/a>\s*<\/div>/, `<div class="cols3">\n${cards}\n</div>`);
}

function journalData(script, posts) {
  const all = posts.map((p) => ({ title: p.title, date: p.dateLabel, year: p.year, read: p.read, excerpt: p.excerpt, url: p.url, img: p.image, alt: p.imageAlt, draft: false }));
  return script.replace(/const all = \[[\s\S]*?\n\];/, () => 'const all = ' + JSON.stringify(all, null, 2) + ';');
}

function postPage(sample, p, newer, older) {
  const article = `<article>
<header class="read" style="padding-top: 40px; padding-bottom: 36px; display: flex; flex-direction: column; gap: 18px">
<a href="/journal/#writing" class="mono" style="color: #6A6258; text-decoration: none">← All entries</a>
<h1 style="font-size: clamp(38px, 4.6vw, 58px); line-height: 1.08">${p.title}</h1>
<p class="mono" style="color: #A5521E">${p.dateLabel} · ${p.read}</p>
</header>
${p.image ? `<div class="wrap" style="max-width: 1160px; padding-bottom: 48px">
<img src="${p.image}" alt="${escAttr(p.imageAlt)}" style="width: 100%; max-height: 480px; object-fit: cover; border-radius: 6px; display: block">
</div>` : ''}
<div class="read prose" style="padding-bottom: 72px">
${p.html}
</div>
</article>`;
  const card = (q, label, right) => q ? `<a href="${q.url}"${right ? ' style="text-align: right"' : ''}><span class="mono" style="color: #6A6258">${label}</span><span style="font-family: Fraunces, Georgia, serif; font-size: 20px; line-height: 1.3">${q.title}</span></a>` : '<span></span>';
  let tpl = sample.tpl.replace(/<article>[\s\S]*<\/article>/, () => article);
  tpl = tpl.replace(/<p style="font-size: 15px; color: #6A6258">Originally published[\s\S]*?<\/p>/, () => p.original ? `<p style="font-size: 15px; color: #6A6258">Originally published on <a href="${p.original}">Medium</a>.</p>` : '<span></span>');
  tpl = tpl.replace(/(<nav class="pn"[^>]*>)[\s\S]*?(<\/nav>)/, (_, a, b) => `${a}\n${card(newer, '← Newer', false)}${card(older, 'Older →', true)}\n${b}`);
  const html = DC.render(tpl, {}, { handlers: [] });
  return `${head({ title: `${p.title} · Frederick Uy`, description: p.excerpt || p.title, url: p.url, image: p.image, helmet: sample.helmet })}\n<body>\n<div id="dc-root">${html}</div>\n</body>\n</html>\n`;
}

/* ---------------- Build ---------------- */
const posts = loadPosts();
// Remove pages for posts that were deleted or turned back into drafts
const jdir = path.join(ROOT, 'journal');
if (fs.existsSync(jdir)) for (const d of fs.readdirSync(jdir)) {
  if (fs.statSync(path.join(jdir, d)).isDirectory() && !posts.some((p) => p.slug === d)) fs.rmSync(path.join(jdir, d), { recursive: true });
}
const urls = [];
for (const pg of PAGES) {
  const dc = parseDC(read(path.join(SRC, 'pages', pg.file + '.dc.html')));
  if (pg.file === 'home') dc.tpl = homeLatest(dc.tpl, posts);
  if (pg.file === 'journal') dc.script = journalData(dc.script, posts);
  const interactive = /\{\{/.test(dc.tpl);
  write(path.join(pg.url, 'index.html'), pageHTML(dc, pg, interactive));
  urls.push(pg.url);
}
const sample = parseDC(read(path.join(SRC, 'pages', '_post-sample.dc.html')));
posts.forEach((p, i) => { write(path.join(p.url, 'index.html'), postPage(sample, p, posts[i - 1], posts[i + 1])); urls.push(p.url); });

// 404 page, built from the post layout
const notFound = sample.tpl.replace(/<article>[\s\S]*<\/article>/, `<section class="read" style="padding-top: 96px; padding-bottom: 120px; display: flex; flex-direction: column; gap: 20px">
<p class="mono" style="color: #A5521E">404</p>
<h1 style="font-size: clamp(40px, 5vw, 64px); line-height: 1.05">This page wandered off.</h1>
<p style="font-size: 18px; line-height: 1.7; color: #4F4942">The link may be old or mistyped. Here are some good places to pick back up:</p>
<p style="font-size: 18px; display: flex; gap: 20px; flex-wrap: wrap; font-weight: 600"><a href="/">Home</a><a href="/work/">Work</a><a href="/photography/">Photography</a><a href="/journal/">Journal</a></p>
</section>`).replace(/<section class="read" style="padding-bottom: 86px[\s\S]*?<\/section>/, '');
write('404.html', `${head({ title: 'Page not found · Frederick Uy', description: 'This page could not be found.', url: '/404', helmet: sample.helmet })}\n<body>\n<div id="dc-root">${DC.render(notFound, {}, { handlers: [] })}</div>\n</body>\n</html>\n`);

for (const f of fs.readdirSync(path.join(SRC, 'static'))) fs.copyFileSync(path.join(SRC, 'static', f), path.join(ROOT, f));
fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
fs.copyFileSync(path.join(SRC, 'runtime.js'), path.join(ROOT, 'assets/runtime.js'));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`Built ${PAGES.length} pages and ${posts.length} posts.`);
