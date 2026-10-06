// SQL playground on the retention project page: a real SQLite database
// (sql.js, compiled to WebAssembly) running in the visitor's browser, filled
// with synthetic students shaped like the real pipeline's tables. No server,
// no real records. The chart redraws from whatever the query returns.

const root = document.querySelector('[data-demo="sql"]');

// ── Synthetic data ──────────────────────────────────────────────────
// Seeded, so every visitor sees the same numbers and the preset queries'
// descriptions stay true.
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLLEGES = [
  ['Arts & Sciences', 0.30, -0.01],
  ['Business', 0.22, 0.0],
  ['Education', 0.14, 0.02],
  ['Nursing', 0.20, 0.04],
  ['Engineering', 0.14, -0.03],
];
const FIRST_COHORT = 2015;
const LAST_COHORT = 2024;
const AS_OF = 2025; // data as of fall 2025

function buildData() {
  const r = rng(20250901);
  const cohorts = [];
  const enrollments = [];
  const completions = [];
  let id = 100000;
  for (let year = FIRST_COHORT; year <= LAST_COHORT; year++) {
    const size = 380 + Math.floor(r() * 90);
    for (let i = 0; i < size; i++) {
      const sid = ++id;
      let pick = r();
      const college = COLLEGES.find(([, share]) => (pick -= share) < 0) || COLLEGES[0];
      const firstGen = r() < 0.38 ? 1 : 0;
      const pell = r() < (firstGen ? 0.62 : 0.34) ? 1 : 0;
      const g = r();
      const band = g < 0.28 ? 'A' : g < 0.74 ? 'B' : 'C';
      cohorts.push([sid, year, college[0], firstGen, pell, band]);

      const bandEffect = band === 'A' ? 0.12 : band === 'C' ? -0.13 : 0;
      const pRetain = 0.68 + (year - FIRST_COHORT) * 0.004 - firstGen * 0.07 - pell * 0.05 + bandEffect + college[2];
      enrollments.push([sid, year]);
      for (let k = 1; year + k <= AS_OF; k++) {
        const pContinue = k === 1 ? pRetain : 0.9 + bandEffect * 0.3;
        if (r() > pContinue) break;
        enrollments.push([sid, year + k]);
        // Finishing at the end of the 4th, 5th or 6th year enrolled.
        const pFinish = k === 3 ? 0.56 + bandEffect : k === 4 ? 0.52 : k >= 5 ? 0.5 : 0;
        if (pFinish && r() < pFinish) {
          if (year + k + 1 <= AS_OF) completions.push([sid, year + k + 1]);
          break;
        }
      }
    }
  }
  return { cohorts, enrollments, completions };
}

const SCHEMA = `
CREATE TABLE cohorts (
  student_id   INTEGER PRIMARY KEY,
  cohort_year  INTEGER,  -- fall they started as first-time freshmen
  college      TEXT,
  first_gen    INTEGER,  -- 1 = first in family at college
  pell         INTEGER,  -- 1 = received a Pell grant
  hs_gpa_band  TEXT      -- A, B or C
);
CREATE TABLE enrollments (student_id INTEGER, term INTEGER);   -- one row per fall enrolled
CREATE TABLE completions (student_id INTEGER, award_year INTEGER);`;

