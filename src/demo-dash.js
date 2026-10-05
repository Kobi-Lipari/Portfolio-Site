// Before / after: two Nicholls State dashboards drawn twice from the same published numbers,
// once as they were and once as redesigned, with a seam to compare them and a guided tour.
// Data: small chart-level aggregates in /data/dashboards/*.json (counts under 10 are null).

import {
  BAR, FONT, FRAME, GRAY, H, INK, L, MUTED, R, RACE_AFTER, RACE_SHORT, RED, T, TAB10, W, change, dot, esc, filterBar, fmt, footer, niceMax, path, pct, ratio, short, signedPct, signedPts, ticks, tile,
  header as kitHeader,
} from './dash-kit.js';

const root = document.querySelector('[data-demo="dash"]');
const BASE = root.dataset.base || '/';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// On the homepage the demo is the hero: Admissions only, no tabs or tour, one seam sweep.
const HERO = root.dataset.mode === 'hero';

const header = (title, buttons, active) => kitHeader(title, buttons, active, BASE);

// Default-Tableau pieces of the originals.
function rawFilter(x, y, w, title, value, list) {
  let s = T(x, y + 14, title, { size: 13, weight: 700, fill: '#333' });
  if (list) {
    list.forEach((v, i) => {
      const yy = y + 26 + i * 20;
      s += R(x, yy, 12, 12, '#fff', { stroke: '#888' }) + `<path d="M${x + 2} ${yy + 6}l3 3 5-6" fill="none" stroke="#333" stroke-width="1.4"/>`;
      s += T(x + 18, yy + 11, v, { size: 12, fill: '#333' });
    });
  } else {
    s += R(x, y + 22, w, 22, '#fff', { stroke: '#bbb' }) + T(x + 6, y + 38, value, { size: 12, fill: '#333' });
    s += `<path d="M${x + w - 14} ${y + 30}l4 5 4-5" fill="none" stroke="#555" stroke-width="1.4"/>`;
  }
  return s;
}
const plainTitle = (x, y, s, size = 15) => T(x, y, s, { size, fill: '#333' });

// ── Admissions ──────────────────────────────────────────────────────
function admissionsModel(D, sel) {
  const i = D.falls.findIndex((f) => f.code === sel.fall);
  const prev = i > 0 ? D.falls[i - 1].code : null;
  const c = D.counts[sel.group];
  const cur = c[sel.fall], before = prev ? c[prev] : [null, null, null];
  return {
    fall: D.falls[i].label, prevFall: prev ? D.falls[i - 1].label : '', fallCode: sel.fall, group: D.groups.find((g) => g.key === sel.group).label,
    groupKey: sel.group, prevCode: prev, nextCode: i < D.falls.length - 1 ? D.falls[i + 1].code : null,
    prevName: `Fall ${String(sel.fall - 100).slice(0, 4)}`, filtersOpen: !!sel.filtersOpen,
    cur, before,
    acc: ratio(cur[1], cur[0]), yld: ratio(cur[2], cur[1]),
    accPrev: ratio(before[1], before[0]), yldPrev: ratio(before[2], before[1]),
  };
}

// The redesign as the owner's v28 workbook lays it out (1400 × 900), read from the .twb: zone positions,
// the label runs' own font sizes (they override the sheets' cell styles), number formats and colors.
// Tableau point sizes are drawn at 4/3 px. Text objects are top-aligned, as in Tableau.
const PT = (n) => Math.round((n * 4) / 3);
const STEP_OFF = '#d3d8da';
const FUNNEL_FILL = ['#b9c2c6', '#d9848f', RED];
const VS_FILL = { before: ['#dde2e4', '#f2d3d8', '#d26f7e'], sel: ['#b9c2c6', '#e3a3ac', RED] };
const TYPE_NAME = { N: 'New FTF', T: 'Transfer', R: 'Readmit', I: 'International', A: 'Adult', Other: 'Other', grad: 'Graduate' };
const NICHOLLS_IR = 'https://public.tableau.com/app/profile/nichollsir';

// Tableau's custom formats: "*+0%;-0%;0%" and "*+#,##0.0;-#,##0.0;0.0" (a plain hyphen, blank when null).
const tPct = (x) => (x == null || !isFinite(x) ? '' : `${x > 0 ? '+' : x < 0 ? '-' : ''}${Math.round(Math.abs(x) * 100)}%`);
const tPts = (x) => (x == null || !isFinite(x) ? '' : x === 0 ? '0.0' : `${x > 0 ? '+' : '-'}${Math.abs(x).toFixed(1)}`);

function admHeader(title, buttons, active) {
  let s = R(0, 0, W, 84, RED);
  s += R(8, 8, 123, 68, '#fff') + `<image href="${BASE}img/nicholls-n.webp" x="12" y="12" width="115" height="60" preserveAspectRatio="xMidYMid meet"/>`;
  s += T(151, 53, title, { size: PT(32), weight: 700, fill: '#fff' });
  [[699, 138], [861, 157], [1042, 119], [1185, 191]].forEach(([x, w], i) => {
    const on = i === active;
    s += R(x, 12, w, 60, on ? '#fff' : RED);
    s += T(x + w / 2, 51, buttons[i], { anchor: 'middle', size: PT(20), weight: on ? 700 : 400, fill: on ? RED : '#fff' });
  });
  return s;
}

function filterSummary(m) {
  const type = m.groupKey === 'all' || m.groupKey === 'ug' ? 'All student types' : TYPE_NAME[m.groupKey] || m.group;
  const level = m.groupKey === 'ug' ? 'Undergraduate' : m.groupKey === 'grad' ? 'Graduate' : 'All levels';
  return [type, level, 'All months', 'All departments'].join('   ·   ');
}

