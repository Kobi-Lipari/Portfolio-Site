// Builds the static site into ./dist using only Node's standard library.
// Run: node build.mjs
import { mkdir, writeFile, copyFile, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { projects } from './src/projects.mjs';

// PREVIEW=1 writes relative links (with index.html) so the site works from any folder or preview host.
const PREVIEW = process.env.PREVIEW === '1';
const u = (depth, target = '') => {
  if (!PREVIEW) return '/' + target;
  const [path, hash] = target.split('#');
  const file = path === '' || path.endsWith('/') ? path + 'index.html' : path;
  return '../'.repeat(depth) + file + (hash !== undefined ? '#' + hash : '');
};

const SITE = {
  name: 'Kobi Lipari',
  url: 'https://kobilipari.com',
  description: 'Kobi Lipari — data analyst and web developer. I turn messy data into answers, and I design the spotlight.',
  email: 'KobiLipari@gmail.com',
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kobi-lipari-2a8b24327/' },
    { label: 'GitHub', href: 'https://github.com/Kobi-Lipari' },
    { label: 'Tableau Public', href: '#' },
  ],
  // Until src/resume.pdf exists, the Résumé link goes to a short placeholder page.
  resume: existsSync('src/resume.pdf') ? 'resume.pdf' : 'resume/',
  headshot: existsSync('src/img/headshot.webp') ? 'headshot' : null,
};

// Escape text. [Placeholders] are left out of the live site; DRAFT=1 shows them highlighted
// so they're easy to find and replace.
const DRAFT = process.env.DRAFT === '1';
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const txt = (s = '') => DRAFT
  ? esc(s).replace(/\[[^\]]+\]/g, (m) => `<span class="todo">${m}</span>`)
  : esc(String(s).replace(/\s*\[[^\]]+\]/g, '').trim());