const PRESETS = [
  {
    label: 'Retention by cohort',
    note: 'Who came back for a second fall, for each entering class.',
    sql: `SELECT c.cohort_year,
       COUNT(*) AS students,
       ROUND(100.0 * COUNT(e.student_id) / COUNT(*), 1) AS retained_pct
FROM cohorts c
LEFT JOIN enrollments e
  ON e.student_id = c.student_id
 AND e.term = c.cohort_year + 1
GROUP BY c.cohort_year
ORDER BY c.cohort_year;`,
  },
  {
    label: 'The first-gen gap',
    note: 'Second-fall retention for first-generation students against everyone else.',
    sql: `SELECT c.cohort_year,
       ROUND(100.0 * AVG(CASE WHEN c.first_gen = 1
             THEN e.student_id IS NOT NULL END), 1) AS first_gen_pct,
       ROUND(100.0 * AVG(CASE WHEN c.first_gen = 0
             THEN e.student_id IS NOT NULL END), 1) AS continuing_gen_pct
FROM cohorts c
LEFT JOIN enrollments e
  ON e.student_id = c.student_id
 AND e.term = c.cohort_year + 1
GROUP BY c.cohort_year
ORDER BY c.cohort_year;`,
  },
  {
    label: 'Graduation by college',
    note: 'Four- and six-year graduation rates, for the classes that have had six years.',
    sql: `SELECT c.college,
       COUNT(*) AS students,
       ROUND(100.0 * SUM(g.award_year <= c.cohort_year + 4) / COUNT(*), 1) AS grad_4yr_pct,
       ROUND(100.0 * SUM(g.award_year <= c.cohort_year + 6) / COUNT(*), 1) AS grad_6yr_pct
FROM cohorts c
LEFT JOIN completions g ON g.student_id = c.student_id
WHERE c.cohort_year <= ${AS_OF - 6}
GROUP BY c.college
ORDER BY grad_6yr_pct DESC;`,
  },
  {
    label: 'Peek at the tables',
    note: 'The raw rows. Every student here is made up.',
    sql: `SELECT c.*,
       (SELECT COUNT(*) FROM enrollments e
         WHERE e.student_id = c.student_id) AS falls_enrolled,
       (SELECT award_year FROM completions g
         WHERE g.student_id = c.student_id) AS award_year
FROM cohorts c
ORDER BY c.student_id
LIMIT 12;`,
  },
];

