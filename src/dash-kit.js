// Shared drawing kit for the dashboard demos: number formats, axis steps, SVG helpers, and the
// redesign's pieces (header, filter bar, tiles) in the brand's tokens (brand/BRAND.md in the dashboards repo).

export const W = 1400, H = 900;

// ── Formatting ──────────────────────────────────────────────────────
export const fmt = (n) => (n == null ? '<10' : n.toLocaleString('en-US'));
export const pct = (x) => (x == null || !isFinite(x) ? '—' : `${Math.round(x * 100)}%`);
export const signedPct = (x) => (x == null || !isFinite(x) ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(Math.round(x * 100))}%`);
export const signedPts = (x) => (x == null || !isFinite(x) ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(1)}`);
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const ratio = (a, b) => (a == null || b == null || !b ? null : a / b);
export const change = (a, b) => (a == null || b == null || !b ? null : a / b - 1);
export const short = (n) => (n >= 1000 ? `${+(n / 1000).toFixed(2)}K` : String(Math.round(n)));

// Round axis steps (1, 2, 2.5 or 5 × a power of ten) and the top of the axis.
export function ticks(max, n = 5) {
  const raw = Math.max(max, 1) / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * p >= raw) * p;
  return { top: Math.ceil(Math.max(max, 1) / step) * step, step };
}
export function niceMax(v) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

// SVG helpers. `tip` puts hover text on a mark.
export const T = (x, y, s, a = {}) => `<text x="${x}" y="${y}"${a.anchor ? ` text-anchor="${a.anchor}"` : ''}${a.size ? ` font-size="${a.size}"` : ''}${a.weight ? ` font-weight="${a.weight}"` : ''}${a.fill ? ` fill="${a.fill}"` : ''}${a.rotate ? ` transform="rotate(${a.rotate} ${x} ${y})"` : ''}${a.cls ? ` class="${a.cls}"` : ''}>${esc(s)}</text>`;
export const R = (x, y, w, h, fill, a = {}) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" fill="${fill}"${a.stroke ? ` stroke="${a.stroke}" stroke-width="${a.sw || 1}"` : ''}${a.rx ? ` rx="${a.rx}"` : ''}${a.tip ? ` data-tip="${esc(a.tip)}"` : ''}${a.tour ? ` data-tour="${a.tour}"` : ''}/>`;
export const L = (x1, y1, x2, y2, stroke, sw = 1) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"/>`;
export const path = (pts, stroke, sw, a = {}) => {
  const segs = [];
  let cur = [];
  for (const p of pts) { if (p) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } }
  if (cur.length) segs.push(cur);
  return segs.map((s) => `<polyline points="${s.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${a.tip ? ` data-tip="${esc(a.tip)}"` : ''}${a.tour ? ` data-tour="${a.tour}"` : ''} class="hit-line"/>`).join('');
};
export const dot = (x, y, r, fill, a = {}) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${fill}"${a.stroke ? ` stroke="${a.stroke}" stroke-width="${a.sw || 2}"` : ''}${a.tip ? ` data-tip="${esc(a.tip)}"` : ''}${a.tour ? ` data-tour="${a.tour}"` : ''}/>`;

// Tableau's default look, and the redesign's tokens (brand/BRAND.md in the dashboards repo).
export const TAB10 = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'];
export const RED = '#a6192e', GRAY = '#78868c', INK = '#252b2e', MUTED = '#5d686d', BAR = '#f4f5f6', FRAME = '#a9b3b8';
export const RACE_AFTER = { 'White': '#3d4549', 'Black or African American': '#c08a2e', 'Hispanic or Latino': '#4f8c7c', 'Two or More Races': '#8a6a8e', 'American Indian or Alaska Native': '#6e1020', 'Asian': '#4f7c99', 'Race/Ethnicity Unknown': '#c9cfd1', 'Other': '#9aa5aa' };
export const RACE_SHORT = { 'Black or African American': 'Black', 'Hispanic or Latino': 'Hispanic', 'Two or More Races': 'Two or more', 'American Indian or Alaska Native': 'American Indian', 'Race/Ethnicity Unknown': 'Unknown' };
export const FONT = "font-family=\"'Tableau Book','Tableau',Arial,Helvetica,sans-serif\"";

// ── Shared pieces of the redesign ───────────────────────────────────
export function header(title, buttons, active, base = '/') {
  const logo = `${base}img/nicholls-n.webp`;
  let s = R(0, 0, W, 83, RED);
  s += R(8, 6, 166, 71, '#fff') + `<image href="${logo}" x="21" y="9" width="140" height="65" preserveAspectRatio="xMidYMid meet"/>`;
  s += T(196, 57, title, { size: 40, weight: 700, fill: '#fff' });
  let x = W - 12;
  const widths = buttons.map((b) => Math.max(130, b.length * 15 + 44));
  const xs = [];
  for (let i = buttons.length - 1; i >= 0; i--) { x -= widths[i]; xs[i] = x; }
  buttons.forEach((b, i) => {
    const on = i === active;
    if (on) s += R(xs[i] + 8, 12, widths[i] - 16, 59, '#fff');
    s += T(xs[i] + widths[i] / 2, 51, b, { anchor: 'middle', size: 25, weight: on ? 700 : 400, fill: on ? RED : '#f3d2d7' });
  });
  return s;
}
export function filterBar(cards, y = 83, h = 80) {
  let s = R(0, y, W, h, '#fff');
  cards.forEach(([title, value], i) => {
    const x = 7 + i * 250;
    s += R(x, y + 7, 236, h - 14, BAR);
    s += T(x + 8, y + 31, title, { size: 18, fill: INK });
    s += R(x + 8, y + 41, 220, 25, '#fff', { stroke: '#c9cfd1' });
    s += T(x + 14, y + 59, value, { size: 14, fill: MUTED });
    s += `<path d="M${x + 214} ${y + 51}l5 6 5-6" fill="none" stroke="${MUTED}" stroke-width="1.6"/>`;
  });
  return s;
}
export const tile = (x, y, w, h, title, fill = '#fff') => R(x, y, w, h, fill, { stroke: FRAME, sw: 2 }) + (title ? T(x + 14, y + 30, title, { size: 19, weight: 700, fill: INK }) : '');
export const footer = () => T(8, 892, 'Nicholls State University  ·  Office of Institutional Research', { size: 13, fill: MUTED });
