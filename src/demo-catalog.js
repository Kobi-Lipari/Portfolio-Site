// Slideshow: six more Nicholls State dashboards from the same redesign, each drawn from its
// published figures. Plays on its own while in view; hover for numbers, or step through.
// Data: small chart-level aggregates in /data/dashboards/*.json (counts under 10 are null,
// rates only where the group has 10 or more students).

import {
  BAR, FONT, FRAME, GRAY, H, INK, L, MUTED, R, RED, T, W, dot, esc, filterBar, fmt, footer, path, pct, short,
  signedPct, signedPts, ticks, tile, header as kitHeader,
} from './dash-kit.js';

const root = document.querySelector('[data-demo="catalog"]');
const BASE = root.dataset.base || '/';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = (title, buttons, active = 0) => kitHeader(title, buttons, active, BASE);
const SECONDS = 8;

const sum = (a) => a.reduce((t, v) => t + (v || 0), 0);
const last = (a) => a[a.length - 1];
const ptsChange = (a, b) => (a == null || b == null ? null : (a - b) * 100);

// Category colors. Enrollment keeps the palette its redesign set on the data source
// (tune_oe_breakdown_colors.py); the other dashboards use the FTF race hues.
const SLATE = '#3d4549', DARK_RED = '#6e1020', ROSE = '#d26f7e', PINK = '#ebb3bb', LIGHT = '#b9c2c6';
const BLUE = '#2a78d6', AQUA = '#1baf7a', YELLOW = '#eda100', VIOLET = '#4a3aa7', MAGENTA = '#e87ba4';
const OE_COLORS = {
  'Classification': { FR: PINK, SO: ROSE, JR: RED, SR: DARK_RED, GR: SLATE, GP: GRAY, Graduate: SLATE },
  'Home Residency': { '8-Parish Region': DARK_RED, '8-Parish': DARK_RED, 'In State': RED, 'Out of State': ROSE, 'International': PINK },
  'College': { ST: BLUE, BA: YELLOW, ED: AQUA, LA: VIOLET, NU: RED, JF: MAGENTA, XX: LIGHT },
  'Race': { 'White': SLATE, 'Black/African American': YELLOW, 'Hispanic': AQUA, 'Two or More Races': VIOLET, 'Asian': BLUE,
    'Alaskan Native/American Indian': RED, 'Native Hawaiian/Pacific Islander': MAGENTA, 'Unknown': LIGHT },
  'Gender': { Female: RED, Male: SLATE },
  'Student Level': { Undergraduate: RED, Graduate: SLATE },
  'Degree Delivery': { 'In Person': RED, 'Online': BLUE },
};
const CLASS_ORDER = ['FR', 'SO', 'JR', 'SR', 'GR', 'GP', 'Graduate'];
const RESIDENCY_ORDER = ['8-Parish Region', '8-Parish', 'In State', 'Out of State', 'International'];
const byOrder = (order) => (a, b) => (order.indexOf(a.v) + 1 || 99) - (order.indexOf(b.v) + 1 || 99);
const COLLEGE_NAMES = { ST: 'Sciences and Technology', BA: 'Business Administration', ED: 'Education and Behavioral Sciences',
  LA: 'Liberal Arts', NU: 'Nursing', JF: 'Chef John Folse Culinary Institute', XX: 'No college assigned' };
function raceColor(name) {
  const n = String(name).toLowerCase();
  if (n.includes('white')) return '#3d4549';
  if (n.includes('black')) return '#c08a2e';
  if (n.includes('hispanic')) return '#4f8c7c';
  if (n.includes('two or more')) return '#8a6a8e';
  if (n.includes('asian')) return '#4f7c99';
  if (n.includes('indian') || n.includes('alaska')) return '#6e1020';
  if (n.includes('hawaiian') || n.includes('pacific')) return '#e87ba4';
  if (n.includes('unknown')) return '#c9cfd1';
  return '#9aa5aa';
}
const raceShort = (name) => String(name)
  .replace(/ or African American|\/African American/i, '').replace(/ or Latino|\/Latino/i, '')
  .replace(/American Indian or Alaska Native|Alaskan Native\/American Indian/i, 'American Indian')
  .replace(/Native Hawaiian or (Other )?Pacific Islander|Native Hawaiian\/Pacific Islander/i, 'Pacific Islander')
  .replace(/Race\/ethnicity unknown/i, 'Unknown').replace(/Nonresident alien/i, 'Nonresident');