function filterPanel(m) {
  // Hidden until the Filters button is pressed, as in the workbook; its title row shows with it.
  let s = R(870, 131, 518, 302, '#fff', { stroke: FRAME });
  s += `<text x="883" y="161" font-size="${PT(14)}" font-weight="700" fill="${INK}">Filters<tspan font-size="${PT(11)}" font-weight="400" fill="${MUTED}">   These apply to every page</tspan></text>`;
  const card = (x, y, title, value) => {
    s += T(x, y + 18, title, { size: PT(14), fill: INK });
    s += R(x, y + 26, 236, 34, '#fff', { stroke: '#c9cfd1' }) + T(x + 8, y + 50, value, { size: PT(16), fill: INK });
    s += `<path d="M${x + 218} ${y + 40}l5 6 5-6" fill="none" stroke="${MUTED}" stroke-width="1.6"/>`;
  };
  const type = m.groupKey === 'all' || m.groupKey === 'ug' ? '(All)' : TYPE_NAME[m.groupKey] || m.group;
  const level = m.groupKey === 'ug' ? 'Undergraduate' : m.groupKey === 'grad' ? 'Graduate' : '(All)';
  card(886, 191, 'Fall term', m.fall);
  card(886, 271, 'Student type', type); card(1136, 271, 'Level', level);
  card(886, 351, 'Month applied', '(All)'); card(1136, 351, 'Department', '(All)');
  return s;
}

// Tableau stacks a bar's segments in the color field's sort order; the owner's view shows the funnel
// with Applied on top, so the stack is built from Enrolled (bottom) up to Applied (top).
function stackFunnel(m, { cx, yT, yB, maxW, fills, inks, labelPt, underline, tour }) {
  let s = '';
  const app = m.cur[0] || 0, tot = m.cur.reduce((a, v) => a + (v || 0), 0);
  const top = ticks(tot || 1, 6).top;
  const sy = (v) => yB - ((yB - yT) * v) / top;
  const size = labelPt, lh = Math.round(size * 1.25);
  let acc = 0;
  [2, 1, 0].forEach((k) => {
    const st = ['Applied', 'Accepted', 'Enrolled'][k];
    const v = m.cur[k] || 0, f = app ? v / app : 0, w = Math.max(maxW * f, 24);
    const ya = sy(acc + v), yb = sy(acc);
    const ofAcc = k && m.cur[1] ? `${pct(v / m.cur[1])} of Accepted\n` : '';
    s += R(cx - w / 2, ya, w, yb - ya, fills[k], { tip: `${st}\n${pct(f)} of Applied\n${ofAcc}Total: ${fmt(m.cur[k])}`, tour: `${tour}-${k}` });
    const ink = inks[k], mid = (ya + yb) / 2;
    s += `<text x="${cx}" y="${mid - lh + size * 0.35}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${ink}"${underline ? ' text-decoration="underline"' : ''}>${st}</text>`;
    s += `<text x="${cx}" y="${mid + size * 0.35}" text-anchor="middle" font-size="${size}" fill="${ink}"><tspan font-weight="700">${pct(f)}</tspan> of Applied</text>`;
    s += `<text x="${cx}" y="${mid + lh + size * 0.35}" text-anchor="middle" font-size="${size}" fill="${ink}">Total: <tspan font-weight="700">${fmt(m.cur[k])}</tspan></text>`;
    acc += v;
  });
  return s;
}

function admissionsAfter(m) {
  let s = R(0, 0, W, H, '#fff');
  s += admHeader('Admissions Funnel', ['Funnel', 'By Type', 'Trend', 'Departments'], 0);

  // Fall stepper (three equal columns): ◀ Fall 2026 ▶; an arrow greys out at the first or last fall.
  const canPrev = !!m.prevCode, canNext = !!m.nextCode;
  [[53.5, '◀', canPrev ? RED : STEP_OFF, canPrev ? 'prev' : ''], [156.5, m.fall, INK, ''], [259.5, '▶', canNext ? RED : STEP_OFF, canNext ? 'next' : '']].forEach(([x, t, fill, act]) => {
    if (act) s += `<rect x="${x - 51}" y="90" width="102" height="37" fill="transparent" data-act="${act}" class="dash-act"><title>${act === 'prev' ? 'Previous fall' : 'Next fall'}</title></rect>`;
    s += T(x, 116, t, { anchor: 'middle', size: PT(16), weight: 700, fill });
  });
  s += T(321, 114, filterSummary(m), { size: PT(12), fill: '#555555' });
  s += R(1258, 90, 130, 39, m.filtersOpen ? '#fff' : RED, { stroke: RED });
  s += T(1323, 116, m.filtersOpen ? 'Filters ▴' : 'Filters ▾', { anchor: 'middle', size: PT(14), weight: 700, fill: m.filtersOpen ? RED : '#fff' });
  s += `<rect x="1258" y="90" width="130" height="39" fill="transparent" data-act="filters" class="dash-act"><title>Show or hide the filters</title></rect>`;

  // Key figures: 16 pt headers, 14 pt row headers, 20 pt values; the change row is 20 pt bold black.
  s += tile(7, 136, 798, 186, '');
  const colX = (k, left) => left + ((795 - left) * (k + 0.5)) / 3;
  ['Applied', 'Accepted', 'Enrolled'].forEach((h, k) => { s += T(colX(k, 127), 178, h, { anchor: 'middle', size: PT(16), weight: 700, fill: INK }); });
  s += T(21, 230, m.fall, { size: PT(14), weight: 700, fill: INK }) + T(21, 289, `vs ${m.prevName}`, { size: PT(14), weight: 700, fill: INK });
  m.cur.forEach((v, k) => {
    s += T(colX(k, 127), 233, fmt(v), { anchor: 'middle', size: PT(20), weight: 700, fill: INK });
    s += T(colX(k, 133), 292, tPct(change(v, m.before[k])), { anchor: 'middle', size: PT(20), weight: 700, fill: '#000' });
  });
  [[819, 'Acceptance rate', m.acc, m.accPrev], [1113, 'Yield', m.yld, m.yldPrev]].forEach(([x, t, v, p]) => {
    s += tile(x, 136, 280, 186, '');
    s += T(x + 140, 178, t, { anchor: 'middle', size: PT(16), weight: 700, fill: INK });
    s += T(x + 140, 233, pct(v), { anchor: 'middle', size: PT(20), weight: 700, fill: INK });
    s += T(x + 140, 292, tPts(v != null && p != null ? (v - p) * 100 : null), { anchor: 'middle', size: PT(20), weight: 700, fill: '#000' });
  });

  // Funnel: one stacked bar sized by count, Applied on top; 12 pt labels.
  s += tile(7, 336, 686, 510, `Admissions funnel, ${m.fall}`);
  s += stackFunnel(m, { cx: 350, yT: 380, yB: 836, maxW: 460, fills: FUNNEL_FILL, inks: [INK, INK, '#fff'], labelPt: PT(12), tour: 'adm-funnel' });

  // This fall against the fall before: Status / Academic Period rows, six shades, 14 pt bold labels.
  s += tile(707, 336, 686, 510, `${m.fall} vs ${m.prevName}`);
  const rows = [];
  ['Applied', 'Accepted', 'Enrolled'].forEach((st, k) => {
    if (m.prevCode) rows.push({ st, k, lab: m.prevFall, v: m.before[k], fill: VS_FILL.before[k] });
    rows.push({ st, k, lab: m.fall, v: m.cur[k], fill: VS_FILL.sel[k] });
  });
  const x0 = 880, x1 = 1320, rT = 380, rB = 790, band = (rB - rT) / rows.length;
  const { top: mx, step } = ticks(Math.max(...rows.map((r) => r.v || 0), 1), 5);
  const sx = (v) => x0 + ((x1 - x0) * v) / mx;
  for (let t = 0; t <= mx + 1e-9; t += step) s += L(sx(t), rT, sx(t), rB, '#eceeef') + T(sx(t), rB + 20, short(Math.round(t)), { anchor: 'middle', size: PT(11), fill: INK });
  s += T((x0 + x1) / 2, rB + 42, 'Count', { anchor: 'middle', size: PT(11), fill: INK });
  const per = m.prevCode ? 2 : 1;
  rows.forEach((r, i) => {
    const y = rT + i * band, bh = Math.min(band * 0.62, 50);
    if (i % per === 0) {
      s += T(723, y + (band * per) / 2 + 5, r.st, { size: PT(11), weight: 700, fill: INK });
      if (i) s += L(717, y, 1383, y, '#d5dadd');
    }
    s += T(803, y + band / 2 + 5, r.lab, { size: PT(11), weight: 700, fill: INK });
    s += R(x0, y + (band - bh) / 2, sx(r.v || 0) - x0, bh, r.fill, { tip: `${r.st}, ${r.lab}\nCount: ${fmt(r.v)}` });
    s += T(sx(r.v || 0) + 6, y + band / 2 + 7, fmt(r.v), { size: PT(14), weight: 700, fill: INK });
  });
  s += L(x0, rT, x0, rB, '#c9cfd1');

  // Footer band (text top-aligned with 4 px padding, 15 px on the left) and the link to Nicholls IR on Tableau Public.
  s += R(0, 853, W, 47, RED);
  s += T(15, 873, 'Nicholls State University   ·   Office of Institutional Research', { size: PT(12), weight: 600, fill: '#fff' });
  s += R(1152, 859, 230, 35, '#fff', { stroke: '#fff' }) + T(1267, 879, 'More Nicholls Dashboards', { anchor: 'middle', size: PT(12), weight: 700, fill: RED });
  s += `<a href="${NICHOLLS_IR}" target="_blank" rel="noopener"><rect x="1152" y="859" width="230" height="35" fill="transparent" class="dash-act"><title>More Nicholls dashboards on Tableau Public (opens a new tab)</title></rect></a>`;

  if (m.filtersOpen) s += filterPanel(m);
  return s;
}

