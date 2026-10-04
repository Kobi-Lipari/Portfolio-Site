// The five interactive pieces on the withdrawal project page. Each one reads a
// small JSON file written by the analysis (see ewarn/showcase.py in the
// analysis repo) and is built when it scrolls near the screen.
//
//   promises   plan first, results second (flips with blueprint mode too)
//   replay     a term replayed: weekly risk scores, the day-28 warning list,
//              then who actually left
//   beat       guess who withdraws, then see the model's guesses and the truth
//   advising   choose how many students to contact; see who is caught, by group
//   casefiles  the data checks: expected, found, decided

import { readBar, readInterval, judge, barText } from './ewarn-read.js';

const host = document.querySelector('[data-ewarn]');
const BASE = host?.dataset.base || '';
// Links into the analysis repo are shown only once it is public (repoIsPublic in src/projects.mjs).
const REPO_LINKS = host?.dataset.repoLinks === 'on';
const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Small helpers ───────────────────────────────────────────────────
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const pct = (x, digits = 0) => `${(100 * x).toFixed(digits)}%`;
// A cut point as a percentage, with a decimal only when it has one: 27.7%, 43%.
const cutPct = (p) => `${Number((100 * p).toFixed(1))}%`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c.nodeType ? c : document.createTextNode(c));
  return node;
}
const svgEl = (tag, attrs = {}) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

// Seeded shuffle so a visitor's order is random but repeatable within a visit.
function shuffled(n, seed = Date.now() % 2147483647) {
  let s = seed || 1;
  const rand = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Colours come from CSS so they follow light, dark and blueprint themes.
function palette() {
  const cs = getComputedStyle(host);
  const v = (name) => cs.getPropertyValue(name).trim();
  return {
    out: v('--ew-out'), student: v('--ew-student'), dot: v('--ew-dot'), zone: v('--ew-zone'),
    ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'), line: v('--line'), card: v('--card'),
  };
}
const repaintHooks = new Set();
new MutationObserver(() => repaintHooks.forEach((fn) => fn()))
  .observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] });

function head(section, { eyebrow, title, lede, standin }) {
  return h('div', { class: 'demo__head' },
    h('div', {},
      h('p', { class: 'demo__eyebrow' }, eyebrow, standin ? h('span', { class: 'ew-chip', text: 'Stand-in data' }) : null),
      h('h2', { class: 'demo__title', text: title }),
      lede ? h('p', { class: 'demo__lede', html: lede }) : null));
}

let bannerShown = false;
function standinBanner() {
  if (bannerShown) return;
  bannerShown = true;
  host.prepend(h('p', { class: 'ew-banner', role: 'note' },
    h('strong', { text: 'Preview. ' }),
    'Every number in these five pieces is a stand-in, drawn at random to design the page. The real results replace them when the analysis runs.'));
}

// ── 1. Plan first, results second ───────────────────────────────────
const longDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

// A commit, by its short ID. It is a link only when the analysis repo is public
// (repoIsPublic in src/projects.mjs) and the file carries a real address.
const commitRef = (c) => (REPO_LINKS && /^https:\/\//.test(c.url)
  ? h('a', { href: c.url, target: '_blank', rel: 'noopener' }, h('code', { text: c.sha }))
  : h('code', { text: c.sha }));