// ── Small chart pieces ──────────────────────────────────────────────
// Horizontal bars: rows of [label, value, color, tip]; value text after each bar.
function hbars(x, y, w, h, rows, { label = 130, format = fmt, max } = {}) {
  let s = '';
  const top = max || Math.max(...rows.map((r) => r[1] || 0), 1);
  const band = h / Math.max(rows.length, 1), bh = Math.min(30, band * 0.7);
  const x0 = x + label, span = w - label - 70;
  rows.forEach(([lab, v, fill, tip], k) => {
    const by = y + k * band + (band - bh) / 2;
    s += T(x0 - 8, by + bh / 2 + 5, lab, { anchor: 'end', size: 14, fill: INK });
    s += R(x0, by, (span * (v || 0)) / top, bh, fill, { tip });
    s += T(x0 + (span * (v || 0)) / top + 6, by + bh / 2 + 5, format(v), { size: 14, fill: INK });
  });
  return s;
}
// Vertical bars: rows of [label, value, color, tip]; value above each bar.
function vbars(x, y, w, h, rows, { format = fmt, labelSize = 14 } = {}) {
  let s = '';
  const top = Math.max(...rows.map((r) => r[1] || 0), 1) * 1.12;
  const band = w / Math.max(rows.length, 1), bw = Math.min(90, band * 0.62);
  const base = y + h - 26;
  rows.forEach(([lab, v, fill, tip], k) => {
    const bx = x + k * band + (band - bw) / 2, bh = ((h - 50) * (v || 0)) / top;
    s += R(bx, base - bh, bw, bh, fill, { tip });
    s += T(bx + bw / 2, base - bh - 7, format(v), { anchor: 'middle', size: 14, fill: INK });
    s += T(bx + bw / 2, base + 19, lab, { anchor: 'middle', size: labelSize, fill: INK });
  });
  return s + L(x, base, x + w, base, '#c9cfd1');
}
// Key-figure cells in a row: [label, value, sub].
function figures(x, y, w, cells, { valueSize = 30 } = {}) {
  let s = '';
  const cw = w / cells.length;
  cells.forEach(([lab, val, sub], k) => {
    const cx = x + cw * k + cw / 2;
    s += T(cx, y, lab, { anchor: 'middle', size: 15, weight: 700, fill: INK });
    s += T(cx, y + 40, val, { anchor: 'middle', size: valueSize, weight: 700, fill: INK });
    if (sub) s += T(cx, y + 66, sub, { anchor: 'middle', size: 14, fill: MUTED });
  });
  return s;
}
// Red sequential ramp for heat grids.
function heat(t) {
  const a = [251, 234, 236], b = [110, 16, 32];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t)))).join(',')})`;
}

// ── Overall Enrollment: Enrollment Breakdown ────────────────────────
function enrollment(D) {
  const fall = last(D.falls), prev = D.falls[D.falls.length - 2];
  const term = `Fall ${fall}`;
  const dim = (d) => {
    const { values, byFall } = D.dims[d];
    return values.map((v, k) => ({ v, n: byFall[String(fall)][k], p: prev ? byFall[String(prev)][k] : null }));
  };
  const total = D.terms.find((t) => t.term === 'Fall' && t.year === fall).total;
  const prevTotal = prev ? D.terms.find((t) => t.term === 'Fall' && t.year === prev).total : null;
  const tip = (name, r) => `${name}, ${term}: ${fmt(r.n)} students${r.p != null && r.n != null ? `\n${signedPct(r.n / r.p - 1)} vs Fall ${prev}` : ''}`;
  const col = (d, v) => (OE_COLORS[d] && OE_COLORS[d][v]) || LIGHT;

  let s = R(0, 0, W, H, '#fff') + header('Enrollment Breakdown', ['Breakdown', 'Trend', 'By Program', 'Visual']);
  s += filterBar([['Term', term], ['College', '(All)'], ['Classification', '(All)'], ['Student Level', '(All)'], ['Home Residency', '(All)']], 83, 70);

  const cls = dim('Classification').sort(byOrder(CLASS_ORDER));
  s += tile(8, 162, 458, 340, `Classification · ${fmt(total)} students`);
  s += T(452, 192, `${signedPct(prevTotal ? total / prevTotal - 1 : null)} vs Fall ${prev}`, { anchor: 'end', size: 14, fill: MUTED });
  s += vbars(24, 206, 426, 290, cls.map((r) => [r.v, r.n, col('Classification', r.v), tip(r.v, r)]));

  const colleges = dim('College');
  s += tile(474, 162, 918, 340, 'Colleges');
  s += vbars(490, 206, 886, 290, colleges.map((r) => [r.v, r.n, col('College', r.v), tip(COLLEGE_NAMES[r.v] || r.v, r)]));

  // Three two-group splits stacked on the left.
  [['Student Level', 'Level'], ['Gender', 'Gender'], ['Degree Delivery', 'Delivery']].forEach(([d, title], k) => {
    const y = 510 + k * 118, rows = dim(d), t = sum(rows.map((r) => r.n));
    s += tile(8, y, 458, 110, title);
    let x = 24;
    rows.forEach((r) => {
      const w = (426 * (r.n || 0)) / (t || 1);
      s += R(x, y + 44, w, 36, col(d, r.v), { tip: tip(r.v, r) });
      if (w > 90) s += T(x + 8, y + 68, `${r.v} ${pct((r.n || 0) / (t || 1))}`, { size: 14, weight: 700, fill: '#fff' });
      x += w;
    });
  });

  const res = dim('Home Residency').sort(byOrder(RESIDENCY_ORDER));
  s += tile(474, 510, 454, 346, 'Home residency');
  s += hbars(486, 548, 430, 290, res.map((r) => [r.v, r.n, col('Home Residency', r.v), tip(r.v, r)]), { label: 132 });

  const race = dim('Race');
  s += tile(936, 510, 456, 346, 'Race');
  s += hbars(948, 548, 432, 290, race.map((r) => [raceShort(r.v), r.n, col('Race', r.v), tip(r.v, r)]), { label: 132 });
  return s + footer();
}

// ── Number of Graduates: Degrees by Semester ────────────────────────
function graduates(D) {
  const years = D.years, ay = last(years), prevAy = years[years.length - 2];
  const tot = D.total[ay], prevTot = D.total[prevAy];
  const lv = D.level[ay], lvSum = sum(lv);
  let s = R(0, 0, W, H, '#fff') + header('Number of Graduates', ['Degrees by Year', 'Degrees by Semester'], 1);
  s += filterBar([['Years', 'Since 2020-21'], ['College', '(All)'], ['Department', '(All)'], ['Degree Level', '(All)'], ['Major', '(All)']], 83, 70);

  s += tile(8, 162, 1384, 118, '');
  s += T(24, 204, 'Latest academic year', { size: 15, weight: 700, fill: MUTED }) + T(24, 228, ay, { size: 22, weight: 700, fill: INK });
  s += figures(230, 202, 1150, [
    ['Degrees awarded', fmt(tot)],
    [`vs ${prevAy}`, signedPct(tot != null && prevTot ? tot / prevTot - 1 : null)],
    ...D.levels.slice(0, 3).map((name, k) => [`${name} share`, pct(lvSum ? (lv[k] || 0) / lvSum : null)]),
  ], { valueSize: 28 });

  // Degrees by academic year, stacked Summer / Fall / Spring with the total above.
  const shown = years.filter((y) => y >= '2020-21');
  s += tile(8, 290, 470, 566, 'Degrees by academic year and term');
  const termColors = [PINK, ROSE, RED];
  const x0 = 70, x1 = 462, yT = 350, yB = 790;
  const { top: mx, step } = ticks(Math.max(...shown.map((y) => sum(D.terms[y]))) * 1.08, 5);
  const sy = (v) => yB - ((yB - yT) * v) / mx;
  for (let t = 0; t <= mx + 1e-9; t += step) s += L(x0, sy(t), x1, sy(t), '#eceeef') + T(x0 - 6, sy(t) + 4, short(t), { anchor: 'end', size: 12, fill: INK });
  const band = (x1 - x0) / shown.length, bw = band * 0.64;
  shown.forEach((y, k) => {
    const bx = x0 + k * band + (band - bw) / 2;
    let acc = 0;
    D.terms[y].forEach((v, j) => {
      s += R(bx, sy(acc + (v || 0)), bw, sy(acc) - sy(acc + (v || 0)), termColors[j], { tip: `${D.termNames[j]}, ${y}: ${fmt(v)} degrees` });
      acc += v || 0;
    });
    s += T(bx + bw / 2, sy(acc) - 7, fmt(D.total[y]), { anchor: 'middle', size: 13, weight: 700, fill: INK });
    s += T(bx + bw / 2, yB + 20, y, { anchor: 'middle', size: 12, fill: INK });
  });
  D.termNames.forEach((t, j) => { s += R(70 + j * 110, 822, 14, 14, termColors[j]) + T(90 + j * 110, 834, t, { size: 14, fill: INK }); });

  // Programs with the most degrees, by year, as a red heat grid.
  const P = D.programs;
  s += tile(486, 290, 906, 566, 'Programs with the most degrees, by academic year');
  const gx = 900, gy = 368, cw = (1376 - gx) / P.years.length, ch = Math.min(36, 470 / P.rows.length);
  const hi = Math.max(...P.rows.flatMap((r) => r[2].map((v) => v || 0)), 1);
  P.years.forEach((y, k) => { s += T(gx + k * cw + cw / 2, gy - 10, y, { anchor: 'middle', size: 13, weight: 700, fill: INK }); });
  P.rows.forEach(([name, deg, vals], j) => {
    const yy = gy + j * ch;
    const label = name.length > 44 ? name.slice(0, 42) + '…' : name;
    s += T(gx - 10, yy + ch / 2 + 5, `${label.replace(/\b([A-Z])([A-Z']+)/g, (m, a, b) => a + b.toLowerCase())} (${deg})`, { anchor: 'end', size: 13, fill: INK });
    vals.forEach((v, k) => {
      const t = (v || 0) / hi;
      s += R(gx + k * cw + 1, yy + 1, cw - 2, ch - 2, v == null ? '#f4f5f6' : heat(t), { tip: `${name} (${deg}), ${P.years[k]}: ${fmt(v)} degrees` });
      s += T(gx + k * cw + cw / 2, yy + ch / 2 + 5, fmt(v), { anchor: 'middle', size: 13, fill: t > 0.55 ? '#fff' : INK });
    });
  });
  return s + footer();
}

// ── Retention: Retention Rates by College ───────────────────────────
function retention(D, { title, later }) {
  const codes = D.cohorts.map((c) => String(c.code));
  // The latest cohort whose later-year numbers are in.
  const done = codes.filter((c) => D.overall[c][1] != null && D.overall[c][2] != null);
  const cur = last(done), prev = done[done.length - 2];
  const label = (c) => D.cohorts.find((x) => String(x.code) === c).label;
  const [n, kept, r] = D.overall[cur];
  let s = R(0, 0, W, H, '#fff') + header(title, ['By College', 'By Race and Gender']);
  s += filterBar([['Cohort', label(cur)], ['College', '(All)'], ['Department', '(All)'], ['Reported Race', '(All)']], 83, 70);

  s += tile(8, 162, 552, 290, 'Selected cohort at a glance');
  s += T(24, 222, label(cur), { size: 15, weight: 700, fill: MUTED });
  s += figures(24, 262, 520, [['First-time students', fmt(n)], [`Back for ${later.toLowerCase()}`, fmt(kept)], ['Retention rate', pct(r)]]);
  s += R(18, 362, 532, 76, BAR);
  s += T(32, 406, `vs ${label(prev)}`, { size: 15, weight: 700, fill: INK });
  s += T(458, 408, `${signedPts(ptsChange(r, D.overall[prev][2]))} pts`, { anchor: 'middle', size: 28, weight: 700, fill: INK });

  // Rate by cohort, selected cohort in red.
  s += tile(568, 162, 824, 290, 'Retention rate by cohort');
  const shown = done.slice(-10);
  s += vbars(584, 196, 792, 252, shown.map((c) => [label(c).replace('Fall ', ''), D.overall[c][2] * 100, c === cur ? RED : GRAY,
    `${label(c)} cohort: ${pct(D.overall[c][2])} retained\n${fmt(D.overall[c][1])} of ${fmt(D.overall[c][0])} students`]), { format: (v) => `${Math.round(v)}%`, labelSize: 13 });

  // Departments, pooled over the last five cohorts.
  const depts = D.departments.rows.filter((d) => d[2] != null).slice(0, 9);
  s += tile(8, 460, 552, 396, 'Retention by department');
  s += T(22, 514, `${D.departments.cohorts[0].replace('Fall ', '')}–${last(D.departments.cohorts).replace('Fall ', '')} cohorts · red: above the selected cohort's rate`, { size: 13, fill: MUTED });
  s += hbars(20, 524, 528, 322, depts.map(([d, dn, dr]) => [d, dr * 100, dr >= r ? RED : GRAY, `${d}: ${pct(dr)} retained\n${fmt(dn)} first-time students`]), { label: 70, format: (v) => `${Math.round(v)}%`, max: 100 });

  // Rate by cohort for the largest race groups.
  s += tile(568, 460, 824, 396, 'Retention rate by race, by cohort');
  const groups = D.races.slice(0, 4);
  const xL = 630, xR = 1236, yT = 510, yB = 800;
  const px = (k) => xL + ((xR - xL) * k) / Math.max(shown.length - 1, 1), py = (v) => yB - ((yB - yT) * v) / 100;
  [0, 25, 50, 75, 100].forEach((t) => { s += L(xL, py(t), xR, py(t), '#eceeef') + T(xL - 8, py(t) + 4, `${t}%`, { anchor: 'end', size: 12, fill: INK }); });
  groups.forEach((g, j) => {
    const vals = shown.map((c) => { const cell = D.race[c] && D.race[c][j]; return cell && cell[1] != null ? cell[1] * 100 : null; });
    const col = raceColor(g);
    s += path(vals.map((v, k) => (v == null ? null : [px(k), py(v)])), col, 3, { tip: `${g}: retention by cohort` });
    vals.forEach((v, k) => { if (v != null) s += dot(px(k), py(v), 3.5, col, { tip: `${g}, ${label(shown[k])}: ${Math.round(v)}% retained` }); });
    s += R(1262, 514 + j * 26, 14, 14, col) + T(1282, 526 + j * 26, raceShort(g), { size: 14, fill: INK });
  });
  shown.forEach((c, k) => { s += T(px(k), yB + 20, label(c).replace('Fall ', ''), { anchor: 'middle', size: 12, fill: INK }); });
  return s + footer();
}

// ── Graduation rate: Average Completion Rates ───────────────────────
function gradRate(D, { title, years }) {
  const ys = D.years.map(String);
  const n = sum(ys.map((y) => D.overall[y][0])), done = sum(ys.map((y) => D.overall[y][1]));
  const latest = last(ys), before = ys[ys.length - 2];
  let s = R(0, 0, W, H, '#fff') + header(title, ['Averages', 'By Race', 'Breakdown']);
  s += R(0, 83, W, 70, '#fff');
  s += R(7, 90, 236, 56, BAR) + T(15, 112, 'Race', { size: 18, fill: INK }) + R(15, 118, 220, 22, '#fff', { stroke: '#c9cfd1' }) + T(21, 134, '(All)', { size: 14, fill: MUTED });
  s += T(262, 124, `${years}-Year Completion Rates only include Bachelor's or equivalent degree-seeking cohorts.`, { size: 15, fill: MUTED });

  s += tile(8, 162, 470, 306, 'All cohorts at a glance');
  s += T(24, 222, `Cohorts ${ys[0]}–${latest}`, { size: 15, weight: 700, fill: MUTED });
  s += figures(24, 262, 438, [['In cohort', fmt(n)], ['Graduated', fmt(done)], ['Rate', pct(n ? done / n : null)]]);
  s += R(18, 374, 450, 80, BAR);
  s += T(32, 408, `${latest} cohort`, { size: 15, weight: 700, fill: INK }) + T(32, 432, `vs ${before}`, { size: 14, fill: MUTED });
  s += T(330, 418, pct(D.overall[latest][2]), { anchor: 'middle', size: 28, weight: 700, fill: INK });
  s += T(420, 418, `${signedPts(ptsChange(D.overall[latest][2], D.overall[before][2]))} pts`, { anchor: 'middle', size: 18, fill: MUTED });

  const races = D.race.filter((r) => r[2] != null);
  s += tile(486, 162, 906, 306, `Average ${years}-year completion rate by race`);
  s += vbars(502, 196, 874, 266, races.map(([g, gn, gr]) => [raceShort(g), gr * 100, raceColor(g), `${g}: ${pct(gr)} graduated within ${years} years\n${fmt(gn)} students across all cohorts`]), { format: (v) => `${Math.round(v)}%`, labelSize: 12 });

  const genders = D.gender.filter((r) => r[2] != null);
  s += tile(8, 476, 470, 380, `Average ${years}-year completion rate by gender`);
  s += vbars(60, 520, 366, 320, genders.map(([g, gn, gr]) => [g, gr * 100, g === 'Female' ? RED : SLATE, `${g}: ${pct(gr)} graduated within ${years} years\n${fmt(gn)} students across all cohorts`]), { format: (v) => `${Math.round(v)}%` });

  s += tile(486, 476, 906, 380, `Trend of overall ${years}-year completion rates`);
  const xL = 560, xR = 1360, yT = 530, yB = 800;
  const vals = ys.map((y) => (D.overall[y][2] == null ? null : D.overall[y][2] * 100));
  const hi = Math.min(100, Math.ceil((Math.max(...vals.filter((v) => v != null)) + 8) / 10) * 10);
  const px = (k) => xL + ((xR - xL) * k) / Math.max(ys.length - 1, 1), py = (v) => yB - ((yB - yT) * v) / hi;
  for (let t = 0; t <= hi; t += hi > 50 ? 20 : 10) s += L(xL, py(t), xR, py(t), '#eceeef') + T(xL - 8, py(t) + 4, `${t}%`, { anchor: 'end', size: 12, fill: INK });
  s += path(vals.map((v, k) => (v == null ? null : [px(k), py(v)])), GRAY, 4);
  vals.forEach((v, k) => {
    if (v == null) return;
    const on = k === ys.length - 1;
    s += dot(px(k), py(v), on ? 7 : 4.5, on ? RED : GRAY, { tip: `${ys[k]} cohort: ${pct(v / 100)} graduated within ${years} years\n${fmt(D.overall[ys[k]][1])} of ${fmt(D.overall[ys[k]][0])} students` });
    s += T(px(k), py(v) - 12, `${Math.round(v)}%`, { anchor: 'middle', size: 13, weight: on ? 700 : 400, fill: on ? RED : INK });
    s += T(px(k), yB + 22, ys[k], { anchor: 'middle', size: 12, fill: INK });
  });
  return s + footer();
}

// ── Slides ──────────────────────────────────────────────────────────
const SLIDES = [
  { key: 'enrollment', label: 'Overall Enrollment', draw: enrollment,
    note: 'Every chart is colored by its own categories: ordered groups like class year in a red ramp, unordered ones like college in distinct hues, unknowns in gray.' },
  { key: 'graduates', label: 'Number of Graduates', draw: graduates,
    note: 'The latest year and its change come first; one Years dropdown now filters both charts through a single calculation instead of three copies of each sheet.' },
  { key: 'retention12', label: 'First to Second Year Retention', draw: (D) => retention(D, { title: 'First to Second Year Retention', later: 'Second year' }),
    note: 'A key-figures table for the selected cohort, with its change from the cohort before, above the trend and the department breakdown.' },
  { key: 'retention13', label: 'First to Third Year Retention', draw: (D) => retention(D, { title: 'First to Third Year Retention', later: 'Third year' }),
    note: 'Same layout as the second-year dashboard, so the two read side by side: one header, one filter bar, one type scale.' },
  { key: 'grad4', label: '4-Year Graduation Rate', draw: (D) => gradRate(D, { title: '4-Yr Graduation Rate', years: 4 }),
    note: 'All cohorts at a glance first, then averages by race and gender, then the trend, with the definition stated where the numbers are.' },
  { key: 'grad6', label: '6-Year Graduation Rate', draw: (D) => gradRate(D, { title: '6-Yr Graduation Rate', years: 6 }),
    note: 'Built on the same template as the 4-year page, so a reader who learns one already knows the other.' },
];

root.innerHTML = `
  <div class="demo__head">
    <div>
      <p class="demo__eyebrow">SLIDESHOW · DATA AS PUBLISHED</p>
      <h2 class="demo__title">The rest of the <i>catalog.</i></h2>
      <p class="demo__lede">Six more dashboards from the same redesign, drawn here from their published figures. It plays on its own; hover a chart for its numbers, or step through.</p>
    </div>
    <button type="button" class="demo__go" data-play aria-pressed="false">Play</button>
  </div>
  <div class="cat-stage" data-stage tabindex="0" aria-roledescription="carousel" aria-label="Redesigned dashboards">
    ${SLIDES.map((sl, i) => `<svg class="cat-slide" viewBox="0 0 ${W} ${H}" ${FONT} role="img" aria-roledescription="slide" aria-label="${esc(`${sl.label}, ${i + 1} of ${SLIDES.length}`)}" data-slide="${i}"></svg>`).join('')}
    <div class="dash-tip" hidden></div>
  </div>
  <p class="cat-cap" data-cap aria-live="polite"></p>
  <div class="cat-nav">
    <button type="button" class="cat-arrow" data-step="-1" aria-label="Previous dashboard">←</button>
    <div class="cat-thumbs" role="group" aria-label="Choose a dashboard">
      ${SLIDES.map((sl, i) => `<button type="button" class="cat-thumb" data-go="${i}" aria-pressed="false"><span>${esc(sl.label)}</span><i class="cat-thumb__bar"></i></button>`).join('')}
    </div>
    <button type="button" class="cat-arrow" data-step="1" aria-label="Next dashboard">→</button>
  </div>
  <p class="dash-credit">Recreated from dashboards I redesigned for Nicholls State's Office of Institutional Research · data as published · counts under 10 show as &lt;10 · <a href="https://www.nicholls.edu/irep/dashboards/" target="_blank" rel="noopener">Open the originals ↗</a></p>`;

const $ = (s) => root.querySelector(s);
const stage = $('[data-stage]'), cap = $('[data-cap]'), tipEl = $('.dash-tip'), playBtn = $('[data-play]');
const svgs = [...root.querySelectorAll('.cat-slide')], thumbs = [...root.querySelectorAll('[data-go]')];
root.style.setProperty('--cat-seconds', `${SECONDS}s`);

let index = 0, playing = false, timer = 0, visible = false, hovering = false;

function show(i) {
  index = (i + SLIDES.length) % SLIDES.length;
  svgs.forEach((s, k) => { s.classList.toggle('is-on', k === index); s.setAttribute('aria-hidden', String(k !== index)); });
  thumbs.forEach((b, k) => b.setAttribute('aria-pressed', String(k === index)));
  const sl = SLIDES[index];
  cap.innerHTML = `<b>${esc(sl.label)}.</b> ${esc(sl.note)}`;
  tipEl.hidden = true;
  restart();
}
// The active thumb's bar fills over SECONDS while playing; the slide advances when it does.
function restart() {
  clearTimeout(timer);
  thumbs.forEach((b) => b.classList.remove('is-running'));
  if (!playing || !visible || hovering) return;
  const b = thumbs[index];
  void b.offsetWidth; // restart the CSS animation
  b.classList.add('is-running');
  timer = setTimeout(() => show(index + 1), SECONDS * 1000);
}
function setPlaying(on) {
  playing = on;
  playBtn.textContent = on ? 'Pause' : 'Play';
  playBtn.setAttribute('aria-pressed', String(on));
  root.classList.toggle('is-playing', on);
  restart();
}

playBtn.addEventListener('click', () => setPlaying(!playing));
root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { setPlaying(false); show(index + Number(b.dataset.step)); }));
thumbs.forEach((b) => b.addEventListener('click', () => { setPlaying(false); show(Number(b.dataset.go)); }));
stage.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setPlaying(false); show(index + (e.key === 'ArrowRight' ? 1 : -1)); }
});
// Pause while the pointer is on the dashboard, so its numbers can be read.
stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovering = true; restart(); } });
stage.addEventListener('pointerleave', () => { hovering = false; tipEl.hidden = true; restart(); });
// Swipe on touch screens.
let touchX = null;
stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
stage.addEventListener('touchend', (e) => {
  if (touchX == null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 40) { setPlaying(false); show(index + (dx < 0 ? 1 : -1)); }
});

