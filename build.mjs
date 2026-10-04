// Builds the static site into ./dist using only Node's standard library.
// Run: node build.mjs
import { mkdir, writeFile, copyFile, rm, cp, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { projects as allProjects } from './src/projects.mjs';

// PREVIEW=1 writes relative links (with index.html) so the site works from any folder or preview host.
const PREVIEW = process.env.PREVIEW === '1';
// NOINDEX=1 asks search engines to leave the site out: a noindex tag on every page and a
// robots.txt that turns crawlers away. Without it the site is indexable and has a sitemap.
const NOINDEX = process.env.NOINDEX === '1';

// A project whose data files are stand-ins (made to design the page before the
// real analysis ran) is never published. A production build stops with an error,
// so the live site keeps its last good version. HOLD_BACK=1 builds the rest of
// the site without the project instead. PREVIEW=1 builds show it, under a banner.
const isStandin = async (dataset) => {
  const dir = `src/data/${dataset}`;
  if (!existsSync(dir)) return true;
  for (const f of (await readdir(dir)).filter((n) => n.endsWith('.json'))) {
    if (JSON.parse(await readFile(`${dir}/${f}`, 'utf8')).standin) return true;
  }
  return false;
};
const projects = [];
const heldBack = [];
for (const p of allProjects) {
  if (p.data && !PREVIEW && (await isStandin(p.data))) {
    if (process.env.HOLD_BACK !== '1') {
      console.error(`Not built: the data for "${p.title}" in src/data/${p.data} is stand-in or missing, and stand-in numbers must not be published.\nBring in the real files (node tools/sync-ewarn.mjs), or run HOLD_BACK=1 node build.mjs to build the site without this project.`);
      process.exit(1);
    }
    console.warn(`Skipping "${p.title}": its data in src/data/${p.data} is still stand-in. It shows in PREVIEW=1 builds only.`);
    heldBack.push(p.data);
    continue;
  }
  // Links into a repo that is still private are left out everywhere (rail, palette) until
  // the project's repoIsPublic switch in src/projects.mjs is set to true.
  projects.push(p.repoIsPublic === false ? { ...p, links: p.links.filter((l) => !l.repo) } : p);
}
const u = (depth, target = '') => {
  if (!PREVIEW) return '/' + target;
  const [path, hash] = target.split('#');
  const file = path === '' || path.endsWith('/') ? path + 'index.html' : path;
  return '../'.repeat(depth) + file + (hash !== undefined ? '#' + hash : '');
};

const SITE = {
  name: 'Kobi Lipari',
  url: 'https://kobilipari.com',
  description: 'Kobi Lipari — data analyst and web developer. Real insights, made beautiful.',
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

// The picture link previews show (Open Graph, Twitter card), the touch icon and favicon.ico
// are made by tools/share-image.mjs.
const SHARE_IMAGE = { src: 'img/og.png', w: 1200, h: 630 };

// Who the site is about, for search engines (schema.org Person). The job, employer and degree
// repeat the About block on the homepage: change them together.
const personLd = () => `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: SITE.name,
  url: `${SITE.url}/`,
  ...(SITE.headshot ? { image: `${SITE.url}/img/headshot.webp` } : {}),
  description: SITE.description,
  jobTitle: 'Data Analyst',
  worksFor: { '@type': 'CollegeOrUniversity', name: 'Nicholls State University' },
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'University of Louisiana at Lafayette' },
  email: `mailto:${SITE.email}`,
  sameAs: SITE.links.filter((l) => l.href !== '#').map((l) => l.href),
}).replace(/</g, '\\u003c')}</script>`;

// Font files every page shows above the fold, fetched early so the first paint already has
// them. A page can add more with `fonts`. The files and their @font-face rules: src/vendor/fonts, src/styles.css.
const FONT_PRELOAD = ['geist-latin-wght-normal', 'instrument-serif-latin-400-normal'];
// `noindex` is for a page that should never be listed (the 404 page); it also has no canonical URL.
const head = ({ title, description, path, depth = 0, fonts = [], noindex = false, extra = '' }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">${noindex || NOINDEX ? '\n<meta name="robots" content="noindex, nofollow">' : ''}${noindex ? '' : `
<link rel="canonical" href="${SITE.url}${path}">`}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE.name}">${noindex ? '' : `
<meta property="og:url" content="${SITE.url}${path}">`}
<meta property="og:image" content="${SITE.url}/${SHARE_IMAGE.src}">
<meta property="og:image:width" content="${SHARE_IMAGE.w}">
<meta property="og:image:height" content="${SHARE_IMAGE.h}">
<meta property="og:image:alt" content="${esc(SITE.description)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE.url}/${SHARE_IMAGE.src}">
<meta name="theme-color" content="#F3EEE6">
<script>(function(){var t=null;try{t=localStorage.getItem('theme')}catch(e){}var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light'})()</script>
<link rel="icon" href="${u(depth, 'favicon.ico')}" sizes="32x32">
<link rel="apple-touch-icon" href="${u(depth, 'img/apple-touch-icon.png')}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='16' height='32' fill='%230E2438'/%3E%3Crect x='16' width='16' height='32' fill='%23F3EEE6'/%3E%3Crect x='15' width='2' height='32' fill='%23C8553A'/%3E%3C/svg%3E">
${[...FONT_PRELOAD, ...fonts].map((f) => `<link rel="preload" href="${u(depth, `vendor/fonts/${f}.woff2`)}" as="font" type="font/woff2" crossorigin>`).join('\n')}
<link rel="stylesheet" href="${u(depth, 'styles.css')}">${extra ? `\n${extra}` : ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>`;

const nav = (depth = 0) => `
<header class="nav">
  <a class="nav__name" href="${u(depth)}">${SITE.name}</a>
  <nav class="nav__links" aria-label="Main">
    <a class="hide-sm" href="${u(depth, '#work')}">Work</a>
    <a class="hide-sm" href="${u(depth, '#about')}">About</a>
    <a class="hide-sm" href="${u(depth, '#contact')}">Contact</a>
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
    { group: 'On this site', title: 'Featured work', keywords: 'projects portfolio', href: u(depth, '#work') },
    { group: 'On this site', title: 'All work', keywords: 'projects list engineering design', href: u(depth, 'work/') },
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
    <p class="footer__cta">Let's <i>talk.</i></p>
    <p class="footer__sub">Open to data analyst and full-stack roles · New Orleans or relocating</p>
  </div>
  <div class="footer__links">
    <a class="footer__mail" href="mailto:${SITE.email}">${esc(SITE.email)}</a>
    ${SITE.links.filter((l) => l.href !== '#').map((l) => `<a class="footer__link" href="${l.href}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('\n    ')}
    <a class="footer__link" href="${u(depth, SITE.resume)}">Résumé</a>
  </div>
</footer>
${siteIndex(depth)}
<script src="${u(depth, 'site.js')}" defer></script>
</body>
</html>`;

// Blueprint-style stand-in for an image that hasn't been added yet.
const ph = (label, hint = '', cls = '') =>
  `<div class="ph ${cls}" role="img" aria-label="${esc(label)} (coming soon)"><span class="ph__tag">Coming soon</span><span class="ph__label">${esc(label)}</span>${hint ? `<span class="ph__hint">${esc(hint)}</span>` : ''}</div>`;

// Project picture for cards and rows: its own thumbnail, else its first screenshot.
const pic = (p) => p.thumb || (p.gallery?.desktop?.[0]?.src ? p.gallery.desktop[0] : null);
const picImg = (depth, p, cls) => {
  const im = pic(p);
  return im
    ? `<img class="${cls}" src="${u(depth, `img/${im.src}-sm.webp`)}" alt="" width="${im.w / 2}" height="${im.h / 2}" loading="lazy" decoding="async">`
    : `<span class="${cls} ${cls}--ph" aria-hidden="true"></span>`;
};

// Featured order on the homepage: the first three of these that are published. The rest go in
// "More work". All of them are on /work/.
const FEATURED = ['withdrawal-early-warning', 'tableau-dashboards', 'lca-website', 'scoresheet-scanner'];
const featured = FEATURED.map((slug) => projects.find((p) => p.slug === slug)).filter(Boolean).slice(0, 3);
const others = projects.filter((p) => !featured.includes(p));

const card = (depth, p) => `
      <li><a class="card" href="${u(depth, `work/${p.slug}/`)}">
        ${picImg(depth, p, 'card__img')}
        <span class="card__tools">${esc(p.tools)}</span>
        <span class="card__title">${esc(p.title)}</span>
        <span class="card__note">${txt(p.note)}</span>
      </a></li>`;

const row = (depth, p) => `
      <li><a class="row" href="${u(depth, `work/${p.slug}/`)}">
        ${picImg(depth, p, 'row__img')}
        <span class="row__title">${esc(p.title)}</span>
        <span class="row__tools">${esc(p.tools)}</span>
        <span class="row__go" aria-hidden="true">→</span>
      </a></li>`;

const home = () => `${head({ title: `${SITE.name} — Data analyst & web developer`, description: SITE.description, path: '/', fonts: ['instrument-serif-latin-400-italic'], extra: personLd() })}
${nav()}
<main id="main">
<section class="hero" aria-label="Introduction">
  <div class="hero__intro">
    <div class="hero__me">
      ${SITE.headshot ? `<img class="hero__photo" src="${u(0, 'img/headshot-sm.webp')}" alt="Kobi Lipari" width="329" height="376" decoding="async">` : ''}
      <div><p class="hero__name">${SITE.name}</p><p class="hero__role">Data analyst · Web developer</p></div>
    </div>
    <h1>Real insights,<br> <i>made beautiful.</i></h1>
    <p class="hero__pitch">I'm looking for my next challenge: a data analyst or full-stack role with real scale and real stakes. Based in New Orleans, open to relocating.</p>
    <div class="hero__actions"><a class="btn" href="#work">See the work</a><a class="pill" href="${u(0, SITE.resume)}">Résumé</a></div>
  </div>
  <div class="hero__demo">
    <section class="demo dash dash--hero" data-demo="dash" data-mode="hero" data-base="${siteRoot(0)}" aria-label="A Nicholls State dashboard, before and after my redesign"><p class="demo__noscript">The before-and-after comparison needs JavaScript. <a href="${u(0, 'work/tableau-dashboards/')}">See the dashboards project</a>.</p></section>
  </div>
</section>
<ul class="proof" aria-label="In numbers">
  <li>30+ Tableau dashboards</li><li>15+ data sources in one retention model</li><li>112 automated tests</li><li>3 live sites</li><li>SQL · Python · Tableau · React</li>
</ul>

<section class="featured" id="work" aria-labelledby="featured-h">
  <div class="sec-head"><h2 id="featured-h">Featured work</h2><a href="${u(0, 'work/')}">All work →</a></div>
  <ul class="cards">${featured.map((p) => card(0, p)).join('')}
  </ul>
</section>

<section class="more" aria-labelledby="more-h">
  <div class="sec-head"><h2 id="more-h">More work</h2><a href="${u(0, 'work/')}">See all ${projects.length} →</a></div>
  <ul class="rows">${others.slice(0, 3).map((p) => row(0, p)).join('')}
  </ul>
</section>

<section class="about" id="about" aria-labelledby="about-h">
  <div class="about__card">
    ${SITE.headshot
      ? `<img class="about__photo" src="${u(0, 'img/headshot.webp')}" alt="Kobi Lipari" width="657" height="751" loading="lazy" decoding="async">`
      : ph('Headshot', 'Portrait, 4:5', 'about__photo')}
    <div>
      <h2 id="about-h">About</h2>
      <p>Right now I build the SQL, Access pipelines, and Tableau dashboards behind Nicholls State University's institutional reporting, and I'm the analyst faculty turn to for help with their research: finding the right data, running the analysis, and making the results clear. Part time, I build full-stack web platforms that members and patients use every day.</p>
      <p>I learn fast, I care about getting it right, and I finish what I start. If your team needs someone who can work across both the data and the product, let's talk.</p>
      <dl>
        <dt>NOW</dt><dd>Data Analyst, Nicholls State University</dd>
        <dt>ALSO</dt><dd>Webmaster, Louisiana Chess Association<br>Web Developer and IT Support, Healingly</dd>
        <dt>DEGREE</dt><dd>BS Computer Science, University of Louisiana at Lafayette</dd>
        <dt>TOOLS</dt><dd>SQL · Tableau · Python · Access · Excel · JavaScript · HTML/CSS · Git · Cloudflare</dd>
      </dl>
    </div>
  </div>
</section>
</main>
<script type="module" src="${u(0, 'demo-dash.js')}"></script>
${footer()}`;

// Every project, as cards.
const workIndex = () => `${head({ title: `Work — ${SITE.name}`, description: `All ${projects.length} projects by ${SITE.name}, data analyst and web developer: ${projects.map((p) => p.title).join('; ')}.`, path: '/work/', depth: 1 })}
${nav(1)}
<main id="main" class="work-all">
  <a class="back" href="${u(1)}">← Home</a>
  <h1>All work</h1>
  <ul class="cards">${projects.map((p) => card(1, p)).join('')}
  </ul>
</main>
${footer(1)}`;

// Interactive pieces a project page can embed. Each is a container that its
// script fills in; the text inside is what shows without JavaScript.
const siteRoot = (depth) => (PREVIEW ? '../'.repeat(depth) : '/');
const DEMOS = {
  scanner: () => `<section class="demo" data-demo="scanner" aria-label="Live decoder demo"><p class="demo__noscript">The live decoder demo needs JavaScript.</p></section>`,
  sql: (depth) => `<section class="demo sqlpad" data-demo="sql" data-base="${siteRoot(depth)}" aria-label="SQL playground"><p class="demo__noscript">The SQL playground needs JavaScript.</p></section>`,
  dash: (depth) => `<section class="demo dash" data-demo="dash" data-base="${siteRoot(depth)}" aria-label="Dashboards before and after"><p class="demo__noscript">The before-and-after comparison needs JavaScript.</p></section>${CATALOG ? `
  <section class="demo cat" data-demo="catalog" data-base="${siteRoot(depth)}" aria-label="More redesigned dashboards"><p class="demo__noscript">The slideshow needs JavaScript.</p></section>` : ''}`,
  // Five pieces for the withdrawal project, each filled from its own JSON file in data/ewarn/.
  ewarn: (depth) => `<div class="ew" data-ewarn data-base="${siteRoot(depth)}data/ewarn/"${allProjects.some((p) => p.demo === 'ewarn' && p.repoIsPublic) ? ' data-repo-links="on"' : ''}>
    <section class="demo ew-part" data-ew="promises" id="plan" aria-label="The plan and the result"><p class="demo__noscript">The plan-versus-result view needs JavaScript.</p></section>
    <section class="demo ew-part" data-ew="replay" id="replay" aria-label="Replay a term"><p class="demo__noscript">The term replay needs JavaScript.</p></section>
    <section class="demo ew-part" data-ew="beat" id="beat" aria-label="Beat the model"><p class="demo__noscript">The game needs JavaScript.</p></section>
    <section class="demo ew-part" data-ew="advising" id="advising" aria-label="You run advising"><p class="demo__noscript">The advising simulator needs JavaScript.</p></section>
    <section class="demo ew-part" data-ew="casefiles" id="casefiles" aria-label="Case files"><p class="demo__noscript">The case files need JavaScript.</p></section>
  </div>`,
};
// The dashboards slideshow appears once all six of its data files are in src/data/dashboards
// (written by scripts/export_catalog.py in the dashboards repo).
const CATALOG = ['enrollment', 'graduates', 'retention12', 'retention13', 'grad4', 'grad6']
  .every((k) => existsSync(`src/data/dashboards/${k}.json`));
const DEMO_SCRIPTS = { scanner: ['demo-scanner.js'], sql: ['demo-sql.js'], dash: ['demo-dash.js', ...(CATALOG ? ['demo-catalog.js'] : [])], ewarn: ['demo-ewarn.js'] };

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

// The five-part story of the dashboards work: a step row on desktop, a timeline on phones.
const processSteps = (p) => `
    <section class="process" id="my-work" aria-labelledby="process-h">
      <h2 id="process-h">How I changed the way they're made</h2>
      <ol class="process__list" data-process>
        ${p.process.map((st, k) => `<li class="process__item">
          <button type="button" class="process__step" id="ps-${k}" aria-expanded="${k === 0}" aria-controls="pp-${k}">
            <span class="process__n">${String(k + 1).padStart(2, '0')}</span><span class="process__label">${esc(st.label)}</span><span class="process__name">${esc(st.title)}</span>
          </button>
          <div class="process__panel" id="pp-${k}" role="region" aria-labelledby="ps-${k}">
            <div class="process__text"><p class="process__kicker">Step ${k + 1} of ${p.process.length}</p><h3>${esc(st.title)}</h3><p>${txt(st.text)}</p></div>
            <div class="process__visual" aria-hidden="true"><span>${esc(st.visual)}</span></div>
          </div>
        </li>`).join('\n        ')}
      </ol>
    </section>`;

const projectPage = (p, i) => {
  const prev = projects[(i - 1 + projects.length) % projects.length];
  const next = projects[(i + 1) % projects.length];
  const sections = SECTION_ORDER.filter(([k]) => p.sections && txt(p.sections[k]));
  const toc = [
    ...(p.demo || p.gallery ? [['see-it', p.demo ? 'See it work' : 'Screens']] : []),
    ...(p.process ? [['my-work', 'My work on them']] : [['how', "How it's built"], ...sections.map(([k, label]) => [`s-${k}`, label])]),
  ];
  const links = p.links.filter((l) => l.href !== '#');
  return `${head({ title: `${p.title} — ${SITE.name}`, description: p.outcome.replace(/\[[^\]]+\]/g, '').trim(), path: `/work/${p.slug}/`, depth: 2 })}
${nav(2)}
<main id="main" class="proj">
  <div class="proj__grid">
  <aside class="rail" aria-label="About this project">
    <a class="back" href="${u(2, 'work/')}">← All work</a>
    <p class="proj__eyebrow">${esc(p.kind)}</p>
    <h1>${esc(p.title)}</h1>
    <p class="proj__outcome">${txt(p.outcome)}</p>
    <details class="glance" open data-glance>
      <summary><span class="glance__grip" aria-hidden="true"></span>At a glance</summary>
      <div class="glance__body">
        <dl class="meta">
          <div><dt>Role</dt><dd>${txt(p.role)}</dd></div>
          ${txt(p.timeline) ? `<div><dt>Timeline</dt><dd>${txt(p.timeline)}</dd></div>` : ''}
          <div><dt>Tools</dt><dd>${esc(p.tools)}</dd></div>
        </dl>
        ${links.length ? `<div class="glance__links">${links.map((l, k) => `<a class="${k ? 'pill' : 'btn'}" href="${l.href}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}${l.href.startsWith('http') ? ' ↗' : ''}</a>`).join('')}</div>` : ''}
        ${toc.length > 1 ? `<nav class="toc" aria-label="On this page"><p>On this page</p>${toc.map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`).join('')}</nav>` : ''}
      </div>
    </details>
  </aside>
  <div class="proj__body">
    ${p.demo || p.gallery ? `<div id="see-it">${p.demo ? DEMOS[p.demo](2) : ''}${p.gallery ? showcase(p, 2) : ''}</div>` : ''}
    ${p.process ? processSteps(p) : `<section class="pipeline" id="how" aria-label="How it's built">
      <h2>HOW IT'S BUILT</h2>
      <ol class="steps">${p.pipeline.map((step, k) => `<li><span class="steps__n">${String(k + 1).padStart(2, '0')}</span><span class="steps__label">${esc(step)}</span></li>`).join('')}</ol>
    </section>
    <div class="sections">
      ${sections.map(([k, label]) => `<section class="section" id="s-${k}"><h2>${label}</h2><p>${txt(p.sections[k])}</p></section>`).join('\n      ')}
    </div>`}
    <nav class="pager" aria-label="More projects">
      <a href="${u(2, `work/${prev.slug}/`)}">← ${esc(prev.title)}</a>
      <a href="${u(2, `work/${next.slug}/`)}">${esc(next.title)} →</a>
    </nav>
  </div>
  </div>
</main>
${p.gallery ? `<script src="${u(2, 'gallery.js')}" defer></script>` : ''}
${p.demo ? DEMO_SCRIPTS[p.demo].map((f) => `<script type="module" src="${u(2, f)}"></script>`).join('\n') : ''}
${footer(2)}`;
};

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', home());
await mkdir('dist/work', { recursive: true });
await writeFile('dist/work/index.html', workIndex());
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
await copyFile('src/demo-ewarn.js', 'dist/demo-ewarn.js');
await copyFile('src/ewarn-read.js', 'dist/ewarn-read.js');
if (existsSync('src/data')) await cp('src/data', 'dist/data', { recursive: true, filter: (src) => !heldBack.some((d) => src === `src/data/${d}` || src.startsWith(`src/data/${d}/`)) });
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
await writeFile('dist/404.html', `${head({ title: `Not found — ${SITE.name}`, description: `This page is not on ${SITE.name}'s site.`, path: '/404', noindex: true })}
${nav()}
<main id="main" class="proj"><h1 style="margin-top:48px">Nothing here.</h1><p class="proj__outcome"><a href="${u(0)}">Back to the homepage</a></p></main>
${footer()}`);
if (existsSync('src/favicon.ico')) await copyFile('src/favicon.ico', 'dist/favicon.ico');
// For search engines: every page in a sitemap and an open robots.txt, or with NOINDEX=1 a
// robots.txt that turns all crawlers away (and no sitemap).
if (!NOINDEX) {
  const pages = ['/', '/work/', ...projects.map((p) => `/work/${p.slug}/`)];
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE.url}${p}</loc></url>`).join('\n')}
</urlset>
`);
}
await writeFile('dist/robots.txt', NOINDEX ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
console.log(`Built ${projects.length} project pages + homepage into dist/${NOINDEX ? ' (NOINDEX: search engines are asked to stay out)' : ''}`);