// A declared numeric bar, drawn on one line: the passing range, the estimate
// and its 95% interval. Position carries the verdict, not colour.
function gauge(bar, iv) {
  const j = judge(bar, iv);
  const pts = [iv.lo, iv.hi, bar.lo, bar.hi].filter((v) => v != null);
  const span = Math.max(...pts) - Math.min(...pts) || 1;
  const lo = bar.lo == null ? Math.min(0, iv.lo) : Math.min(...pts) - span * 0.2;
  const hi = Math.max(...pts) + span * 0.2;
  const W = 320; const x = (v) => 10 + ((v - lo) / (hi - lo)) * (W - 20);
  const zoneL = x(bar.lo ?? lo); const zoneR = x(bar.hi ?? hi);
  const says = `Estimate ${iv.est}, 95% interval ${iv.lo} to ${iv.hi}. The bar: ${barText(bar)}. The estimate is ${j.estimate ? 'inside' : 'outside'} the bar${j.crosses ? `, and the interval reaches ${j.estimate ? 'past' : 'inside'} it` : ''}.`;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} 52`, class: 'ew-gauge', role: 'img', 'aria-label': says });
  const text = (tx, ty, anchor, str) => { const t = svgEl('text', { class: 'ew-gauge__num', x: tx, y: ty, 'text-anchor': anchor }); t.textContent = str; return t; };
  svg.append(
    svgEl('rect', { class: 'ew-gauge__zone', x: zoneL, y: 14, width: Math.max(0, zoneR - zoneL), height: 20 }),
    text(bar.lo == null ? zoneL : bar.hi == null ? zoneR : (zoneL + zoneR) / 2, 10, bar.lo == null ? 'start' : bar.hi == null ? 'end' : 'middle', 'passes'),
    svgEl('line', { class: 'ew-gauge__axis', x1: 10, x2: W - 10, y1: 24, y2: 24 }));
  for (const v of [bar.lo, bar.hi]) {
    if (v == null) continue;
    svg.append(svgEl('line', { class: 'ew-gauge__limit', x1: x(v), x2: x(v), y1: 12, y2: 37 }), text(x(v), 49, 'middle', String(v)));
  }
  svg.append(
    svgEl('path', { class: 'ew-gauge__ci', d: `M${x(iv.lo)},19 v10 M${x(iv.lo)},24 H${x(iv.hi)} M${x(iv.hi)},19 v10` }),
    svgEl('circle', { class: 'ew-gauge__est', cx: x(iv.est), cy: 24, r: 5 }));
  return h('div', { class: 'ew-promise__gauge' }, svg,
    j.crosses ? h('p', { class: 'ew-cross' }, h('span', { 'aria-hidden': 'true', text: '↔ ' }), `The 95% interval reaches ${j.estimate ? 'past' : 'inside'} the bar.`) : null);
}

function renderPromises(sec, d) {
  const planDate = longDate(d.planCommit.date);
  const opened = d.testOpened && !/-00$/.test(d.testOpened.date) ? longDate(d.testOpened.date) : null;
  const counts = { met: 0, missed: 0, pending: 0 };
  d.items.forEach((it) => counts[it.status]++);
  const WORD = { met: 'Met', missed: 'Missed', pending: 'Pending' };
  const ICON = { met: '✓', missed: '✕', pending: '…' };

  const planBtn = h('button', { type: 'button', 'data-view': 'plan' }, h('span', { text: 'The plan' }), h('small', { text: planDate }));
  const resultBtn = h('button', { type: 'button', 'data-view': 'result' }, h('span', { text: 'The result' }), h('small', { text: opened || 'not yet' }));
  const summary = h('p', { class: 'ew-sum', 'aria-live': 'polite' });

  // Missed comes first: a visitor should be able to pull up the misses in one tap.
  const filters = ['all', 'missed', 'met', 'pending'].filter((f) => f === 'all' || counts[f]);
  const filterBtns = filters.map((f) => h('button', { type: 'button', 'data-show': f }, f === 'all' ? `All ${d.items.length}` : `${WORD[f]} ${counts[f]}`));
  const filterRow = h('div', { class: 'ew-filter' }, h('span', { class: 'ew-small', text: 'Show' }), h('div', { class: 'ew-seg', role: 'group', 'aria-label': 'Show promises by outcome' }, filterBtns));

  let crossedMet = 0;
  const groups = [...new Set(d.items.map((it) => it.group))];
  let k = 0;
  const rows = [];
  const groupEls = groups.map((g) => h('div', { class: 'ew-group' },
    h('h3', { text: g }),
    h('ol', {}, d.items.filter((it) => it.group === g).map((it) => {
      const bar = it.status === 'pending' ? null : readBar(it.promise);
      const iv = bar && readInterval(it.result);
      if (iv && it.status === 'met' && judge(bar, iv).crosses) crossedMet++;
      const li = h('li', { class: `ew-promise is-${it.status}`, style: `--i:${k++}` },
        h('p', { class: 'ew-promise__text', text: it.promise }),
        h('div', { class: 'ew-promise__plan' }, h('span', { class: 'ew-badge ew-badge--plan', text: 'Declared' })),
        h('div', { class: 'ew-promise__out' },
          h('span', { class: `ew-badge ew-badge--${it.status}` }, h('span', { 'aria-hidden': 'true', text: ICON[it.status] }), WORD[it.status]),
          h('span', { class: 'ew-promise__result', text: it.result }),
          iv ? gauge(bar, iv) : null));
      rows.push([li, it.status]);
      return li;
    }))));
  const list = h('div', { class: 'ew-promises' }, groupEls);

  // The order things happened, oldest first, as far as the file records it.
  const steps = [
    [d.planCommit, 'Plan committed, before any outcome data was opened'],
    [d.rulesCommit, 'Rules and model settings logged, before any model was fitted'],
    [d.freezeCommit, 'Model, calibration and cut points frozen'],
    [opened ? d.testOpened : null, 'Test term scored, once, with the frozen model'],
  ].filter(([c]) => c);
  const chain = h('div', { class: 'ew-chain' },
    h('h3', { text: 'In this order, by commit' }),
    h('ol', {}, steps.map(([c, what]) => h('li', {},
      h('span', { class: 'ew-chain__what', text: what }),
      h('span', { class: 'ew-chain__ref' }, commitRef(c), ` · ${longDate(c.date)}`))),
    opened ? null : h('li', { class: 'is-open' }, h('span', { class: 'ew-chain__what', text: 'Test term not opened yet' }))));

  let view = 'result'; let show = 'all';
  function paint() {
    sec.dataset.view = view;
    planBtn.setAttribute('aria-pressed', String(view === 'plan'));
    resultBtn.setAttribute('aria-pressed', String(view === 'result'));
    filterRow.hidden = view === 'plan';
    filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.show === show)));
    rows.forEach(([li, status]) => { li.hidden = view === 'result' && show !== 'all' && status !== show; });
    groupEls.forEach((g) => { g.hidden = ![...g.querySelectorAll('li')].some((li) => !li.hidden); });
    const useful = d.items.find((it) => it.id === 'useful' && it.status !== 'pending');
    summary.replaceChildren(view === 'plan'
      ? `${d.items.length} promises, each written down before any outcome data was opened. Nothing that turned out badly has been removed.`
      : h('span', {},
        h('b', { class: 'ew-t-missed' }, h('span', { 'aria-hidden': 'true', text: '✕ ' }), `${counts.missed} missed`), ' · ',
        h('b', { class: 'ew-t-met' }, h('span', { 'aria-hidden': 'true', text: '✓ ' }), `${counts.met} met`),
        counts.pending ? [' · ', h('b', { class: 'ew-t-pending', text: `${counts.pending} pending` })] : '',
        '. ', useful ? `${useful.result} ` : '',
        crossedMet ? `${crossedMet} of the met bars ${crossedMet === 1 ? 'has' : 'have'} an interval that reaches past the bar; it is drawn, not ticked off. ` : '',
        'The misses stay on the page: that is the point of writing them down first.'));
  }
  const setView = (v) => { view = v; paint(); };
  planBtn.addEventListener('click', () => setView('plan'));
  resultBtn.addEventListener('click', () => setView('result'));
  filterBtns.forEach((b) => b.addEventListener('click', () => { show = b.dataset.show; paint(); }));
  document.addEventListener('blueprint:change', (e) => setView(e.detail.on ? 'plan' : 'result'));

  sec.replaceChildren(
    head(sec, {
      eyebrow: 'PLAN FIRST, RESULTS SECOND', standin: d.standin,
      title: 'I set the bar before I saw the data.',
      lede: 'Before opening any outcomes I committed a plan: every test, the train/test split, and what would count as failure. Flip between what I promised and what happened. Blueprint mode (<kbd>B</kbd>) flips it too.',
    }),
    h('div', { class: 'ew-switch', role: 'group', 'aria-label': 'Show the plan or the result' }, planBtn, resultBtn),
    summary, filterRow, list, chain);
  setView(root.classList.contains('bp-mode') ? 'plan' : 'result');
}

// ── 2. Replay a term ────────────────────────────────────────────────
function renderReplay(sec, d) {
  const n = d.result.length;
  const K = d.cutoffs.length;
  const warnIdx = d.cutoffs.indexOf(d.warnDay);
  const hc = d.highCut * 100;
  // The axis ends at the first round number past the highest score, so the dots fill the plot.
  const XMAX = Math.min(100, Math.max(20, Math.ceil(Math.max(hc, ...d.risk) / 10) * 10));
  const TICK = XMAX <= 50 ? 10 : XMAX <= 80 ? 20 : 25;
  const undated = Array.from({ length: n }, (_, i) => i).filter((i) => d.left[i] == null && d.result[i] === 'W').length;
  const start = d.cutoffs[0];
  const end = d.length;
  const risk = (i, j) => d.risk[i * K + j];
  // A withdrawal with no recorded date is shown leaving on the last day.
  const leaveDay = Array.from({ length: n }, (_, i) => d.left[i] ?? (d.result[i] === 'W' ? end : null));
  const r28 = Array.from({ length: n }, (_, i) => risk(i, warnIdx));
  const flagged = r28.map((r) => r >= 0 && r >= hc);
  const order = shuffled(n, 97); // stable stacking order, unrelated to outcome
  const rank = new Int32Array(n);
  order.forEach((i, k) => { rank[i] = k; });

  // Totals for the end-of-term tally and the table view.
  const T = { early: 0, flagged: 0, caught: 0, missed: 0, falseAlarm: 0, enrolled28: 0 };
  for (let i = 0; i < n; i++) {
    const L = leaveDay[i];
    if (L != null && L < d.warnDay) { T.early++; continue; }
    T.enrolled28++;
    const w = d.result[i] === 'W';
    if (flagged[i]) { T.flagged++; if (w) T.caught++; else T.falseAlarm++; } else if (w) T.missed++;
  }

  // ─ DOM
  const canvas = h('canvas', { class: 'ew-replay__canvas', role: 'img', 'aria-label': `Dot plot of ${fmt(n)} students by weekly risk score, with the High-risk zone at ${cutPct(d.highCut)} and above. The caption and the table below give the numbers.` });
  const tip = h('div', { class: 'viz__tip', hidden: true });
  const stage = h('div', { class: 'ew-replay__stage' }, canvas, tip);
  const playBtn = h('button', { type: 'button', class: 'demo__go ew-play' }, 'Play');
  const restartBtn = h('button', { type: 'button', class: 'ew-ghost', text: 'Restart' });
  const scrub = h('input', { type: 'range', min: start, max: end, step: 1, value: start, class: 'ew-scrub', 'aria-label': 'Day of term' });
  const dayLabel = h('span', { class: 'ew-day' });
  const caption = h('p', { class: 'ew-caption', 'aria-live': 'polite' });
  const tiles = h('div', { class: 'ew-tiles' });
  const table = h('details', { class: 'ew-table' },
    h('summary', { text: 'The end-of-term numbers as a table' }),
    h('table', {},
      h('thead', {}, h('tr', {}, h('th', { text: '' }), h('th', { text: 'Withdrew later' }), h('th', { text: 'Stayed' }), h('th', { text: 'Total' }))),
      h('tbody', {},
        h('tr', {}, h('th', { text: `On the day-${d.warnDay} warning list` }), h('td', { text: fmt(T.caught) }), h('td', { text: fmt(T.falseAlarm) }), h('td', { text: fmt(T.flagged) })),
        h('tr', {}, h('th', { text: 'Not on the list' }), h('td', { text: fmt(T.missed) }), h('td', { text: fmt(T.enrolled28 - T.flagged - T.missed) }), h('td', { text: fmt(T.enrolled28 - T.flagged) })),
        h('tr', {}, h('th', { text: `Left before day ${d.warnDay}, before a warning was possible` }), h('td', { text: fmt(T.early) }), h('td', { text: '—' }), h('td', { text: fmt(T.early) })))));

  sec.replaceChildren(
    head(sec, {
      eyebrow: 'REPLAY A TERM', standin: d.standin,
      title: 'Watch the warning list form, then see who left.',
      lede: `${fmt(n)} registrations drawn at random from the ${fmt(d.population)} that started the October 2014 term, which the model never trained on. Each week everyone is re-scored from what they've done so far, by the same recipe refitted for that week. On day ${d.warnDay} the list locks: the shaded zone is High risk, a score of ${cutPct(d.highCut)} or more, a cut point fixed on an earlier term. Then the term plays out, and students drop into the tray on the day they withdrew.`,
    }),
    h('div', { class: 'ew-replay__controls' }, playBtn, restartBtn, h('label', { class: 'ew-scrub-wrap' }, dayLabel, scrub)),
    stage, caption, tiles, table);

  // ─ Geometry. Bins are aligned so the High-risk cut falls on a bin edge.
  let W = 0; let H = 0; let dpr = 1; let geo = null;
  const xs = new Float32Array(n); const ys = new Float32Array(n); const alpha = new Float32Array(n).fill(1);
  const tx = new Float32Array(n); const ty = new Float32Array(n); const ta = new Float32Array(n).fill(1);
  const fx = new Float32Array(n); const fy = new Float32Array(n); const fa = new Float32Array(n);
  const isTray = new Uint8Array(n);
  let animStart = 0; let animating = false;

  function layout() {
    W = stage.clientWidth;
    const narrow = W < 560;
    const bw = (narrow ? 5 : 2.5) * (XMAX / 100); // bin width in risk points
    const off = hc % bw;
    const nb = Math.ceil((XMAX - off) / bw) + 1;
    const bin = (r) => clamp(Math.floor((r - off) / bw) + 1, 0, nb - 1);
    const pad = { l: 8, r: 8 };
    const plotW = W - pad.l - pad.r;
    const edge = (b) => pad.l + (clamp(b === 0 ? 0 : off + (b - 1) * bw, 0, XMAX) / XMAX) * plotW;
    // Largest stacks over the whole replay decide the dot size.
    let maxMain = 1; let maxTray = 1;
    for (let j = 0; j < K; j++) {
      const c = new Int32Array(nb);
      for (let i = 0; i < n; i++) if (risk(i, j) >= 0) c[bin(risk(i, j))]++;
      maxMain = Math.max(maxMain, ...c);
    }
    const ct = new Int32Array(nb);
    for (let i = 0; i < n; i++) if (leaveDay[i] != null && leaveDay[i] >= d.warnDay) ct[bin(r28[i])]++;
    maxTray = Math.max(1, ...ct);
    const binPx = plotW * (bw / XMAX);
    const mainMax = narrow ? 240 : 300;
    const trayMax = narrow ? 130 : 160;
    let s = 3;
    for (let t = 12; t >= 3; t -= 0.5) {
      const per = Math.max(1, Math.floor(binPx / t));
      if (Math.ceil(maxMain / per) * t <= mainMax && Math.ceil(maxTray / per) * t <= trayMax) { s = t; break; }
    }
    const per = Math.max(1, Math.floor(binPx / s));
    const mainH = Math.ceil(maxMain / per) * s;
    const trayH = Math.ceil(maxTray / per) * s;
    const top = 26; const axis = 44;
    H = top + mainH + axis + trayH + 26;
    geo = { bw, nb, bin, edge, s, per, top, base: top + mainH, trayTop: top + mainH + axis, pad, plotW, narrow, binPx };
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.height = `${H}px`;
  }

  function targets(day) {
    const { bin, edge, s, per, base, trayTop, binPx } = geo;
    const j = d.cutoffs.reduce((acc, c, k) => (c <= day ? k : acc), 0);
    const stacks = new Int32Array(geo.nb); const trays = new Int32Array(geo.nb);
    const inset = (binPx - per * s) / 2;
    // Stack in a stable order: main plot by random rank, tray by the day they left.
    const byRank = order;
    const trayOrder = [...order].filter((i) => leaveDay[i] != null && leaveDay[i] >= d.warnDay).sort((a, b) => leaveDay[a] - leaveDay[b] || rank[a] - rank[b]);
    for (const i of byRank) {
      const L = leaveDay[i];
      if (L != null && L <= day) continue;
      const b = bin(risk(i, j) < 0 ? 0 : risk(i, j));
      const k = stacks[b]++;
      tx[i] = edge(b) + inset + (k % per) * s + s / 2;
      ty[i] = base - Math.floor(k / per) * s - s / 2;
      ta[i] = 1; isTray[i] = 0;
    }
    for (const i of trayOrder) {
      if (leaveDay[i] > day) continue;
      const b = bin(r28[i]);
      const k = trays[b]++;
      tx[i] = edge(b) + inset + (k % per) * s + s / 2;
      ty[i] = trayTop + Math.floor(k / per) * s + s / 2;
      ta[i] = 1; isTray[i] = 1;
    }
    for (let i = 0; i < n; i++) {
      const L = leaveDay[i];
      if (L != null && L < d.warnDay && L <= day) { tx[i] = xs[i]; ty[i] = ys[i] + 18; ta[i] = 0; isTray[i] = 0; }
    }
  }

  function moveTo(day, animate) {
    targets(day);
    if (!animate || reduceMotion) {
      xs.set(tx); ys.set(ty); alpha.set(ta); animating = false; draw(); return;
    }
    fx.set(xs); fy.set(ys); fa.set(alpha);
    animStart = performance.now(); animating = true;
    requestAnimationFrame(step);
  }
  function step(now) {
    if (!animating) return;
    const t = clamp((now - animStart) / 650, 0, 1);
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    for (let i = 0; i < n; i++) {
      xs[i] = fx[i] + (tx[i] - fx[i]) * e; ys[i] = fy[i] + (ty[i] - fy[i]) * e; alpha[i] = fa[i] + (ta[i] - fa[i]) * e;
    }
    draw();
    if (t < 1) requestAnimationFrame(step); else animating = false;
  }

  let day = start;
  function draw() {
    if (!geo) return;
    const c = canvas.getContext('2d');
    const P = palette();
    const { edge, s, top, base, trayTop, pad, plotW, narrow } = geo;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const locked = day >= d.warnDay;
    // High-risk zone: faint before the list locks, solid after.
    const zx = pad.l + (hc / XMAX) * plotW;
    c.fillStyle = P.zone;
    c.globalAlpha = locked ? 1 : 0.45;
    c.fillRect(zx, top - 18, pad.l + plotW - zx, H - top + 10);
    c.globalAlpha = 1;
    c.strokeStyle = P.out; c.lineWidth = 1.5; c.setLineDash(locked ? [] : [4, 4]);
    c.beginPath(); c.moveTo(zx + 0.5, top - 18); c.lineTo(zx + 0.5, H - 8); c.stroke(); c.setLineDash([]);
    c.font = '500 12px Geist, system-ui, sans-serif'; c.textBaseline = 'alphabetic';
    c.fillStyle = P.ink; c.textAlign = 'left';
    const zoneLabel = narrow ? `High risk ≥ ${cutPct(d.highCut)}` : `Warning list: High risk ≥ ${cutPct(d.highCut)}${locked ? ' · locked' : ''}`;
    c.fillText(zoneLabel, Math.min(zx + 8, W - c.measureText(zoneLabel).width - 4), top - 6);
    // Axis between the plot and the tray.
    c.strokeStyle = P.line; c.lineWidth = 1;
    c.beginPath(); c.moveTo(pad.l, base + 1.5); c.lineTo(pad.l + plotW, base + 1.5); c.stroke();
    c.fillStyle = P.ink3; c.font = '12px Geist, system-ui, sans-serif';
    for (let t = 0; t <= XMAX; t += TICK) {
      const x = pad.l + (t / XMAX) * plotW;
      c.textAlign = t === 0 ? 'left' : t === XMAX ? 'right' : 'center';
      c.fillText(`${t}%`, x, base + 17);
    }
    // Axis title at the right end, clear of the warning line wherever the cut point falls.
    // On a phone the tray label needs the room; the caption below says what the axis is.
    if (!narrow) {
      c.textAlign = 'right';
      c.fillText(locked ? `Risk score on day ${d.warnDay} →` : 'Risk score this week →', pad.l + plotW, base + 33);
    }
    c.textAlign = 'left'; c.fillStyle = P.ink2;
    c.fillText(`Withdrew after day ${d.warnDay} ↓`, pad.l, trayTop - 4 < base + 36 ? trayTop + 12 : trayTop - 4);
    // Dots: grey while enrolled, accent once they have withdrawn.
    const r = Math.max(1.2, s / 2 - 0.6);
    for (let i = 0; i < n; i++) {
      if (alpha[i] <= 0.01) continue;
      c.globalAlpha = alpha[i];
      c.beginPath(); c.arc(xs[i], ys[i], r, 0, Math.PI * 2);
      if (isTray[i]) {
        if (flagged[i]) { c.fillStyle = P.out; c.fill(); } else { c.strokeStyle = P.out; c.lineWidth = Math.max(1, r * 0.55); c.stroke(); }
      } else { c.fillStyle = P.dot; c.fill(); }
    }
    c.globalAlpha = 1;
  }

  function counts(dayNow) {
    const out = { early: 0, caught: 0, missed: 0, flaggedStill: 0 };
    for (let i = 0; i < n; i++) {
      const L = leaveDay[i];
      if (L != null && L < d.warnDay) { if (L <= dayNow) out.early++; continue; }
      if (dayNow < d.warnDay) continue;
      const gone = L != null && L <= dayNow;
      if (gone) { if (flagged[i]) out.caught++; else out.missed++; } else if (flagged[i]) out.flaggedStill++;
    }
    return out;
  }

  function tile(label, value, note, cls = '') {
    return h('div', { class: `ew-tile ${cls}` }, h('span', { class: 'ew-tile__label', text: label }), h('span', { class: 'ew-tile__value', text: value }), note ? h('span', { class: 'ew-tile__note', text: note }) : null);
  }

  // The caption is read out when it changes, so it changes only between phases, not every day.
  const say = (text) => { if (caption.textContent !== text) caption.textContent = text; };
  function update(newDay, animate = true) {
    const prevJ = d.cutoffs.reduce((a, c, k) => (c <= day ? k : a), 0);
    const prevDay = day;
    day = clamp(Math.round(newDay), start, end);
    scrub.value = String(day);
    const week = Math.ceil(day / 7);
    dayLabel.textContent = day >= end ? 'End of term' : `Day ${day} · week ${week}`;
    const j = d.cutoffs.reduce((a, c, k) => (c <= day ? k : a), 0);
    const leftChanged = leaveDay.some((L) => L != null && ((L > prevDay && L <= day) || (L > day && L <= prevDay)));
    if (j !== prevJ || leftChanged || !animate) moveTo(day, animate); else draw();

    const c = counts(day);
    const later = T.caught + T.missed;
    if (day < d.warnDay) {
      say(`Week ${week}. Everyone still enrolled is re-scored from their activity so far; dots move right as risk rises. Students who leave before day ${d.warnDay} are counted in the last tile below.`);
    } else if (day < d.warnDay + 10) {
      say(`Day ${d.warnDay}: the warning list locks with ${fmt(T.flagged)} students in the shaded zone (${pct(T.flagged / T.enrolled28)} of those still enrolled). From here no score changes; the term plays out.`);
    } else if (day < end) {
      say('The term plays out. Students drop into the tray on the day they withdrew. Solid dots were on the list (caught); hollow dots were not (missed).');
    } else {
      say(`End of term. The day-${d.warnDay} list caught ${fmt(T.caught)} of the ${fmt(later)} students who withdrew later (${pct(T.caught / Math.max(later, 1))}). ${fmt(T.falseAlarm)} students on the list stayed (false alarms). ${fmt(T.early)} left before a warning was possible.${undated ? ` ${fmt(undated)} withdrew with no date recorded and are shown leaving on the last day.` : ''}`);
    }
    tiles.replaceChildren(
      tile('Caught', day < d.warnDay ? '—' : fmt(c.caught), 'on the list, then withdrew', 'is-caught'),
      tile('Missed', day < d.warnDay ? '—' : fmt(c.missed), 'not on the list, withdrew', 'is-missed'),
      tile(day >= end ? 'False alarms' : 'On the list, still here', day < d.warnDay ? '—' : fmt(c.flaggedStill), day >= end ? 'flagged, but stayed' : 'flagged, still enrolled'),
      tile(`Left before day ${d.warnDay}`, fmt(c.early), 'before a warning was possible'));
  }

  // ─ Playback: slow through the weekly scores, pause at the lock, then faster.
  let playing = false; let last = 0; let pauseUntil = 0; let dayF = start;
  function tick(now) {
    if (!playing) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (now < pauseUntil) { requestAnimationFrame(tick); return; }
    const rate = dayF < d.warnDay ? 6 : 34;
    const before = dayF;
    dayF = Math.min(end, dayF + rate * dt);
    // Stop briefly on each weekly score and at the lock.
    const hit = d.cutoffs.find((cut) => before < cut && dayF >= cut);
    if (hit) { dayF = hit; pauseUntil = now + (hit === d.warnDay ? 2200 : 700); }
    update(dayF);
    if (dayF >= end) { setPlaying(false); return; }
    requestAnimationFrame(tick);
  }
  function setPlaying(on) {
    playing = on;
    playBtn.textContent = on ? 'Pause' : day >= end ? 'Replay' : 'Play';
    if (on) {
      if (day >= end) { dayF = start; update(start); }
      dayF = day; last = performance.now(); pauseUntil = 0;
      requestAnimationFrame(tick);
    }
  }
  playBtn.addEventListener('click', () => setPlaying(!playing));
  restartBtn.addEventListener('click', () => { setPlaying(false); dayF = start; update(start); });
  scrub.addEventListener('input', () => { setPlaying(false); dayF = Number(scrub.value); update(dayF); });

  // ─ Hover: nearest dot, its weekly scores and what happened to it so far.
  canvas.addEventListener('pointermove', (e) => {
    if (!geo) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    let best = -1; let bestD = (geo.s + 3) ** 2;
    for (let i = 0; i < n; i++) {
      if (alpha[i] < 0.5) continue;
      const dd = (xs[i] - x) ** 2 + (ys[i] - y) ** 2;
      if (dd < bestD) { bestD = dd; best = i; }
    }
    if (best < 0) { tip.hidden = true; return; }
    const scores = d.cutoffs.map((cut, j) => (cut <= day && risk(best, j) >= 0 ? `${risk(best, j)}%` : null)).filter(Boolean);
    const L = leaveDay[best];
    const status = L != null && L <= day ? `Withdrew on day ${L}` : day >= end ? (d.result[best] === 'F' ? 'Stayed; failed' : 'Stayed; passed') : 'Still enrolled';
    tip.replaceChildren(
      h('span', {}, h('b', { text: `Weekly risk: ${scores.join(' → ') || 'not scored yet'}` })),
      h('span', { text: flagged[best] && day >= d.warnDay ? 'On the warning list' : day >= d.warnDay && r28[best] >= 0 ? 'Not on the warning list' : '' }),
      h('span', { text: status }));
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = `${clamp(xs[best] + 12, 4, W - tw - 4)}px`;
    tip.style.top = `${ys[best] + canvas.offsetTop + 14}px`;
  });
  canvas.addEventListener('pointerleave', () => { tip.hidden = true; });

  const ro = new ResizeObserver(() => { const w = stage.clientWidth; if (w && w !== W) { layout(); moveTo(day, false); } });
  ro.observe(stage);
  repaintHooks.add(draw);
  layout();
  update(start, false);

  // Start playing once, the first time the replay is mostly on screen.
  if (!reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { io.disconnect(); if (day === start) setPlaying(true); }
    }, { threshold: 0.55 });
    io.observe(stage);
  }
}