// ── sql.js loading ──────────────────────────────────────────────────
let dbPromise = null;
function loadDb(base) {
  dbPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${base}vendor/sqljs/sql-wasm.js`;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load SQLite.'));
    document.head.append(s);
  }).then(() => window.initSqlJs({ locateFile: (f) => `${base}vendor/sqljs/${f}` }))
    .then((SQL) => {
      const db = new SQL.Database();
      db.run(SCHEMA);
      const { cohorts, enrollments, completions } = buildData();
      db.run('BEGIN');
      const insert = (sql, rows) => { const st = db.prepare(sql); for (const row of rows) st.run(row); st.free(); };
      insert('INSERT INTO cohorts VALUES (?, ?, ?, ?, ?, ?)', cohorts);
      insert('INSERT INTO enrollments VALUES (?, ?)', enrollments);
      insert('INSERT INTO completions VALUES (?, ?)', completions);
      db.run('COMMIT');
      return db;
    });
  return dbPromise;
}

// ── Chart ───────────────────────────────────────────────────────────
// Which columns to draw: the _pct ones when there are any (so a count
// column never shares an axis with a percentage), otherwise every numeric
// column. At most three series; colours follow the column, not its rank.
function chartSpec(columns, rows) {
  if (rows.length < 2 || columns.length < 2) return null;
  const numeric = columns.map((_, j) => rows.every((r) => r[j] === null || typeof r[j] === 'number'));
  let series = columns.map((c, j) => j).filter((j) => j > 0 && numeric[j]);
  const pct = series.filter((j) => /_pct$/.test(columns[j]));
  if (pct.length) series = pct;
  series = series.slice(0, 3);
  if (!series.length) return null;
  const xIsYear = numeric[0] && rows.every((r) => Number.isInteger(r[0]) && r[0] > 1900 && r[0] < 2100);
  return { series, kind: xIsYear ? 'line' : 'bar', isPct: pct.length > 0 };
}

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text !== undefined) n.textContent = text;
  return n;
};
const pretty = (col) => col.replace(/_pct$/, '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const fmt = (v, isPct) => (v === null ? '–' : isPct ? `${v}%` : String(v));

function drawChart(host, tip, columns, rows, spec) {
  host.replaceChildren();
  tip.hidden = true;
  if (!spec) { host.hidden = true; return; }
  host.hidden = false;
  // Drawn at the space it actually has, so text stays at its real size
  // instead of shrinking with a scaled-down drawing.
  const W = Math.max(300, host.clientWidth - 24);
  const values = rows.flatMap((r) => spec.series.map((j) => r[j])).filter((v) => v !== null);
  const maxV = spec.isPct ? 100 : Math.max(...values) * 1.1 || 1;
  const minV = spec.isPct && spec.kind === 'line' ? Math.max(0, Math.floor((Math.min(...values) - 5) / 10) * 10) : 0;
  const step = spec.isPct ? (maxV - minV > 60 ? 20 : 10) : (maxV - minV) / 4;

  // A title names what's drawn; the legend only appears when there's more
  // than one series to tell apart.
  const title = document.createElement('p');
  title.className = 'viz__title';
  title.textContent = `${spec.series.length === 1 ? pretty(columns[spec.series[0]]) : spec.series.map((j) => pretty(columns[j])).join(' and ')}${spec.isPct ? ' (%)' : ''} by ${pretty(columns[0]).toLowerCase()}`;
  const legend = document.createElement('div');
  legend.className = 'viz__legend';
  if (spec.series.length > 1) {
    spec.series.forEach((j, k) => {
      const item = document.createElement('span');
      item.innerHTML = `<i class="viz__key s${k + 1}${spec.kind === 'line' ? ' viz__key--line' : ''}"></i>`;
      item.append(pretty(columns[j]));
      legend.append(item);
    });
  }

  if (spec.kind === 'line') {
    const H = 260, L = 42, R = spec.series.length > 1 ? 150 : 76, T = 12, B = 28;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz', role: 'img', 'aria-label': `Line chart of ${spec.series.map((j) => pretty(columns[j])).join(' and ')} by ${columns[0]}` });
    const x = (i) => L + (i * (W - L - R)) / Math.max(rows.length - 1, 1);
    const y = (v) => T + (1 - (v - minV) / (maxV - minV)) * (H - T - B);
    for (let t = minV; t <= maxV + 0.001; t += step) {
      svg.append(el('line', { x1: L, x2: W - R, y1: y(t), y2: y(t), class: 'viz__grid' }));
      svg.append(el('text', { x: L - 8, y: y(t) + 4, class: 'viz__tick', 'text-anchor': 'end' }, spec.isPct ? `${Math.round(t)}%` : String(Math.round(t))));
    }
    const every = (W - L - R) / rows.length < 38 ? 2 : 1;
    rows.forEach((r, i) => {
      if (i % every === 0) svg.append(el('text', { x: x(i), y: H - 8, class: 'viz__tick', 'text-anchor': 'middle' }, String(r[0])));
    });
    const last = rows.length - 1;
    const endLabels = [];
    spec.series.forEach((j, k) => {
      const pts = rows.map((r, i) => (r[j] === null ? null : [x(i), y(r[j])])).filter(Boolean);
      svg.append(el('path', { d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(''), class: `viz__line s${k + 1}` }));
      if (rows[last][j] !== null) {
        svg.append(el('circle', { cx: x(last), cy: y(rows[last][j]), r: 4, class: `viz__dot s${k + 1}` }));
        // Direct label at the line's end: the value, plus the series name
        // when there's more than one line to tell apart.
        endLabels.push({
          y: y(rows[last][j]) + 4,
          text: spec.series.length > 1 ? `${pretty(columns[j])} ${fmt(rows[last][j], spec.isPct)}` : fmt(rows[last][j], spec.isPct),
        });
      }
    });
    // Lines that end close together would print their labels on top of
    // each other; push them apart to at least one line of text.
    endLabels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < endLabels.length; i++) {
      if (endLabels[i].y - endLabels[i - 1].y < 15) endLabels[i].y = endLabels[i - 1].y + 15;
    }
    for (const lbl of endLabels) svg.append(el('text', { x: x(last) + 10, y: lbl.y, class: 'viz__direct' }, lbl.text));
    // Crosshair + tooltip.
    const cross = el('line', { y1: T, y2: H - B, class: 'viz__cross', opacity: 0 });
    svg.append(cross);
    const hit = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' });
    svg.append(hit);
    hit.addEventListener('pointermove', (e) => {
      const box = svg.getBoundingClientRect();
      const px = ((e.clientX - box.left) / box.width) * W;
      const i = Math.max(0, Math.min(rows.length - 1, Math.round(((px - L) / (W - L - R)) * (rows.length - 1))));
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', 1);
      showTip(tip, host, e, `<b>${rows[i][0]}</b>` + spec.series.map((j, k) => `<span><i class="viz__key s${k + 1}"></i>${pretty(columns[j])} <b>${fmt(rows[i][j], spec.isPct)}</b></span>`).join(''));
    });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('opacity', 0); tip.hidden = true; });
    host.append(title, legend, svg);
  } else {
    // Horizontal bars, grouped when there are several series.
    const band = 18 * spec.series.length + 14;
    const L = Math.min(132, W * 0.34), R = 52, T = 8;
    const H = T + rows.length * band + 8;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz', role: 'img', 'aria-label': `Bar chart of ${spec.series.map((j) => pretty(columns[j])).join(' and ')} by ${columns[0]}` });
    const w = (v) => ((v ?? 0) / maxV) * (W - L - R);
    rows.forEach((r, i) => {
      const top = T + i * band;
      svg.append(el('text', { x: L - 10, y: top + (band - 14) / 2 + 5, class: 'viz__cat', 'text-anchor': 'end' }, String(r[0]).slice(0, 18)));
      spec.series.forEach((j, k) => {
        const by = top + k * 18 + 2; // 2px surface gap between bars
        const bar = el('rect', { x: L, y: by, width: Math.max(w(r[j]), 1), height: 14, rx: 4, class: `viz__bar s${k + 1}` });
        svg.append(bar);
        svg.append(el('text', { x: L + w(r[j]) + 6, y: by + 11, class: 'viz__val' }, fmt(r[j], spec.isPct)));
        const hit = el('rect', { x: L, y: by - 2, width: W - L - R, height: 18, fill: 'transparent' });
        hit.addEventListener('pointermove', (e) => showTip(tip, host, e, `<b>${r[0]}</b><span><i class="viz__key s${k + 1}"></i>${pretty(columns[j])} <b>${fmt(r[j], spec.isPct)}</b></span>`));
        hit.addEventListener('pointerleave', () => { tip.hidden = true; });
        svg.append(hit);
      });
    });
    host.append(title, legend, svg);
  }
  host.append(tip);
}

function showTip(tip, host, e, html) {
  tip.innerHTML = html;
  tip.hidden = false;
  const box = host.getBoundingClientRect();
  const left = Math.min(e.clientX - box.left + 14, box.width - tip.offsetWidth - 4);
  tip.style.left = `${Math.max(left, 4)}px`;
  tip.style.top = `${e.clientY - box.top + 14}px`;
}

// ── UI ──────────────────────────────────────────────────────────────
function init(host) {
  const base = host.dataset.base || './';
  host.innerHTML = `
    <div class="demo__head">
      <div>
        <p class="demo__eyebrow">TRY IT · A REAL DATABASE IN YOUR BROWSER</p>
        <h2 class="demo__title">Query the cohort data yourself</h2>
        <p class="demo__lede">A SQLite database with the same shape as the real pipeline (cohorts, fall enrollments, completions), filled with synthetic students. Pick a question or write your own SQL.</p>
      </div>
    </div>
    <div class="sqlpad__presets" role="tablist" aria-label="Example questions">
      ${PRESETS.map((p, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-preset="${i}">${p.label}</button>`).join('')}
    </div>
    <p class="sqlpad__note" data-note>${PRESETS[0].note}</p>
    <div class="sqlpad__grid">
      <div class="sqlpad__editor">
        <label class="sr-only" for="sql-input">SQL query</label>
        <textarea id="sql-input" spellcheck="false" autocapitalize="off" autocomplete="off">${PRESETS[0].sql}</textarea>
        <div class="sqlpad__bar">
          <button type="button" class="demo__go" data-run>Run query</button>
          <span class="sqlpad__hint"><kbd data-mod>Ctrl</kbd> <kbd>Enter</kbd></span>
          <span class="sqlpad__meta" data-meta role="status" aria-live="polite"></span>
        </div>
        <details class="sqlpad__schema">
          <summary>Tables and columns</summary>
          <pre>${SCHEMA.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>
        </details>
      </div>
      <div class="sqlpad__out">
        <div class="viz-host" data-chart hidden></div>
        <div class="sqlpad__table" data-table tabindex="0" role="region" aria-label="Query results"></div>
      </div>
    </div>`;

  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) host.querySelector('[data-mod]').textContent = '⌘';
  const input = host.querySelector('textarea');
  const meta = host.querySelector('[data-meta]');
  const chartHost = host.querySelector('[data-chart]');
  const tableHost = host.querySelector('[data-table]');
  const note = host.querySelector('[data-note]');
  const tip = document.createElement('div');
  tip.className = 'viz__tip';
  tip.hidden = true;

  let lastDraw = null;
  new ResizeObserver(() => { if (lastDraw) drawChart(chartHost, tip, ...lastDraw); }).observe(chartHost.parentElement);

  async function run() {
    meta.textContent = 'Loading SQLite…';
    meta.classList.remove('is-error');
    let db;
    try { db = await loadDb(base); } catch (err) { meta.textContent = err.message; meta.classList.add('is-error'); return; }
    const started = performance.now();
    let result;
    try {
      result = db.exec(input.value);
    } catch (err) {
      meta.textContent = String(err.message || err);
      meta.classList.add('is-error');
      return;
    }
    const ms = (performance.now() - started).toFixed(1);
    const last = result[result.length - 1];
    if (!last) { meta.textContent = `Done in ${ms} ms, no rows returned.`; tableHost.replaceChildren(); lastDraw = null; drawChart(chartHost, tip, [], [], null); return; }
    const { columns, values } = last;
    meta.textContent = `${values.length} ${values.length === 1 ? 'row' : 'rows'} · ${ms} ms`;
    lastDraw = [columns, values, chartSpec(columns, values)];
    drawChart(chartHost, tip, ...lastDraw);
    const shown = values.slice(0, 50);
    tableHost.innerHTML = `<table><thead><tr>${columns.map((c) => `<th scope="col">${c.replace(/</g, '&lt;')}</th>`).join('')}</tr></thead><tbody>${shown.map((r) => `<tr>${r.map((v) => `<td class="${typeof v === 'number' ? 'num' : ''}">${v === null ? '<span class="null">NULL</span>' : String(v).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('')}</tbody></table>${values.length > shown.length ? `<p class="sqlpad__more">Showing the first ${shown.length} of ${values.length} rows.</p>` : ''}`;
  }

  host.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    const p = PRESETS[Number(b.dataset.preset)];
    host.querySelectorAll('[data-preset]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    input.value = p.sql;
    note.textContent = p.note;
    run();
  }));
  host.querySelector('[data-run]').addEventListener('click', run);
  input.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
  });

  // Load and run the first question once the playground is near the screen,
  // so the 0.6 MB engine is only fetched by visitors who scroll to it.
  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) { io.disconnect(); run(); }
  }, { rootMargin: '300px' });
  io.observe(host);
}

if (root) init(root);