// The original Admissions Funnel page as its .twb lays it out: a 1000 × 800 dashboard (stretched to this
// frame; text scaled by 1.2), title over one stacked funnel in Nicholls red and gray with 14 pt labels and
// no axis, four filters down the right (Level, Academic Period, Month Applied, Student Pop) and the N
// monogram along the bottom. Tableau's default fonts are assumed where the file sets none.
const OX = (x) => x * 1.4, OY = (y) => y * 1.125, OPT = (pt) => Math.round(pt * (4 / 3) * 1.2);
const ORIG_FILL = ['#b7c2cc', '#c63b51', '#a1212f'];
const ORIG_POP = { N: 'New FTF', T: 'Transfer', R: 'Readmit', I: 'International', A: 'Adult', Other: 'Other', grad: 'Graduate ONLY' };

function origList(x, y, title, items, { radio = false, checked = () => true } = {}) {
  let s = T(x, y + OPT(9), title, { size: OPT(9), weight: 700, fill: '#333' });
  items.forEach((v, i) => {
    const yy = y + OPT(9) + 10 + i * 22, on = checked(v, i);
    if (radio) {
      s += `<circle cx="${x + 6}" cy="${yy + 7}" r="6" fill="#fff" stroke="#888"/>` + (on ? `<circle cx="${x + 6}" cy="${yy + 7}" r="3" fill="#333"/>` : '');
    } else {
      s += R(x, yy + 1, 12, 12, '#fff', { stroke: '#888' }) + (on ? `<path d="M${x + 2} ${yy + 7}l3 3 5-6" fill="none" stroke="#333" stroke-width="1.4"/>` : '');
    }
    s += T(x + 18, yy + 12, v, { size: OPT(9), fill: '#333' });
  });
  return s;
}