// ── 3. Beat the model ───────────────────────────────────────────────
function renderBeat(sec, d) {
  const ROUND = 6;
  const deck = shuffled(d.cards.length);
  let deckPos = 0; let round = []; let guesses = []; let at = 0;
  const total = { you: 0, model: 0, cards: 0 };
  const stage = h('div', { class: 'ew-beat__stage', 'aria-live': 'polite' });
  const alwaysStays = 1 - d.poolRate;
  const cut = cutPct(d.threshold);
  // How the model's calls do over the whole pool, for the running score's context.
  const modelPool = d.cards.filter((c) => (c.p >= d.threshold) === c.withdrew).length / d.cards.length;
  const termNote = h('span', {});

  sec.replaceChildren(
    head(sec, {
      eyebrow: 'BEAT THE MODEL', standin: d.standin,
      title: 'Six students. Who withdraws?',
      lede: `Each card is a real student who was still enrolled at the end of week 4. The pool is ${fmt(d.cards.length)} of them drawn at random, and every round deals six, never picked for whether the model was right. You see what the model saw. Call each one, then compare with the model and with what actually happened.`,
    }),
    h('p', { class: 'ew-rule' },
      h('b', { text: 'The model\'s call: ' }), `"withdraws" when the student is in its High-risk group, a score of ${cut} or more. `,
      h('b', { text: 'The pool: ' }), `${pct(d.poolRate, 1)} of these ${fmt(d.cards.length)} students withdrew, so always guessing "stays" would be right ${pct(alwaysStays, 1)} of the time. `, termNote),
    h('p', { class: 'ew-small ew-rule__why', text: 'The plan first set the model\'s call at 50%. On the earlier term, the one used to set the cut points, no student scored that high, so the model would have said "stays" on every card. The rule was changed in the plan\'s change log before the test term was opened.' }),
    stage);
  // The term's own rate sits in the advising file; add it for comparison when it arrives.
  load('advising').then((a) => {
    if (Boolean(a.standin) === Boolean(d.standin) && Math.abs(a.rate - d.poolRate) >= 0.005) {
      termNote.textContent = `Across the whole term it was ${pct(a.rate, 1)}: the pool's rate is the luck of the draw, kept as drawn.`;
    }
  }).catch(() => {});

  function nextRound() {
    if (deckPos + ROUND > deck.length) deckPos = 0;
    round = deck.slice(deckPos, deckPos + ROUND).map((k) => d.cards[k]);
    deckPos += ROUND; guesses = []; at = 0;
    showCard();
  }

  function sparkline(c) {
    const labels = ['Before', 'Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
    const w = 300; const hgt = 120; const padB = 20; const padT = 8;
    const max = Math.max(...c.weeks, ...c.typical, 1);
    const svg = svgEl('svg', { viewBox: `0 0 ${w} ${hgt}`, class: 'ew-spark', role: 'img', 'aria-label': `Clicks by week: ${c.weeks.map((v, i) => `${labels[i]} ${v}`).join(', ')}. Typical student: ${c.typical.join(', ')}.` });
    const slot = w / 5; const bw = Math.min(30, slot * 0.46);
    const y = (v) => padT + (hgt - padB - padT) * (1 - v / max);
    svg.append(svgEl('line', { x1: 0, x2: w, y1: hgt - padB + 0.5, y2: hgt - padB + 0.5, class: 'viz__grid' }));
    c.weeks.forEach((v, i) => {
      const cx = slot * i + slot / 2;
      const top = y(v); const hh = Math.max(0, hgt - padB - top);
      if (hh > 0) svg.append(svgEl('path', { class: 'ew-spark__bar', d: `M${cx - bw / 2},${hgt - padB} V${top + Math.min(4, hh)} q0,-4 4,-4 H${cx + bw / 2 - 4} q4,0 4,4 V${hgt - padB} Z` }));
      const ty = y(c.typical[i]);
      svg.append(svgEl('line', { class: 'ew-spark__typ', x1: cx - bw / 2 - 5, x2: cx + bw / 2 + 5, y1: ty, y2: ty }));
      const t = svgEl('text', { x: cx, y: hgt - 5, class: 'viz__tick', 'text-anchor': 'middle' }); t.textContent = labels[i];
      svg.append(t);
    });
    return svg;
  }

  function facts(c) {
    const days = (k) => `${fmt(k)} day${k === 1 ? '' : 's'}`;
    const reg = c.registered === 0 ? 'Registered on the first day' : c.registered > 0 ? `Registered ${days(c.registered)} before the start` : `Registered ${days(-c.registered)} after the start`;
    const attempt = c.attempts === 0 ? 'First attempt at this module' : `Attempt ${c.attempts + 1} at this module`;
    // A student who never clicked has no last visit; the file's lastSeen is then a filler value.
    const seen = c.neverOnline ? 'Never online' : c.lastSeen <= 1 ? 'Online in the last day' : `Last online ${c.lastSeen} days before day 28`;
    const task = { 'on time': 'Handed in on time', late: 'Handed in late', 'not submitted': 'Not handed in', 'none due': 'None due yet' }[c.firstTask];
    return h('dl', { class: 'ew-facts' },
      h('div', {}, h('dt', { text: 'Active' }), h('dd', { text: `${c.activeDays} of the first 28 days` })),
      h('div', {}, h('dt', { text: 'Last seen' }), h('dd', { text: seen })),
      h('div', {}, h('dt', { text: 'First assignment' }), h('dd', { text: task })),
      h('div', {}, h('dt', { text: 'Load' }), h('dd', { text: `${c.credits} credits · ${attempt.toLowerCase()}` })),
      h('div', {}, h('dt', { text: 'Registration' }), h('dd', { text: reg })));
  }

  function showCard() {
    const c = round[at];
    // Checked before the old card is replaced: replacing it drops the focus it held.
    const playing = sec.contains(document.activeElement);
    const clicks = c.weeks.reduce((a, b) => a + b, 0);
    const typical = c.typical.reduce((a, b) => a + b, 0);
    const choose = (leaves) => { guesses.push(leaves); at++; if (at < ROUND) showCard(); else reveal(); };
    const stays = h('button', { type: 'button', class: 'ew-call', onclick: () => choose(false) }, 'Stays');
    const leaves = h('button', { type: 'button', class: 'ew-call ew-call--leaves', onclick: () => choose(true) }, 'Withdraws');
    stage.replaceChildren(h('article', { class: 'ew-card' },
      h('div', { class: 'ew-card__top' },
        h('span', { class: 'ew-card__n', text: `Student ${at + 1} of ${ROUND}` }),
        h('span', { class: 'ew-dots', 'aria-hidden': 'true' }, round.map((_, k) => h('i', { class: k < at ? 'is-done' : k === at ? 'is-now' : '' })))),
      h('div', { class: 'ew-card__body' },
        h('div', {},
          h('p', { class: 'ew-card__label' }, h('b', { text: `${fmt(clicks)} clicks` }), ` in the online classroom by day 28 · typical student in the module: ${fmt(typical)}`),
          sparkline(c),
          h('p', { class: 'ew-key' }, h('span', {}, h('i', { class: 'ew-key__bar' }), 'This student'), h('span', {}, h('i', { class: 'ew-key__typ' }), 'Typical student'))),
        facts(c)),
      h('div', { class: 'ew-card__calls' }, stays, leaves)));
    // Keep keyboard focus in the game once the visitor is playing, but don't
    // pull focus to it when the section first loads.
    if (playing) stays.focus({ preventScroll: true });
  }

  function reveal() {
    let you = 0; let model = 0;
    const rows = round.map((c, k) => {
      const modelLeaves = c.p >= d.threshold;
      const youRight = guesses[k] === c.withdrew; const modelRight = modelLeaves === c.withdrew;
      you += youRight; model += modelRight;
      const mark = (ok) => h('span', { class: `ew-mark ${ok ? 'is-right' : 'is-wrong'}` }, h('span', { 'aria-hidden': 'true', text: ok ? '✓' : '✕' }), h('span', { class: 'sr', text: ok ? 'right' : 'wrong' }));
      return h('li', { class: `ew-rev ${c.withdrew ? 'is-left' : ''}`, style: `--i:${k}` },
        h('span', { class: 'ew-rev__n', text: `${k + 1}` }),
        h('span', { class: 'ew-rev__truth', text: c.withdrew ? `Withdrew${c.leftDay ? ` on day ${c.leftDay}` : ''}` : 'Stayed' }),
        h('span', { class: 'ew-rev__you' }, mark(youRight), `You: ${guesses[k] ? 'withdraws' : 'stays'}`),
        h('span', { class: 'ew-rev__model' }, mark(modelRight), `Model: ${pct(c.p, 1)} → ${modelLeaves ? 'withdraws' : 'stays'}`));
    });
    total.you += you; total.model += model; total.cards += ROUND;
    const verdict = you > model ? 'You beat the model this round.' : you === model ? 'A tie this round.' : 'The model wins this round.';
    const again = h('button', { type: 'button', class: 'demo__go', onclick: nextRound }, 'Play another round');
    stage.replaceChildren(h('div', { class: 'ew-result' },
      h('p', { class: 'ew-score' },
        h('span', {}, h('small', { text: 'You' }), h('b', { text: `${you}/${ROUND}` })),
        h('span', {}, h('small', { text: 'Model' }), h('b', { text: `${model}/${ROUND}` }))),
      h('p', { class: 'ew-verdict', text: verdict }),
      h('ol', { class: 'ew-revs' }, rows),
      h('p', { class: 'ew-running', text: `So far: you ${pct(total.you / total.cards)}, the model ${pct(total.model / total.cards)} over ${total.cards} students. Over all ${fmt(d.cards.length)} cards in the pool the model's calls are right ${pct(modelPool, 1)} of the time; always guessing "stays" is right ${pct(alwaysStays, 1)}. The model calls "withdraws" at ${cut} or more.` }),
      again));
    again.focus({ preventScroll: true });
  }

  nextRound();
}

// ── 4. You run advising ─────────────────────────────────────────────
function renderAdvising(sec, d) {
  const n = d.n;
  const w = Uint8Array.from(d.withdrew, (ch) => ch === '1');
  const totalW = w.reduce((a, b) => a + b, 0);
  const codes = Object.fromEntries(Object.keys(d.traits).map((t) => [t, Uint8Array.from(d[t], (ch) => parseInt(ch, 36))]));
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => d.score[b] - d.score[a]);
  const names = { age_band: 'Age', disability: 'Disability', imd_band: 'Area deprivation', gender: 'Gender' };
  let trait = 'age_band'; let share = 0.15; let equal = false;

  const slider = h('input', { type: 'range', min: 1, max: 40, step: 1, value: 15, class: 'ew-scrub', id: 'ew-cap' });
  const capLabel = h('label', { for: 'ew-cap', class: 'ew-cap' });
  const traitBtns = Object.keys(names).map((t) => h('button', { type: 'button', 'data-trait': t, text: names[t] }));
  const eqBox = h('input', { type: 'checkbox', id: 'ew-eq' });
  const tiles = h('div', { class: 'ew-tiles ew-tiles--3' });
  const rows = h('div', { class: 'ew-groups' });
  const gap = h('p', { class: 'ew-gap', 'aria-live': 'polite' });

  sec.replaceChildren(
    head(sec, {
      eyebrow: 'YOU RUN ADVISING', standin: d.standin,
      title: 'How many students can your advisers call?',
      lede: `All ${fmt(n)} students still enrolled at day 28 of the October 2014 term, ranked by the model's score; ${pct(d.rate, 1)} of them withdrew later. Advisers call from the top down. Pick how many they can reach, then see who gets caught, and for which groups. The plan's bar: catch rates within 5 points across groups.`,
    }),
    h('div', { class: 'ew-adv__controls' },
      h('div', { class: 'ew-adv__cap' }, capLabel, slider),
      h('div', { class: 'ew-adv__trait' }, h('span', { class: 'ew-small', text: 'Compare by' }), h('div', { class: 'ew-seg', role: 'group', 'aria-label': 'Compare groups by' }, traitBtns)),
      h('label', { class: 'ew-toggle', for: 'ew-eq' }, eqBox, h('span', {}, 'Give every group the same catch rate'))),
    tiles, h('h3', { class: 'ew-groups__title', text: 'Share of each group\'s withdrawals that advisers reach' }), rows, gap);

  function run() {
    const k = Math.round(share * n);
    const flagged = new Uint8Array(n);
    let caught = 0;
    for (let r = 0; r < k; r++) { flagged[order[r]] = 1; caught += w[order[r]]; }
    const baseTpr = caught / totalW;
    const labels = d.traits[trait]; const code = codes[trait];
    const G = labels.map((label) => ({ label, n: 0, w: 0, f: 0, c: 0 }));
    for (let i = 0; i < n; i++) { const g = G[code[i]]; g.n++; g.w += w[i]; }
    let contacts = k; let caughtEq = caught;
    if (equal) {
      // Each group gets its own cut point: call down its own ranking until
      // the group's catch rate reaches the overall rate.
      flagged.fill(0);
      contacts = 0; caughtEq = 0;
      const need = G.map((g) => Math.ceil(baseTpr * g.w - 1e-9));
      const got = G.map(() => 0);
      for (const i of order) {
        const gi = code[i];
        if (got[gi] >= need[gi]) continue;
        flagged[i] = 1; contacts++; got[gi] += w[i]; caughtEq += w[i];
      }
    }
    for (let i = 0; i < n; i++) if (flagged[i]) { const g = G[code[i]]; g.f++; g.c += w[i]; }
    const nowCaught = equal ? caughtEq : caught;
    const tile = (label, value, note, cls = '') => h('div', { class: `ew-tile ${cls}` }, h('span', { class: 'ew-tile__label', text: label }), h('span', { class: 'ew-tile__value', text: value }), note ? h('span', { class: 'ew-tile__note', text: note }) : null);
    const extra = contacts - k;
    tiles.replaceChildren(
      tile('Withdrawals reached', `${fmt(nowCaught)} of ${fmt(totalW)}`, `${pct(nowCaught / totalW)} of everyone who later withdrew`, 'is-caught'),
      tile('Calls to students who stayed', fmt(contacts - nowCaught), `${(contacts / Math.max(nowCaught, 1)).toFixed(1)} calls per withdrawal reached`),
      tile('Calls made', fmt(contacts), equal ? `${extra >= 0 ? '+' : '−'}${fmt(Math.abs(extra))} versus one cut point for everyone` : `the top ${pct(share)} of ${fmt(n)} students`));
    capLabel.replaceChildren('Advisers can call ', h('b', { text: fmt(k) }), ` students (${pct(share)})`);
    slider.setAttribute('aria-valuetext', `${fmt(k)} students, ${pct(share)} of ${fmt(n)}`);

    const judged = G.filter((g) => g.n >= 100 && g.w > 0);
    rows.replaceChildren(...G.map((g) => {
      const small = g.n < 100 || g.w === 0;
      const tpr = g.w ? g.c / g.w : 0;
      const fpr = g.n - g.w ? (g.f - g.c) / (g.n - g.w) : 0;
      return h('div', { class: `ew-grp ${small ? 'is-small' : ''}` },
        h('span', { class: 'ew-grp__label' }, g.label, h('small', { text: `${fmt(g.n)} students` })),
        h('span', { class: 'ew-grp__track', role: 'img', 'aria-label': `${g.label}: ${pct(tpr)} of withdrawals reached` },
          h('i', { class: 'ew-grp__bar', style: `width:${(100 * tpr).toFixed(1)}%` }),
          h('i', { class: 'ew-grp__ref', style: `left:${(100 * baseTpr).toFixed(1)}%` })),
        h('span', { class: 'ew-grp__num' }, small ? h('span', { class: 'ew-small', text: 'too few to judge' }) : [h('b', { text: pct(tpr) }), ` · false alarms ${pct(fpr)}`]));
    }));
    if (judged.length > 1) {
      const rates = judged.map((g) => g.c / g.w);
      const spread = (Math.max(...rates) - Math.min(...rates)) * 100;
      const lo = judged[rates.indexOf(Math.min(...rates))].label;
      const over = spread > 5;
      gap.className = `ew-gap ${over ? 'is-over' : 'is-under'}`;
      gap.replaceChildren(
        h('span', { class: 'ew-badge ' + (over ? 'ew-badge--missed' : 'ew-badge--met') }, h('span', { 'aria-hidden': 'true', text: over ? '✕' : '✓' }), over ? 'Over the bar' : 'Within the bar'),
        ` Largest gap in catch rate: ${spread.toFixed(1)} points${over ? `, lowest for ${lo}` : ''}. The line on each bar is the overall rate.`,
        equal ? ` Equal catch rates cost ${fmt(Math.abs(extra))} ${extra >= 0 ? 'more' : 'fewer'} calls here.` : '');
    } else gap.replaceChildren();
    traitBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.trait === trait)));
  }

  slider.addEventListener('input', () => { share = Number(slider.value) / 100; run(); });
  traitBtns.forEach((b) => b.addEventListener('click', () => { trait = b.dataset.trait; run(); }));
  eqBox.addEventListener('change', () => { equal = eqBox.checked; run(); });
  run();
}