// Hover text for marks.
stage.addEventListener('pointermove', (e) => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (!t) { tipEl.hidden = true; return; }
  const r = stage.getBoundingClientRect();
  tipEl.textContent = '';
  t.dataset.tip.split('\n').forEach((line, i) => { const s = document.createElement('span'); s.textContent = line; if (!i) s.className = 'dash-tip__head'; tipEl.append(s); });
  tipEl.hidden = false;
  const x = Math.min(e.clientX - r.left + 14, r.width - tipEl.offsetWidth - 6), y = e.clientY - r.top + 14;
  tipEl.style.left = `${Math.max(6, x)}px`;
  tipEl.style.top = `${y + tipEl.offsetHeight > r.height ? e.clientY - r.top - tipEl.offsetHeight - 10 : y}px`;
});

// Load all six, draw each once, then play while the slideshow is on screen.
const data = await Promise.all(SLIDES.map((sl) => fetch(`${BASE}data/dashboards/${sl.key}.json`).then((r) => r.json())));
SLIDES.forEach((sl, i) => { svgs[i].innerHTML = sl.draw(data[i]); });
show(0);
new IntersectionObserver((entries) => {
  visible = entries.some((en) => en.isIntersecting);
  restart();
}, { threshold: 0.4 }).observe(stage);
if (!reduceMotion) setPlaying(true);