function admissionsBefore(m) {
  let s = R(0, 0, W, H, '#fff');
  // Dashboard title: "<Sheet Name>", then the instruction line in 12 pt.
  s += T(OX(12), OY(12) + OPT(18), 'Admissions Funnel', { size: OPT(18), weight: 600, fill: '#333' });
  s += T(OX(12), OY(64), 'Choose Undergraduate and/or Graduate Applicants and Academic Period.', { size: OPT(12), fill: '#333' });

  // Funnel sheet: title "<Level> Applicants in <Academic Period> Semester(s)", no axis.
  const level = m.groupKey === 'ug' ? 'Undergraduate' : m.groupKey === 'grad' ? 'Graduate' : 'All';
  s += T(OX(16), OY(79) + OPT(15), `${level} Applicants in ${m.fall} Semester(s)`, { size: OPT(15), weight: 600, fill: '#333' });
  s += stackFunnel(m, { cx: OX(431.5), yT: OY(112), yB: OY(624), maxW: 620, fills: ORIG_FILL, inks: ['#333', '#fff', '#fff'], labelPt: OPT(14), underline: true, tour: 'adm-before' });

  // The N monogram along the bottom (fit to the image zone, top-left).
  s += `<image href="${BASE}img/nicholls-n.webp" x="${OX(12)}" y="${OY(634)}" width="${OY(154) * (300 / 153)}" height="${OY(154)}" preserveAspectRatio="xMinYMin meet"/>`;

  // Filters down the right, in the original's order and modes.
  const fx = OX(859);
  s += origList(fx, OY(77), 'Level', ['(All)', 'Graduate', 'Undergraduate'], { radio: true, checked: (v) => v === (m.groupKey === 'ug' ? 'Undergraduate' : m.groupKey === 'grad' ? 'Graduate' : '(All)') });
  const falls = ['(All)', ...Array.from({ length: 12 }, (_, i) => `Fall ${2015 + i}`)];
  s += origList(fx, OY(170), 'Academic Period', falls, { checked: (v) => v === m.fall });
  s += origList(fx, OY(455), 'Month Applied', ['(All)', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']);
  const pop = ORIG_POP[m.groupKey] || '(All)';
  s += T(fx, OY(740) + OPT(9), 'Student Pop', { size: OPT(9), weight: 700, fill: '#333' });
  s += R(fx, OY(740) + OPT(9) + 8, OX(129), 26, '#fff', { stroke: '#bbb' }) + T(fx + 6, OY(740) + OPT(9) + 27, pop, { size: OPT(9), fill: '#333' });
  s += `<path d="M${fx + OX(129) - 16} ${OY(740) + OPT(9) + 18}l4 5 4-5" fill="none" stroke="#555" stroke-width="1.4"/>`;
  return s;
}

// ── First-Time Freshmen ─────────────────────────────────────────────
function ftfModel(D, sel) {
  const codes = D.falls.map((f) => f.code);
  const i = codes.indexOf(sel.fall);
  const prev = i > 0 ? codes[i - 1] : null;
  const g = (o, k) => (o && o[String(k)]) || [];
  return {
    D, codes, labels: D.falls.map((f) => f.label), i, fall: D.falls[i].label, fallCode: sel.fall,
    total: D.total[sel.fall], totalPrev: prev ? D.total[prev] : null,
    fg: g(D.firstGen, sel.fall), fgPrev: prev ? g(D.firstGen, prev) : [],
    gender: g(D.gender, sel.fall),
  };
}

function lineAxes(xL, xR, yT, yB, mx, step) {
  let s = '';
  for (let t = 0; t <= mx + 1e-9; t += step) {
    const y = yB - ((yB - yT) * t) / mx;
    s += L(xL, y, xR, y, '#eceeef') + T(xL - 8, y + 5, short(Math.round(t)), { anchor: 'end', size: 13, fill: INK });
  }
  return s;
}

function ftfAfter(m) {
  const { D, codes, labels } = m;
  let s = R(0, 0, W, H, '#fff');
  s += header('First-Time Freshmen', ['Overview', 'By Major'], 0);
  s += filterBar([['Academic Period', m.fall], ['Department', '(All)'], ['First Gen', '(All)'], ['Gender', '(All)'], ['Reported Race', '(All)']], 83, 70);

  // Key figures table
  s += tile(8, 162, 460, 320, 'Latest fall at a glance');
  const cx = [205, 310, 410];
  [['First-time', 'freshmen'], ['First', 'generation'], ['First-gen', 'share']].forEach(([a, b], k) => { s += T(cx[k], 228, a, { anchor: 'middle', size: 14, weight: 700, fill: INK }) + T(cx[k], 246, b, { anchor: 'middle', size: 14, weight: 700, fill: INK }); });
  s += L(18, 262, 458, 262, '#d5dadd');
  const share = ratio(m.fg[0], m.total), sharePrev = ratio(m.fgPrev[0], m.totalPrev);
  s += T(22, 318, m.fall, { size: 14, weight: 700, fill: INK });
  [fmt(m.total), fmt(m.fg[0]), pct(share)].forEach((v, k) => { s += T(cx[k], 322, v, { anchor: 'middle', size: 30, weight: 700, fill: INK }); });
  s += R(18, 360, 440, 70, BAR) + T(22, 401, 'vs last fall', { size: 14, weight: 700, fill: INK });
  [signedPct(change(m.total, m.totalPrev)), signedPct(change(m.fg[0], m.fgPrev[0])), signedPts(share != null && sharePrev != null ? (share - sharePrev) * 100 : null) + ' pts'].forEach((v, k) => { s += T(cx[k], 404, v, { anchor: 'middle', size: 24, weight: 700, fill: INK }); });

  // First-time freshmen by fall term
  s += tile(484, 162, 908, 320, 'First-time freshmen by fall term');
  const xL = 560, xR = 1360, yT = 210, yB = 390;
  const vals = codes.map((c) => D.total[c]);
  const { top: mx, step } = ticks(Math.max(...vals.map((v) => v || 0)) * 1.08, 4);
  const px = (k) => xL + ((xR - xL) * k) / (codes.length - 1);
  const py = (v) => yB - ((yB - yT) * v) / mx;
  s += lineAxes(xL, xR, yT, yB, mx, step);
  s += path(vals.map((v, k) => (v == null ? null : [px(k), py(v)])), GRAY, 4);
  vals.forEach((v, k) => {
    const on = k === m.i;
    s += dot(px(k), py(v || 0), on ? 7 : 4, on ? RED : GRAY, { tip: `${labels[k]}: ${fmt(v)} first-time freshmen`, tour: on ? 'ftf-total-sel' : '' });
    s += T(px(k), py(v || 0) - 12, fmt(v), { anchor: 'middle', size: 14, weight: on ? 700 : 400, fill: on ? RED : INK });
    s += T(px(k) + 5, 470, labels[k], { size: 13, fill: INK, rotate: -90 });
  });

  // First generation and gender, selected fall
  const bars = (y, title, rows) => {
    let b = tile(8, y, 460, 170, title);
    const top = Math.max(...rows.map((r) => r[1] || 0), 1);
    rows.forEach(([lab, v, fill], k) => {
      const by = y + 52 + k * 54;
      b += T(150, by + 30, lab, { anchor: 'end', size: 15, fill: INK });
      b += R(160, by + 6, (240 * (v || 0)) / top, 40, fill, { tip: `${lab}, ${m.fall}: ${fmt(v)} freshmen` });
      b += T(166 + (240 * (v || 0)) / top, by + 32, fmt(v), { size: 15, fill: INK });
    });
    return b;
  };
  s += bars(492, `First generation, ${m.fall.toLowerCase()}`, [['First Gen', m.fg[0], RED], ['Not First Gen', m.fg[1], GRAY]]);
  s += bars(672, `Gender, ${m.fall.toLowerCase()}`, [['Female', m.gender[0], TAB10[0]], ['Male', m.gender[1], TAB10[1]]]);

  // Race by fall term in three sections, each on its own scale.
  s += tile(484, 492, 760, 350, '');
  s += T(498, 522, 'Race by fall term', { size: 19, weight: 700, fill: INK }) + T(680, 522, 'Each group on its own scale: White, Black, other races', { size: 13, fill: MUTED });
  const rL = 590, rR = 1225;
  const rx = (k) => rL + ((rR - rL) * k) / (codes.length - 1);
  const sections = [['White', ['White'], 538, 70], ['Black', ['Black or African American'], 616, 70], ['Other races', D.races.filter((r) => r !== 'White' && r !== 'Black or African American'), 694, 92]];
  sections.forEach(([name, races, top, h]) => {
    const series = races.map((r) => codes.map((c) => D.race[c][D.races.indexOf(r)]));
    const hi = Math.max(...series.flat().map((v) => v || 0), 1);
    const lo = name === 'Other races' ? 0 : Math.min(...series.flat().filter((v) => v != null));
    const span = niceMax(hi - lo || 1);
    const base = name === 'Other races' ? 0 : Math.floor(lo / 100) * 100;
    const ry = (v) => top + h - 8 - ((h - 16) * (v - base)) / Math.max(span, hi - base);
    s += L(rL, top + h, rR, top + h, '#d5dadd');
    s += T(510, top + h / 2 + 5, name, { size: 13, weight: 700, fill: INK });
    [base, Math.round(base + Math.max(span, hi - base))].forEach((t) => { s += T(rL - 6, ry(t) + 4, short(t), { anchor: 'end', size: 11, fill: MUTED }); });
    races.forEach((r, j) => {
      const col = RACE_AFTER[r];
      s += path(series[j].map((v, k) => (v == null ? null : [rx(k), ry(v)])), col, 3, { tip: `${r}: line by fall term`, tour: name === 'Black' ? 'ftf-race-black' : '' });
      series[j].forEach((v, k) => { if (v != null) s += dot(rx(k), ry(v), k === m.i ? 5 : 2.5, col, { tip: `${r}, ${labels[k]}: ${fmt(v)} freshmen` }); });
    });
  });
  codes.forEach((c, k) => { s += T(rx(k) + 4, 836, labels[k].replace('Fall ', ''), { anchor: 'middle', size: 12, fill: INK }); });

  // Legend
  s += tile(1258, 492, 134, 350, '');
  s += T(1268, 516, 'Reported Race', { size: 14, fill: INK });
  D.races.forEach((r, k) => { s += R(1268, 530 + k * 24, 12, 12, RACE_AFTER[r]) + T(1286, 541 + k * 24, RACE_SHORT[r] || r, { size: 13, fill: INK }); });
  return s + footer();
}

function ftfBefore(m) {
  const { D, codes } = m;
  let s = R(0, 0, W, H, '#fff');
  s += T(16, 48, 'First Time Freshmen Totals', { size: 26, fill: '#333' });
  [['Academic Period', '(Multiple values)'], ['College', '(All)'], ['First Gen', '(All)'], ['Gender', '(All)'], ['Reported Race', '(All)']].forEach(([t, v], k) => {
    s += rawFilter(16 + k * 270, 64, 250, t, v);
  });
  const chart = (x, y, w, h, title, series, colors, legend) => {
    let c = plainTitle(x, y + 16, title);
    const xL = x + 56, xR = x + w - (legend ? 170 : 16), yT = y + 34, yB = y + h - 64;
    const { top: mx, step } = ticks(Math.max(...series.flat().map((v) => v || 0), 1), 4);
    const px = (k) => xL + ((xR - xL) * k) / (codes.length - 1);
    const py = (v) => yB - ((yB - yT) * v) / mx;
    for (let t = 0; t <= mx + 1e-9; t += step) c += L(xL, py(t), xR, py(t), '#e6e6e6') + T(xL - 6, py(t) + 4, short(Math.round(t)), { anchor: 'end', size: 11, fill: '#666' });
    c += T(x + 12, (yT + yB) / 2, 'Distinct count of ID', { size: 11, fill: '#666', rotate: -90, anchor: 'middle' });
    series.forEach((ser, j) => { c += path(ser.map((v, k) => (v == null ? null : [px(k), py(v)])), colors[j], 2, { tip: `${legend ? legend[j] : 'Total'}` }); });
    codes.forEach((cd, k) => { c += T(px(k) + 4, yB + 52, String(cd), { size: 11, fill: '#666', rotate: -90 }); });
    if (legend) {
      c += T(xR + 16, yT + 4, legend.title, { size: 12, weight: 700, fill: '#333' });
      legend.forEach((l, j) => { c += R(xR + 16, yT + 14 + j * 18, 10, 10, colors[j]) + T(xR + 32, yT + 23 + j * 18, l, { size: 11, fill: '#333' }); });
    }
    return c;
  };
  const fgSeries = [codes.map((c) => D.firstGen[c][0]), codes.map((c) => D.firstGen[c][1])];
  const fgLegend = ['First Gen', 'Not First Gen'];
  fgLegend.title = 'First Gen';
  s += chart(16, 130, 690, 330, 'Total FTF with First Gen', fgSeries, TAB10, fgLegend);
  const raceSeries = D.races.map((r, j) => codes.map((c) => D.race[c][j]));
  const raceLegend = D.races.slice();
  raceLegend.title = 'Reported Race';
  s += chart(16, 470, 690, 420, 'Reported Race', raceSeries, TAB10, raceLegend);

  // Number of FTF students by major, as a heat grid of squares.
  s += plainTitle(726, 146, 'Number of FTF Students by Major');
  const gx = 800, gy = 166, cw = (1380 - gx) / codes.length, ch = 52;
  const all = D.departments.flatMap((d, j) => codes.map((c) => D.department[c][j] || 0));
  const mx = Math.max(...all, 1);
  const blues = (v) => { const t = v / mx; const a = [222, 235, 247], b = [8, 69, 148]; return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`; };
  D.departments.forEach((d, j) => {
    s += T(gx - 8, gy + j * ch + ch / 2 + 5, d, { anchor: 'end', size: 12, fill: '#333' });
    codes.forEach((c, k) => {
      const v = D.department[c][j];
      const side = v ? Math.max(8, Math.sqrt(v / mx) * (Math.min(cw, ch) - 6)) : 0;
      s += R(gx + k * cw + (cw - side) / 2, gy + j * ch + (ch - side) / 2, side, side, blues(v || 0), { tip: `${d}, ${c}: ${fmt(v)}`, stroke: k === m.i ? '#333' : '', sw: 1.5 });
    });
  });
  codes.forEach((c, k) => { s += T(gx + k * cw + cw / 2 + 4, gy + D.departments.length * ch + 52, String(c), { size: 11, fill: '#666', rotate: -90 }); });
  return s;
}

// ── Component ───────────────────────────────────────────────────────
const DASHES = {
  admissions: { label: 'Admissions', file: 'admissions.json', model: admissionsModel, before: admissionsBefore, after: admissionsAfter,
    beforeNote: 'Before: the funnel on its own, labels only inside the shapes, four filter lists down the side and the logo along the bottom.',
    afterNote: 'After: step through falls with the arrows, the three counts and their change first, rates beside them, then the funnel and this fall against last; the filters wait behind one button.' },
  ftf: { label: 'First-Time Freshmen', file: 'ftf.json', model: ftfModel, before: ftfBefore, after: ftfAfter,
    beforeNote: 'Before: every race on one axis, so the smaller groups flatten against the bottom; term codes instead of names.',
    afterNote: 'After: the latest fall at a glance, then the trend; race split so each group is readable on its own scale.' },
};

const state = { dash: 'admissions', fall: null, group: 'all', split: 50, filtersOpen: false, data: {} };

root.innerHTML = `${HERO ? '' : `
  <div class="demo__head">
    <div>
      <p class="demo__eyebrow">BEFORE ⇄ AFTER · DATA AS PUBLISHED</p>
      <h2 class="demo__title">Same numbers, <i>redesigned.</i></h2>
      <p class="demo__lede">Two of the dashboards I redesigned for Nicholls State's Office of Institutional Research, rebuilt here from their published figures. Drag the seam to compare the original with the redesign; the filters drive both sides.</p>
    </div>
    <button type="button" class="demo__go" data-tour-toggle aria-pressed="false">Play the tour</button>
  </div>`}
  ${HERO ? '' : `<div class="dash-bar">
    <div class="dash-tabs" role="tablist" aria-label="Dashboard">
      ${Object.entries(DASHES).map(([k, d]) => `<button type="button" role="tab" data-dash="${k}" aria-selected="${k === state.dash}">${d.label}</button>`).join('')}
    </div>
    <label class="dash-field">Fall term <select data-fall></select></label>
    <label class="dash-field" data-group-wrap>Students <select data-group></select></label>
  </div>`}
  ${HERO ? `<div class="dash-frame">
  <div class="dash-chrome">
    <span class="dash-chrome__dots" aria-hidden="true"><i></i><i></i><i></i></span>
    <div class="dash-chrome__tabs" role="tablist" aria-label="Dashboard">
      ${Object.entries(DASHES).map(([k, d]) => `<button type="button" role="tab" data-dash="${k}" aria-selected="${k === state.dash}">${d.label}</button>`).join('')}
    </div>
    <span class="dash-live"><span class="dash-live__dot" aria-hidden="true"></span>LIVE</span>
  </div>` : ''}
  <div class="dash-stage" data-dash-stage>
    <svg class="dash-svg dash-svg--before" viewBox="0 0 ${W} ${H}" ${FONT} role="img" aria-label="Original dashboard"></svg>
    <svg class="dash-svg dash-svg--after" viewBox="0 0 ${W} ${H}" ${FONT} role="img" aria-label="Redesigned dashboard"></svg>
    <span class="dash-tag dash-tag--before">BEFORE · original</span>
    <span class="dash-tag dash-tag--after">AFTER · redesign</span>
    <div class="dash-seam" aria-hidden="true"></div>
    <div class="dash-handle" role="slider" tabindex="0" aria-label="Compare the original with the redesign" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15171C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l-6 6 6 6"/><path d="M15 6l6 6-6 6"/></svg>
    </div>
    <div class="dash-tip" hidden></div>
  </div>${HERO ? `
  </div>
  <div class="dash-under">
    <label class="dash-field">Fall term <select data-fall></select></label>
    <span data-group-wrap hidden><select data-group aria-label="Students"></select></span>` : ''}
  <div class="snaps dash-snaps" role="group" aria-label="Jump to a view">
    <button type="button" data-split="100" aria-pressed="false">Original</button>
    <button type="button" class="dash-snaps__half" data-split="50" aria-pressed="true">Half and half</button>
    <button type="button" data-split="0" aria-pressed="false">Redesign</button>
  </div>${HERO ? `
  </div>` : ''}
  <p class="dash-note" data-note${HERO ? ' hidden' : ''}></p>
  ${HERO ? `<p class="dash-credit">One of the dashboards I redesigned for Nicholls State's Office of Institutional Research, drawn from its published figures · <a href="${BASE}work/tableau-dashboards/">See the full before and after, and six more →</a></p>` : `<p class="dash-credit">Recreated from dashboards I redesigned for Nicholls State's Office of Institutional Research · data as published · counts under 10 show as &lt;10 · <a href="https://www.nicholls.edu/irep/dashboards/" target="_blank" rel="noopener">Open the originals ↗</a></p>`}
  <div class="dash-cursor" aria-hidden="true" hidden><svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l14 9-6 1.5 3.5 7-3 1.5-3.5-7L4 18z" fill="#15171C" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg></div>`;

const $ = (s) => root.querySelector(s);
const stage = $('[data-dash-stage]');
const svgBefore = $('.dash-svg--before'), svgAfter = $('.dash-svg--after');
const handle = $('.dash-handle'), tipEl = $('.dash-tip'), note = $('[data-note]');
const fallSel = $('[data-fall]'), groupSel = $('[data-group]'), groupWrap = $('[data-group-wrap]');

// Numbers in the view model ease from the old values to the new ones.
const lerp = (a, b, t) => {
  if (typeof b === 'number' && typeof a === 'number') return a + (b - a) * t;
  if (Array.isArray(b)) return b.map((v, i) => lerp(Array.isArray(a) ? a[i] : undefined, v, t));
  return b;
};
let shown = null, anim = 0;
function draw(model) {
  const d = DASHES[state.dash];
  svgBefore.innerHTML = d.before(model);
  svgAfter.innerHTML = d.after(model);
}
function render({ animate = true } = {}) {
  const d = DASHES[state.dash], D = state.data[state.dash];
  if (!D) return;
  const target = d.model(D, state);
  const from = shown && shown.__dash === state.dash ? shown : null;
  cancelAnimationFrame(anim);
  if (!from || !animate || reduceMotion) { shown = Object.assign(target, { __dash: state.dash }); draw(target); return; }
  const keys = ['cur', 'before', 'acc', 'yld', 'accPrev', 'yldPrev', 'total', 'totalPrev', 'fg', 'fgPrev', 'gender'];
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - t, 3);
    const mid = { ...target };
    for (const k of keys) if (k in target) mid[k] = lerp(from[k], target[k], e);
    for (const k of ['cur', 'before', 'fg', 'fgPrev', 'gender']) if (mid[k]) mid[k] = mid[k].map((v, i) => (target[k][i] == null ? null : Math.round(v)));
    if (typeof mid.total === 'number') mid.total = Math.round(mid.total);
    draw(mid);
    if (t < 1) anim = requestAnimationFrame(step); else shown = Object.assign(target, { __dash: state.dash });
  };
  anim = requestAnimationFrame(step);
}

function fillControls() {
  const D = state.data[state.dash];
  fallSel.innerHTML = D.falls.slice().reverse().map((f) => `<option value="${f.code}">${f.label}</option>`).join('');
  if (!D.falls.some((f) => f.code === state.fall)) state.fall = D.falls[D.falls.length - 1].code;
  fallSel.value = state.fall;
  groupWrap.hidden = HERO || state.dash !== 'admissions';
  if (D.groups) groupSel.innerHTML = D.groups.map((g) => `<option value="${g.key}">${g.label}</option>`).join('');
  groupSel.value = state.group;
  root.querySelectorAll('[data-dash]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.dash === state.dash)));
  updateNote();
}
function updateNote() {
  const d = DASHES[state.dash];
  note.textContent = state.split >= 60 ? d.beforeNote : state.split <= 40 ? d.afterNote : `${d.beforeNote.split(':')[0]} on the left, after on the right. Drag the seam.`;
}

function setSplit(v, { animate = false } = {}) {
  state.split = Math.max(0, Math.min(100, v));
  stage.classList.toggle('is-animating', animate && !reduceMotion);
  stage.style.setProperty('--split', state.split);
  stage.style.setProperty('--before-tag', state.split > 12 ? 1 : 0);
  stage.style.setProperty('--after-tag', state.split < 88 ? 1 : 0);
  handle.setAttribute('aria-valuenow', String(Math.round(state.split)));
  handle.setAttribute('aria-valuetext', state.split >= 100 ? 'All original' : state.split <= 0 ? 'All redesign' : `${Math.round(state.split)}% original`);
  root.querySelectorAll('[data-split]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.split) === Math.round(state.split))));
  updateNote();
}

async function load(key) {
  if (!state.data[key]) state.data[key] = await (await fetch(`${BASE}data/dashboards/${DASHES[key].file}`)).json();
}
async function switchTo(key) {
  state.dash = key;
  await load(key);
  shown = null;
  fillControls();
  render({ animate: false });
}

// Seam: drag the handle or the line; keyboard on the handle.
let dragging = false;
const fromPointer = (e) => { const r = stage.getBoundingClientRect(); setSplit(((e.clientX - r.left) / r.width) * 100); };
[handle, $('.dash-seam')].forEach((el) => el.addEventListener('pointerdown', (e) => { dragging = true; el.setPointerCapture(e.pointerId); fromPointer(e); }));
stage.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
['pointerup', 'pointercancel'].forEach((ev) => stage.addEventListener(ev, () => { dragging = false; }));
handle.addEventListener('keydown', (e) => {
  const steps = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 };
  if (e.key in steps) { e.preventDefault(); setSplit(state.split + steps[e.key]); }
  else if (e.key === 'Home') { e.preventDefault(); setSplit(0); }
  else if (e.key === 'End') { e.preventDefault(); setSplit(100); }
});
root.querySelectorAll('[data-split]').forEach((b) => b.addEventListener('click', () => setSplit(Number(b.dataset.split), { animate: true })));
root.querySelectorAll('[data-dash]').forEach((b) => b.addEventListener('click', () => switchTo(b.dataset.dash)));
fallSel.addEventListener('change', () => { state.fall = Number(fallSel.value); render(); });
groupSel.addEventListener('change', () => { state.group = groupSel.value; render(); });
// The redesign's own controls: the fall stepper arrows and the Filters button.
svgAfter.addEventListener('click', (e) => {
  const act = e.target.closest && e.target.closest('[data-act]');
  if (!act || state.dash !== 'admissions') return;
  const falls = state.data.admissions.falls.map((f) => f.code), i = falls.indexOf(state.fall);
  if (act.dataset.act === 'filters') { state.filtersOpen = !state.filtersOpen; render({ animate: false }); return; }
  const j = act.dataset.act === 'prev' ? i - 1 : i + 1;
  if (j < 0 || j >= falls.length) return;
  state.fall = falls[j]; fallSel.value = String(state.fall); render();
});

// Hover text for marks (whichever side of the seam is showing).
function showTip(text, clientX, clientY) {
  const r = stage.getBoundingClientRect();
  tipEl.textContent = '';
  text.split('\n').forEach((line, i) => { const s = document.createElement('span'); s.textContent = line; if (!i) s.className = 'dash-tip__head'; tipEl.append(s); });
  tipEl.hidden = false;
  const x = Math.min(clientX - r.left + 14, r.width - tipEl.offsetWidth - 6), y = clientY - r.top + 14;
  tipEl.style.left = `${Math.max(6, x)}px`;
  tipEl.style.top = `${y + tipEl.offsetHeight > r.height ? clientY - r.top - tipEl.offsetHeight - 10 : y}px`;
}
stage.addEventListener('pointermove', (e) => {
  if (dragging) return;
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (t) showTip(t.dataset.tip, e.clientX, e.clientY); else tipEl.hidden = true;
});
stage.addEventListener('pointerleave', () => { tipEl.hidden = true; });

// ── Tour: a scripted cursor that uses the real controls ─────────────
const cursor = $('.dash-cursor'), tourBtn = $('[data-tour-toggle]');
let touring = false, tourRun = 0;
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
function cursorTo(el, { dx = 0.5, dy = 0.5 } = {}) {
  const rr = root.getBoundingClientRect(), r = el.getBoundingClientRect();
  const x = r.left - rr.left + r.width * dx, y = r.top - rr.top + r.height * dy;
  cursor.style.transform = `translate(${x}px, ${y}px)`;
  return { x: r.left + r.width * dx, y: r.top + r.height * dy };
}
async function click() { cursor.classList.add('is-click'); await wait(220); cursor.classList.remove('is-click'); }
async function dragSeam(to, run, ms = 1400) {
  cursorTo(handle);
  await wait(500);
  const from = state.split, t0 = performance.now();
  stage.classList.remove('is-animating');
  while (run === tourRun) {
    const t = Math.min(1, (performance.now() - t0) / ms), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    setSplit(from + (to - from) * e);
    cursorTo(handle);
    if (t >= 1) break;
    await new Promise((res) => requestAnimationFrame(res));
  }
}
async function pick(select, value, run) {
  cursorTo(select); await wait(650); if (run !== tourRun) return;
  await click(); select.value = String(value); select.dispatchEvent(new Event('change')); await wait(900);
}
async function hover(selector, run) {
  const el = (svgAfter.querySelector(selector) || svgBefore.querySelector(selector));
  if (!el || run !== tourRun) return;
  const p = cursorTo(el, { dx: 0.5, dy: 0.45 });
  await wait(600);
  if (run === tourRun) showTip(el.dataset.tip, p.x, p.y);
  await wait(1800); tipEl.hidden = true;
}
async function tour() {
  const run = ++tourRun;
  const ok = () => run === tourRun;
  cursor.hidden = false;
  root.classList.add('is-touring');
  while (ok()) {
    if (state.dash !== 'admissions') { cursorTo(root.querySelector('[data-dash="admissions"]')); await wait(600); await click(); await switchTo('admissions'); }
    state.group = 'all'; groupSel.value = 'all';
    await dragSeam(96, run); if (!ok()) break; await wait(1600);
    await dragSeam(4, run, 1800); if (!ok()) break; await wait(1600);
    await dragSeam(30, run, 700); if (!ok()) break;
    const D = state.data.admissions, last = D.falls[D.falls.length - 1].code, prev = D.falls[D.falls.length - 2].code;
    await pick(fallSel, prev, run); if (!ok()) break;
    await pick(fallSel, last, run); if (!ok()) break;
    await hover('[data-tour="adm-funnel-2"]', run); if (!ok()) break;
    await pick(groupSel, 'N', run); if (!ok()) break;
    await pick(groupSel, 'all', run); if (!ok()) break;
    cursorTo(root.querySelector('[data-dash="ftf"]')); await wait(700); if (!ok()) break;
    await click(); await switchTo('ftf'); setSplit(30);
    await dragSeam(96, run, 1200); if (!ok()) break; await wait(1600);
    await dragSeam(4, run, 1600); if (!ok()) break; await wait(1400);
    await dragSeam(35, run, 600); if (!ok()) break;
    await hover('[data-tour="ftf-race-black"]', run); if (!ok()) break;
    await hover('[data-tour="ftf-total-sel"]', run); if (!ok()) break;
    await wait(800);
  }
}
function stopTour() {
  if (!touring) return;
  touring = false; tourRun++;
  cursor.hidden = true; tipEl.hidden = true;
  root.classList.remove('is-touring');
  tourBtn.textContent = 'Play the tour'; tourBtn.setAttribute('aria-pressed', 'false');
}
function startTour() {
  touring = true;
  tourBtn.textContent = 'Stop the tour'; tourBtn.setAttribute('aria-pressed', 'true');
  tour();
}
tourBtn?.addEventListener('click', () => (touring ? stopTour() : startTour()));
// Any real interaction hands control back to the visitor.
['pointerdown', 'keydown', 'wheel'].forEach((ev) => root.addEventListener(ev, (e) => {
  if (e.isTrusted && touring && !tourBtn.contains(e.target)) stopTour();
}, { passive: true }));

// Start: load Admissions; play the tour once it scrolls into view (unless reduced motion).
await switchTo('admissions');
setSplit(50);
if (HERO) {
  // The seam keeps sweeping while the demo is on screen, so it reads as live; any
  // interaction stops it for good. Reduced motion: no sweep.
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => root.addEventListener(ev, (e) => {
    if (e.isTrusted) { tourRun++; root.classList.add('is-touched'); }
  }, { passive: true }));
  let onScreen = false;
  new IntersectionObserver((entries) => { onScreen = entries.some((en) => en.isIntersecting); }, { threshold: 0.3 }).observe(stage);
  if (!reduceMotion) {
    const run = ++tourRun;
    await wait(900);
    sweep: while (run === tourRun) {
      for (const [to, ms, pause] of [[88, 1400, 1600], [12, 2000, 1600], [50, 1000, 2600]]) {
        while (!onScreen && run === tourRun) await wait(400);
        if (run !== tourRun) break sweep;
        await dragSeam(to, run, ms);
        await wait(pause);
      }
    }
  }
} else if (!reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) { io.disconnect(); if (!touring) startTour(); }
  }, { threshold: 0.5 });
  io.observe(stage);
}