const head = ({ title, description, path, depth = 0, fonts = '' }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE.url}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE.url}${path}">
<meta name="theme-color" content="#F3EEE6">
<script>(function(){var t=null;try{t=localStorage.getItem('theme')}catch(e){}var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light'})()</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='16' height='32' fill='%230E2438'/%3E%3Crect x='16' width='16' height='32' fill='%23F3EEE6'/%3E%3Crect x='15' width='2' height='32' fill='%23C8553A'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1${fonts}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${u(depth, 'styles.css')}">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>`;

const nav = (depth = 0) => `
<header class="nav">
  <a class="nav__name" href="${u(depth)}">${SITE.name}</a>
  <nav class="nav__links" aria-label="Main">
    <a class="hide-sm" href="${u(depth, '#built')}">Build</a>
    <a class="hide-sm" href="${u(depth, '#designed')}">Design</a>
    <a class="hide-sm" href="${u(depth, '#about')}">About</a>
    <span class="nav__tools">
      <button type="button" class="icon-btn icon-btn--wide hide-sm" data-palette-open aria-label="Jump to a page or action" title="Jump to (Ctrl/⌘ K)">
        ${ICON.search}<kbd><span data-shortcut-mod>⌘</span>K</kbd>
      </button>
      <button type="button" class="icon-btn" data-bp-toggle aria-pressed="false" aria-label="Blueprint mode" title="Blueprint mode (B)">${ICON.ruler}</button>
      <button type="button" class="icon-btn" data-theme-toggle aria-pressed="false" aria-label="Switch to dark theme" title="Theme">${ICON.moon}${ICON.sun}</button>
    </span>
    <a class="pill" href="${u(depth, SITE.resume)}">Résumé</a>
  </nav>
</header>`;

// What the command palette can jump to, per page (links depend on depth
// in preview builds). Read by src/site.js.
const siteIndex = (depth) => {
  const items = [
    ...projects.map((p) => ({ group: 'Projects', title: p.title, hint: p.lane === 'build' ? 'Built' : 'Designed', keywords: `${p.tools} ${p.kind}`, href: u(depth, `work/${p.slug}/`) })),
    { group: 'On this site', title: 'Built work', keywords: 'engineering analysis', href: u(depth, '#built') },
    { group: 'On this site', title: 'Designed work', keywords: 'presentation ux', href: u(depth, '#designed') },
    { group: 'On this site', title: 'About Kobi', keywords: 'bio experience', href: u(depth, '#about') },
    { group: 'On this site', title: 'Résumé', keywords: 'cv pdf', href: u(depth, SITE.resume) },
    ...projects.flatMap((p) => p.links.filter((l) => l.href.startsWith('http')).map((l) => ({
      group: 'Live work', title: `${p.title}: ${l.label}`, hint: '↗', keywords: 'live site open', href: l.href, external: true,
    }))),
    { group: 'Actions', title: 'Copy email address', hint: SITE.email, keywords: 'contact hire mail', action: 'copy-email' },
    { group: 'Actions', title: 'Email Kobi', keywords: 'contact hire', href: `mailto:${SITE.email}` },
    { group: 'Actions', title: 'Show the blueprint of this page', hint: 'B', keywords: 'inspect design spec', action: 'blueprint' },
    { group: 'Actions', title: 'Switch theme', keywords: 'dark light mode', action: 'theme' },
  ];
  return `<script type="application/json" id="site-index">${JSON.stringify({ email: SITE.email, items }).replace(/</g, '\\u003c')}</script>`;
};

// Inline icons (stroke = currentColor), so they follow the theme.
const svg = (d, extra = '') => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ICON = {
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  ruler: svg('<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', 'class="i-moon"'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 'class="i-sun"'),
};

const footer = (depth = 0) => `
<footer class="footer" id="contact">
  <div>
    <p class="footer__cta">Let's build <i>something.</i></p>
    <p style="margin:16px 0 0"><a href="mailto:${SITE.email}">${esc(SITE.email)}</a></p>
  </div>
  <div class="footer__links">
    ${SITE.links.map((l) => l.href === '#' ? `<span class="soon">${esc(l.label)} <em>soon</em></span>` : `<a href="${l.href}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('\n    ')}
    <span style="font-family:var(--mono);font-size:13px;color:var(--ink-3)">Kenner, Louisiana</span>
  </div>
</footer>
${siteIndex(depth)}
<script src="${u(depth, 'site.js')}" defer></script>
</body>
</html>`;

// Blueprint-style stand-in for an image that hasn't been added yet.
const ph = (label, hint = '', cls = '') =>
  `<div class="ph ${cls}" role="img" aria-label="${esc(label)} (coming soon)"><span class="ph__tag">Coming soon</span><span class="ph__label">${esc(label)}</span>${hint ? `<span class="ph__hint">${esc(hint)}</span>` : ''}</div>`;

// Small preview for the homepage lists: first screenshot, or a placeholder.
const listThumb = (p) => {
  const first = p.gallery?.desktop?.[0];
  return first && first.src
    ? `<img class="item__thumb" src="${u(0, `img/${first.src}-sm.webp`)}" alt="" width="${first.w / 2}" height="${first.h / 2}" decoding="async">`
    : `<span class="item__thumb item__thumb--ph" aria-hidden="true"></span>`;
};

const listItem = (p) => `
      <li><a class="item" href="${u(0, `work/${p.slug}/`)}">
        ${listThumb(p)}
        <span class="item__text"><span class="item__tools">${esc(p.tools)}</span><span class="item__title">${esc(p.title)}</span><span class="item__note">${txt(p.note)}</span></span>
      </a></li>`;


const home = () => `${head({ title: `${SITE.name} — Data analyst & web developer`, description: SITE.description, path: '/' })}
${nav()}
<main id="main">
<section class="hero">
  <h1>I turn messy data into answers, <i>and I design the spotlight.</i></h1>
  <p class="hero__lede">Data analyst and web developer. Drag the seam: a real university dashboard, before and after my redesign.</p>
</section>

<div class="stage-wrap">
  <section class="demo dash dash--hero" data-demo="dash" data-mode="hero" data-base="${siteRoot(0)}" aria-label="A Nicholls State dashboard, before and after my redesign"><p class="demo__noscript">The before-and-after comparison needs JavaScript. <a href="${u(0, 'work/tableau-dashboards/')}">See the dashboards project</a>.</p></section>
</div>

<section class="work" aria-label="Selected work">
  <div class="col col--built" id="built">
    <h2>BUILT · ENGINEERING &amp; ANALYSIS</h2>
    <ul>${projects.filter((p) => p.lane === 'build').map(listItem).join('')}
    </ul>
  </div>
  <div class="col col--designed" id="designed">
    <h2>DESIGNED · PRESENTATION &amp; UX</h2>
    <ul>${projects.filter((p) => p.lane === 'design').map(listItem).join('')}
    </ul>
  </div>
</section>

<section class="about" id="about">
  <div class="about__side">
    <h2>About</h2>
    ${SITE.headshot
      ? `<img class="about__photo" src="${u(0, 'img/headshot.webp')}" alt="Kobi Lipari" width="657" height="751" loading="lazy" decoding="async">`
      : ph('Headshot', 'Portrait, 4:5', 'about__photo')}
  </div>
  <div>
    <p>I'm looking for my next challenge: a data analyst or full-stack role with real scale and real stakes.</p>
    <p>Right now I build the SQL, Access pipelines, and Tableau dashboards behind Nicholls State University's institutional reporting and research support. Part time, I build full-stack web platforms that members and patients use every day.</p>
    <p>I learn fast, I care about getting it right, and I finish what I start. If your team needs someone who can work across both the data and the product, let's talk. I'm based in New Orleans and ready to relocate for the right role.</p>
    <dl>
      <dt>NOW</dt><dd>Data Analyst, Institutional Research</dd>
      <dt>ALSO</dt><dd>Webmaster, Louisiana Chess Association<br>Web Developer and IT Support, Healingly</dd>
      <dt>DEGREE</dt><dd>BS Computer Science, University of Louisiana at Lafayette</dd>
      <dt>TOOLS</dt><dd>SQL · Tableau · Python · Access · Excel · JavaScript · HTML/CSS · Git · Cloudflare</dd>
    </dl>
  </div>
</section>
</main>
<script type="module" src="${u(0, 'demo-dash.js')}"></script>
${footer()}`;

// Interactive pieces a project page can embed. Each is a container that its
// script fills in; the text inside is what shows without JavaScript.
const siteRoot = (depth) => (PREVIEW ? '../'.repeat(depth) : '/');
const DEMOS = {
  scanner: () => `<section class="demo" data-demo="scanner" aria-label="Live decoder demo"><p class="demo__noscript">The live decoder demo needs JavaScript.</p></section>`,
  sql: (depth) => `<section class="demo sqlpad" data-demo="sql" data-base="${siteRoot(depth)}" aria-label="SQL playground"><p class="demo__noscript">The SQL playground needs JavaScript.</p></section>`,
  dash: (depth) => `<section class="demo dash" data-demo="dash" data-base="${siteRoot(depth)}" aria-label="Dashboards before and after"><p class="demo__noscript">The before-and-after comparison needs JavaScript.</p></section>${CATALOG ? `
  <section class="demo cat" data-demo="catalog" data-base="${siteRoot(depth)}" aria-label="More redesigned dashboards"><p class="demo__noscript">The slideshow needs JavaScript.</p></section>` : ''}`,
};
// The dashboards slideshow appears once all six of its data files are in src/data/dashboards
// (written by scripts/export_catalog.py in the dashboards repo).
const CATALOG = ['enrollment', 'graduates', 'retention12', 'retention13', 'grad4', 'grad6']
  .every((k) => existsSync(`src/data/dashboards/${k}.json`));
const DEMO_SCRIPTS = { scanner: ['demo-scanner.js'], sql: ['demo-sql.js'], dash: ['demo-dash.js', ...(CATALOG ? ['demo-catalog.js'] : [])] };

const SECTION_ORDER = [
  ['problem', 'The problem'], ['data', 'The data'], ['approach', 'Approach'],
  ['validation', 'Validation'], ['result', 'Result'], ['reflection', 'Next time'],
];

// Responsive <img> for a screenshot saved as NAME.webp (full) and NAME-sm.webp (half size).
const shot = (depth, img, { eager = false, cls = '', sizes = '(max-width: 1160px) 100vw, 1040px' } = {}) =>
  `<img class="${cls}" src="${u(depth, `img/${img.src}.webp`)}" srcset="${u(depth, `img/${img.src}-sm.webp`)} ${img.w / 2}w, ${u(depth, `img/${img.src}.webp`)} ${img.w}w" sizes="${sizes}" width="${img.w}" height="${img.h}" alt="${esc(img.alt)}"${eager ? '' : ' loading="lazy"'} decoding="async">`;

// One gallery item: a real screenshot when `src` is set, otherwise a placeholder.
const view = (depth, img, eager) => img.src ? shot(depth, img, { eager, cls: 'browser__img' }) : ph(img.label, img.hint);

// Browser + phone frames; thumbnails switch between the stacked views.
const showcase = (p, depth) => {
  const g = p.gallery;
  const site = p.links.find((l) => l.href.startsWith('http'));
  const host = g.host || (site ? site.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '');
  const first = g.desktop[0];
  const ratio = first.src ? `${first.w} / ${first.h}` : '16 / 10';
  return `
  <section class="showcase" aria-label="Screenshots of ${esc(p.title)}" data-gallery>
    <div class="showcase__stage${g.mobile ? '' : ' showcase__stage--solo'}">
      <figure class="browser">
        <div class="browser__bar">
          <span class="browser__dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="browser__url">${esc(host)}</span>
          ${site ? `<a class="browser__visit" href="${site.href}" target="_blank" rel="noopener">${esc(g.visit || 'Visit site')} ↗</a>` : ''}
        </div>
        <div class="browser__view" style="aspect-ratio:${ratio}">
          ${g.desktop.map((img, k) => `<div class="browser__pane" data-view="${k}"${k ? ' hidden' : ''}>${view(depth, img, k === 0)}</div>`).join('\n          ')}
        </div>
      </figure>
      ${g.mobile ? `<figure class="phone-frame">${g.mobile.src ? shot(depth, g.mobile, { sizes: '(max-width: 700px) 40vw, 220px' }) : ph(g.mobile.label, g.mobile.hint, 'ph--phone')}</figure>` : ''}
    </div>
    <p class="showcase__caption" data-caption>${txt(first.caption)}</p>
    ${g.desktop.length > 1 ? `<div class="thumbs" role="group" aria-label="Choose a view">
      ${g.desktop.map((img, k) => `<button type="button" class="thumb" aria-pressed="${k === 0}" data-view="${k}" data-caption="${esc(img.caption)}">
        ${img.src ? `<img src="${u(depth, `img/${img.src}-sm.webp`)}" alt="" width="${img.w / 2}" height="${img.h / 2}" loading="lazy" decoding="async">` : `<span class="thumb__ph" aria-hidden="true"></span>`}
        <span>${esc(img.label)}</span>
      </button>`).join('\n      ')}
    </div>` : ''}
  </section>`;
};

const projectPage = (p, i) => {
  const prev = projects[(i - 1 + projects.length) % projects.length];
  const next = projects[(i + 1) % projects.length];
  return `${head({ title: `${p.title} — ${SITE.name}`, description: p.outcome.replace(/\[[^\]]+\]/g, '').trim(), path: `/work/${p.slug}/`, depth: 2, fonts: p.demo === 'scanner' ? '&family=Caveat:wght@500;600' : '' })}
${nav(2)}
<main id="main" class="proj">
  <a class="back" href="${u(2, p.lane === 'build' ? '#built' : '#designed')}">← All work</a>
  <p class="proj__eyebrow">${esc(p.kind)}</p>
  <h1>${esc(p.title)}</h1>
  <p class="proj__outcome"><strong>Outcome:</strong> ${txt(p.outcome)}</p>
  <dl class="meta">
    <div><dt>Role</dt><dd>${txt(p.role)}</dd></div>
    ${txt(p.timeline) ? `<div><dt>Timeline</dt><dd>${txt(p.timeline)}</dd></div>` : ''}
    <div><dt>Tools</dt><dd>${esc(p.tools)}</dd></div>
    ${p.links.length ? `<div><dt>Links</dt><dd>${p.links.map((l) => l.href === '#' ? `<span class="soon">${esc(l.label)} <em>soon</em></span>` : `<a href="${l.href}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a>`).join(' · ')}</dd></div>` : ''}
  </dl>
  ${p.demo ? DEMOS[p.demo](2) : ''}
  ${p.gallery ? showcase(p, 2) : p.demo || !DRAFT ? '' : `<div class="media">${txt('[Screenshot, demo video or embedded dashboard]')}</div>`}
  <section class="pipeline" aria-label="How it's built">
    <h2>HOW IT'S BUILT</h2>
    <ol class="steps">${p.pipeline.map((step, k) => `<li><span class="steps__n">${String(k + 1).padStart(2, '0')}</span><span class="steps__label">${esc(step)}</span></li>`).join('')}</ol>
  </section>
  <div class="sections">
    ${SECTION_ORDER.filter(([k]) => txt(p.sections[k])).map(([k, label]) => `<section class="section"><h2>${label}</h2><p>${txt(p.sections[k])}</p></section>`).join('\n    ')}
  </div>
  <nav class="pager" aria-label="More projects">
    <a href="${u(2, `work/${prev.slug}/`)}">← ${esc(prev.title)}</a>
    <a href="${u(2, `work/${next.slug}/`)}">${esc(next.title)} →</a>
  </nav>
</main>
${p.gallery ? `<script src="${u(2, 'gallery.js')}" defer></script>` : ''}
${p.demo ? DEMO_SCRIPTS[p.demo].map((f) => `<script type="module" src="${u(2, f)}"></script>`).join('\n') : ''}
${footer(2)}`;
};

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', home());
for (const [i, p] of projects.entries()) {
  await mkdir(`dist/work/${p.slug}`, { recursive: true });
  await writeFile(`dist/work/${p.slug}/index.html`, projectPage(p, i));
}
await copyFile('src/styles.css', 'dist/styles.css');
await copyFile('src/gallery.js', 'dist/gallery.js');
await copyFile('src/site.js', 'dist/site.js');
await copyFile('src/demo-scanner.js', 'dist/demo-scanner.js');
await copyFile('src/demo-worker.js', 'dist/demo-worker.js');
await copyFile('src/demo-sql.js', 'dist/demo-sql.js');
await copyFile('src/demo-dash.js', 'dist/demo-dash.js');
await copyFile('src/demo-catalog.js', 'dist/demo-catalog.js');
await copyFile('src/dash-kit.js', 'dist/dash-kit.js');
if (existsSync('src/data')) await cp('src/data', 'dist/data', { recursive: true });
await cp('src/vendor', 'dist/vendor', { recursive: true });
await cp('src/img', 'dist/img', { recursive: true });
if (SITE.resume === 'resume.pdf') {
  await copyFile('src/resume.pdf', 'dist/resume.pdf');
} else {
  console.warn('No src/resume.pdf yet, so the Résumé link goes to a placeholder page.');
  await mkdir('dist/resume', { recursive: true });
  await writeFile('dist/resume/index.html', `${head({ title: `Résumé — ${SITE.name}`, description: SITE.description, path: '/resume/', depth: 1 })}
${nav(1)}
<main id="main" class="proj proj--narrow">
  <p class="proj__eyebrow">Résumé</p>
  <h1>Résumé PDF coming soon.</h1>
  <p class="proj__outcome">In the meantime, email <a href="mailto:${SITE.email}">${esc(SITE.email)}</a> and I'll send a copy.</p>
</main>
${footer(1)}`);
}
await writeFile('dist/404.html', `${head({ title: `Not found — ${SITE.name}`, description: SITE.description, path: '/404' })}
${nav()}
<main id="main" class="proj"><h1 style="margin-top:48px">Nothing here.</h1><p class="proj__outcome"><a href="${u(0)}">Back to the homepage</a></p></main>
${footer()}`);
console.log(`Built ${projects.length} project pages + homepage into dist/`);
