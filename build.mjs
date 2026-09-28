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
  description: 'Kobi Lipari — data analyst and web developer. I build the engine and design what people see.',
  email: 'KobiLipari@gmail.com',
  links: [
    { label: 'LinkedIn', href: '#' },
    { label: 'GitHub', href: '#' },
    { label: 'Tableau Public', href: '#' },
  ],
  // Until src/resume.pdf exists, the Résumé link goes to a short placeholder page.
  resume: existsSync('src/resume.pdf') ? 'resume.pdf' : 'resume/',
  headshot: existsSync('src/img/headshot.webp') ? 'headshot' : null,
};

// Escape text, then highlight [placeholders] so they're easy to find and replace.
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const txt = (s) => esc(s).replace(/\[[^\]]+\]/g, (m) => `<span class="todo">${m}</span>`);

const head = ({ title, description, path, depth = 0 }) => `<!doctype html>
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
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='16' height='32' fill='%230E2438'/%3E%3Crect x='16' width='16' height='32' fill='%23F3EEE6'/%3E%3Crect x='15' width='2' height='32' fill='%23C8553A'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
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
    <a class="pill" href="${u(depth, SITE.resume)}">Résumé</a>
  </nav>
</header>`;

const footer = () => `
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

const barHeights = [150, 190, 170, 230, 260, 300];
const barYears = ['F20', 'F21', 'F22', 'F23', 'F24', 'F25'];

const home = () => `${head({ title: `${SITE.name} — Data analyst & web developer`, description: SITE.description, path: '/' })}
${nav()}
<main id="main">
<section class="hero">
  <h1>I build the engine, <i>and I design</i> what people see.</h1>
  <p class="hero__lede">Data analyst and web developer. Drag the seam to see the same work as it was built and as it was presented.</p>
</section>

<div class="stage-wrap">
  <div class="stage" data-stage>
    <div class="stage__canvas" aria-hidden="true">
      <div class="layer layer--final">
        <div class="abs f-card">
          <div class="f-card__eyebrow">Dashboard · synthetic data</div>
          <div class="f-card__title">Who comes back for year two?</div>
          <div class="f-card__sub">Second-fall retention by entering cohort</div>
          <div class="bars">
            ${barHeights.map((h, i) => `<div class="bar${i === 5 ? ' bar--hi' : ''}"><div class="bar__fill" style="height:${h}px"></div><span class="bar__label">${barYears[i]}</span></div>`).join('')}
          </div>
        </div>
        <div class="abs phone"><div class="phone__screen">
          <div style="font-size:12px;color:var(--ink-3)">Telehealth site · mobile</div>
          <div class="phone__title">Talk to a provider today.</div>
          <div class="phone__img">[hero photo]</div>
          <div class="chips"><span class="chip">9:30</span><span class="chip chip--on">10:15</span><span class="chip">1:00</span></div>
          <div class="phone__cta">Book a visit</div>
        </div></div>
        <div class="abs tiles">
          <div class="tile tile--accent"><span>Dashboards</span><span>Tableau</span></div>
          <div class="tile tile--plain"><span>Web</span><span>Sites</span></div>
          <div class="tile tile--dark"><span>Tools</span><span>Scanner</span></div>
        </div>
        <div class="abs corner-label" style="right:24px;color:var(--ink-3)">HOW IT'S PRESENTED</div>
      </div>

      <div class="layer layer--blueprint">
        <div class="abs bp-box bp-card">
          <div class="bp-dim">section.chart-card · 700 × 492 · padding 32</div>
          <div style="font-size:13px;color:var(--bp-stroke)">-- retention.sql</div>
<pre class="bp-code"><span class="kw">SELECT</span> cohort_year,
       COUNT(*) <span class="kw">FILTER</span> (<span class="kw">WHERE</span> enrolled_fall_2)
         * 1.0 / COUNT(*) <span class="kw">AS</span> retention