// ── 5. Case files ───────────────────────────────────────────────────
function renderCasefiles(sec, d) {
  const OPEN = 3; // fixed in the plan: the three checks with the largest effect open, the rest one tap away
  // A check can touch many rows and still need no change, so the stamp follows `changed`, not the count.
  const card = (f, k) => h('article', { class: `ew-case ${f.changed ? 'is-changed' : 'is-clean'}` },
    h('div', { class: 'ew-case__top' },
      h('span', { class: 'ew-case__n', text: `CASE ${String(k + 1).padStart(2, '0')}` }),
      h('span', { class: 'ew-stamp', text: f.changed ? 'Changed the analysis' : f.rows ? 'Noted, no change' : 'Clean' })),
    h('h3', { text: f.title }),
    h('dl', {},
      h('div', {}, h('dt', { text: 'Expected' }), h('dd', { text: f.expected })),
      h('div', {}, h('dt', { text: 'Found' }), h('dd', { text: f.found })),
      h('div', {}, h('dt', { text: 'Decided' }), h('dd', { text: f.decided }))),
    f.rows ? h('p', { class: 'ew-case__rows' }, h('b', { text: fmt(f.rows) }), ` registrations affected · ${pct(f.share, 1)} of all`) : null);
  const first = d.files.slice(0, OPEN).map(card);
  const rest = d.files.slice(OPEN).map((f, k) => card(f, k + OPEN));
  const more = h('div', { class: 'ew-cases', hidden: true }, rest);
  const btn = h('button', { type: 'button', class: 'ew-ghost', 'aria-expanded': 'false' }, `Show the other ${rest.length} checks`);
  btn.addEventListener('click', () => {
    const open = more.hidden;
    more.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Show fewer' : `Show the other ${rest.length} checks`;
  });
  const changed = d.files.filter((f) => f.changed).length;
  sec.replaceChildren(
    head(sec, {
      eyebrow: 'CASE FILES', standin: d.standin,
      title: 'Before any model: what the data got wrong.',
      lede: `${d.files.length} checks ran before any modelling, and ${changed} of them changed the analysis. Open here: the ${first.length} that changed the analysis for the most registrations. The other ${rest.length}, including the checks that needed no change, are one tap away.`,
    }),
    h('div', { class: 'ew-cases ew-cases--top' }, first), rest.length ? more : null, rest.length ? btn : null);
}

// ── Load each piece when it comes near the screen ───────────────────
// Each file is fetched once, however many pieces read it.
const files = new Map();
function load(name) {
  if (!files.has(name)) {
    files.set(name, fetch(`${BASE}${name}.json`).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }));
  }
  return files.get(name);
}
const RENDER = { promises: renderPromises, replay: renderReplay, beat: renderBeat, advising: renderAdvising, casefiles: renderCasefiles };

async function build(sec) {
  const name = sec.dataset.ew;
  try {
    const data = await load(name);
    if (data.standin) standinBanner();
    RENDER[name](sec, data);
  } catch (err) {
    sec.replaceChildren(h('p', { class: 'demo__noscript', text: `This piece couldn't load (${err.message}).` }));
  }
}

if (host) {
  host.prepend(h('nav', { class: 'ew-nav', 'aria-label': 'On this page' },
    [['plan', 'The plan'], ['replay', 'Replay a term'], ['beat', 'Beat the model'], ['advising', 'You run advising'], ['casefiles', 'Case files']]
      .map(([id, label]) => h('a', { href: `#${id}`, text: label }))));
  const parts = [...host.querySelectorAll('[data-ew]')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { io.unobserve(en.target); build(en.target); }
    }, { rootMargin: '400px 0px' });
    parts.forEach((p) => io.observe(p));
  } else parts.forEach(build);
}