<span class="kw">FROM</span>   ftf_cohorts
<span class="kw">GROUP BY</span> cohort_year
<span class="kw">ORDER BY</span> cohort_year;</pre>
          <div class="bp-bars">${barHeights.map((h) => `<div class="bp-bar" style="height:${h}px"></div>`).join('')}</div>
        </div>
        <div class="abs bp-box bp-phone">
          <div style="color:var(--bp-stroke)">viewport 390 × 844</div>
          <div class="bp-el">h1 · clamp(28px, 7vw, 40px)</div>
          <div class="bp-el" style="height:110px;display:flex;align-items:center;justify-content:center">img · lazy · 4:3</div>
          <div class="bp-el" style="line-height:1.6">fetch('/api/slots')<br>.then(renderChips)</div>
          <div class="bp-el" style="margin-top:auto;text-align:center">button · 44px min</div>
        </div>
        <div class="abs bp-tiles">
          <div class="bp-box">tile[0]<br>extract → model → viz</div>
          <div class="bp-box">tile[1]<br>HTML · CSS · Cloudflare</div>
          <div class="bp-box">tile[2]<br>Python · legal-move check</div>
        </div>
        <div class="abs corner-label" style="left:24px;color:var(--bp-stroke)">HOW IT'S BUILT</div>
      </div>
    </div>

    <div class="seam" aria-hidden="true"></div>
    <div class="seam__handle" role="slider" tabindex="0" aria-label="Compare how it's built with how it's presented"
         aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#15171C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l-6 6 6 6"/><path d="M15 6l6 6-6 6"/></svg>
    </div>
  </div>
  <div class="snaps" role="group" aria-label="Jump to a view">
    <button type="button" data-snap="100" aria-pressed="false">All build</button>
    <button type="button" data-snap="50" aria-pressed="true">Half and half</button>
    <button type="button" data-snap="0" aria-pressed="false">All design</button>
  </div>
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
      ? `<img class="about__photo" src="${u(0, 'img/headshot.webp')}" alt="Kobi Lipari" width="480" height="600" loading="lazy" decoding="async">`
      : ph('Headshot', 'Portrait, 4:5', 'about__photo')}
  </div>
  <div>
    <p>I'm a data analyst in a university Office of Institutional Research and a part-time web developer. I like the whole path: pulling messy data, getting the numbers right, and making the result easy to read and use.</p>
    <p>${txt('[One or two sentences on what you want next and the kind of team you want to join.]')}</p>
    <dl>
      <dt>NOW</dt><dd>Data Analyst, Institutional Research · Web Developer &amp; IT, Healingly</dd>
      <dt>ALSO</dt><dd>Technical lead, Louisiana Chess Association</dd>
      <dt>DEGREE</dt><dd>BS Computer Science, University of Louisiana at Lafayette</dd>
      <dt>TOOLS</dt><dd>SQL · Tableau · Python · Access · Excel · JavaScript · HTML/CSS · Git · Cloudflare</dd>
    </dl>
  </div>
</section>
</main>
<script src="${u(0, 'seam.js')}" defer></script>
${footer()}`;

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
  return `${head({ title: `${p.title} — ${SITE.name}`, description: p.outcome.replace(/\[[^\]]+\]/g, '').trim(), path: `/work/${p.slug}/`, depth: 2 })}
${nav(2)}
<main id="main" class="proj">
  <a class="back" href="${u(2, p.lane === 'build' ? '#built' : '#designed')}">← All work</a>
  <p class="proj__eyebrow">${esc(p.kind)}</p>
  <h1>${esc(p.title)}</h1>
  <p class="proj__outcome"><strong>Outcome:</strong> ${txt(p.outcome)}</p>
  <dl class="meta">
    <div><dt>Role</dt><dd>${txt(p.role)}</dd></div>
    <div><dt>Timeline</dt><dd>${txt(p.timeline)}</dd></div>
    <div><dt>Tools</dt><dd>${esc(p.tools)}</dd></div>
    ${p.links.length ? `<div><dt>Links</dt><dd>${p.links.map((l) => l.href === '#' ? `<span class="soon">${esc(l.label)} <em>soon</em></span>` : `<a href="${l.href}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a>`).join(' · ')}</dd></div>` : ''}
  </dl>
  ${p.gallery ? showcase(p, 2) : `<div class="media">${txt('[Screenshot, demo video or embedded dashboard]')}</div>`}
  <section class="pipeline" aria-label="How it's built">
    <h2>HOW IT'S BUILT</h2>
    <ol class="steps">${p.pipeline.map((step, k) => `<li><span class="steps__n">${String(k + 1).padStart(2, '0')}</span><span class="steps__label">${esc(step)}</span></li>`).join('')}</ol>
  </section>
  <div class="sections">
    ${SECTION_ORDER.map(([k, label]) => `<section class="section"><h2>${label}</h2><p>${txt(p.sections[k])}</p></section>`).join('\n    ')}
  </div>
  <nav class="pager" aria-label="More projects">
    <a href="${u(2, `work/${prev.slug}/`)}">← ${esc(prev.title)}</a>
    <a href="${u(2, `work/${next.slug}/`)}">${esc(next.title)} →</a>
  </nav>
</main>
${p.gallery ? `<script src="${u(2, 'gallery.js')}" defer></script>` : ''}
${footer()}`;
};

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', home());
for (const [i, p] of projects.entries()) {
  await mkdir(`dist/work/${p.slug}`, { recursive: true });
  await writeFile(`dist/work/${p.slug}/index.html`, projectPage(p, i));
}
await copyFile('src/styles.css', 'dist/styles.css');
await copyFile('src/seam.js', 'dist/seam.js');
await copyFile('src/gallery.js', 'dist/gallery.js');
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
${footer()}`);
}
await writeFile('dist/404.html', `${head({ title: `Not found — ${SITE.name}`, description: SITE.description, path: '/404' })}
${nav()}
<main id="main" class="proj"><h1 style="margin-top:48px">Nothing here.</h1><p class="proj__outcome"><a href="${u(0)}">Back to the homepage</a></p></main>
${footer()}`);
console.log(`Built ${projects.length} project pages + homepage into dist/`);
