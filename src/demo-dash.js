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
    cur, before,
    acc: ratio(cur[1], cur[0]), yld: ratio(cur[2], cur[1]),
    accPrev: ratio(before[1], before[0]), yldPrev: ratio(before[2], before[1]),
  };
}

function admissionsAfter(m) {
  const [app, acc, enr] = m.cur.map((v) => v || 0);
  let s = R(0, 0, W, H, '#fff');
  s += header('Admissions Funnel', ['Funnel', 'By Type', 'Trend', 'Departments'], 0);
  s += filterBar([['Fall term', m.fall], ['Level', m.group === 'Graduate' ? 'Graduate' : m.group === 'Undergraduate' ? 'Undergraduate' : '(All)'], ['Month Applied', '(All)'], ['Student Pop', ['All students', 'Undergraduate', 'Graduate'].includes(m.group) ? '(All)' : m.group], ['Department', '(All)']]);

  // Key figures table
  s += tile(12, 172, 795, 150, '');
  const cols = [250, 470, 688];
  ['Applied', 'Accepted', 'Enrolled'].forEach((h, k) => { s += T(cols[k], 205, h, { anchor: 'middle', size: 22, weight: 700, fill: INK }); });
  s += L(22, 220, 797, 220, '#d5dadd');
  s += R(22, 274, 775, 40, BAR);
  s += T(30, 255, 'Selected Fall', { size: 15, weight: 700, fill: INK }) + T(30, 300, 'VS Last Fall', { size: 15, weight: 700, fill: INK });
  m.cur.forEach((v, k) => {
    s += T(cols[k], 258, fmt(v), { anchor: 'middle', size: 30, fill: INK });
    s += T(cols[k], 303, signedPct(change(v, m.before[k])), { anchor: 'middle', size: 28, fill: INK });
  });
  [[823, 'Acceptance Rate', m.acc, m.accPrev], [1117, 'Yield', m.yld, m.yldPrev]].forEach(([x, t, v, p]) => {
    s += R(x, 172, 278, 150, BAR, { stroke: FRAME, sw: 2 });
    s += T(x + 139, 205, t, { anchor: 'middle', size: 22, weight: 700, fill: INK }) + L(x + 12, 220, x + 266, 220, '#d5dadd');
    s += T(x + 139, 258, pct(v), { anchor: 'middle', size: 30, fill: INK });
    s += T(x + 139, 303, signedPts(v != null && p != null ? (v - p) * 100 : null), { anchor: 'middle', size: 28, fill: INK });
  });

  // Funnel: width and height both follow the count, centered.
  s += tile(12, 336, 684, 516, `Admissions funnel, ${m.fall}`);
  const top = 390, maxW = 500, maxH = 170, cx = 354;
  let y = top;
  ['Applied', 'Accepted', 'Enrolled'].forEach((st, k) => {
    const v = m.cur[k] || 0, f = app ? v / app : 0;
    const w = maxW * f, h = Math.max(maxH * f, 34);
    const fill = ['#b9c2c6', '#d9848f', RED][k];
    const ink = k === 2 ? '#fff' : INK;
    const tip = `${st}, ${m.fall}: ${fmt(m.cur[k])} students · ${pct(f)} of applied`;
    s += R(cx - w / 2, y, w, h, fill, { tip, tour: `adm-funnel-${k}` });
    const mid = y + h / 2;
    s += T(cx, mid - 14, st, { anchor: 'middle', size: 15, fill: ink }) + T(cx, mid + 4, `${pct(f)} of Applied`, { anchor: 'middle', size: 15, fill: ink }) + T(cx, mid + 22, `Total: ${fmt(m.cur[k])}`, { anchor: 'middle', size: 15, fill: ink });
    y += h;
  });

  // Selected fall vs fall before
  s += tile(712, 336, 684, 516, `${m.fall} vs Previous Fall`);
  const x0 = 900, x1 = 1330, { top: mx, step } = ticks(Math.max(app, ...(m.before.map((v) => v || 0)), 1), 6);
  const sx = (v) => x0 + ((x1 - x0) * v) / mx;
  for (let t = 0; t <= mx + 1e-9; t += step) { s += L(sx(t), 372, sx(t), 790, '#eceeef') + T(sx(t), 812, short(Math.round(t)), { anchor: 'middle', size: 14, fill: INK }); }
  s += T((x0 + x1) / 2, 838, 'Students', { anchor: 'middle', size: 15, fill: INK });
  ['Applied', 'Accepted', 'Enrolled'].forEach((st, k) => {
    const gy = 378 + k * 138;
    s += T(726, gy + 30, st, { size: 15, fill: INK });
    [['Fall before', m.before[k]], ['Selected Fall', m.cur[k]]].forEach(([lab, v], j) => {
      const by = gy + 6 + j * 64;
      s += T(806, by + 30, lab, { size: 15, fill: INK });
      s += R(x0, by + 8, sx(v || 0) - x0, 46, j ? GRAY : '#aab4b9', { tip: `${st}, ${j ? m.fall : m.prevFall}: ${fmt(v)} students` });
      s += T(sx(v || 0) + 8, by + 37, fmt(v), { size: 15, fill: INK });
    });
    if (k < 2) s += L(722, gy + 136, 1386, gy + 136, '#e2e5e7');
  });
  s += L(x0, 372, x0, 790, '#c9cfd1');
  return s + footer();
}

function admissionsBefore(m) {
  let s = R(0, 0, W, H, '#fff');
  s += T(16, 48, 'Admissions Funnel', { size: 26, fill: '#333' });
  // The original: one stacked shape sized by count, Tableau's default colors, raw field names.
  s += plainTitle(16, 100, 'Admissions Funnel - Total');
  const x0 = 120, x1 = 1170, y0 = 120, y1 = 690;
  const tot = m.cur.reduce((a, v) => a + (v || 0), 0);
  const { top: mx, step } = ticks(tot || 1, 6);
  const sy = (v) => y1 - ((y1 - y0) * v) / mx;
  for (let t = 0; t <= mx + 1e-9; t += step) { s += L(x0, sy(t), x1, sy(t), '#e6e6e6') + T(x0 - 8, sy(t) + 5, short(Math.round(t)), { anchor: 'end', size: 13, fill: '#666' }); }
  s += T(36, (y0 + y1) / 2, 'COUNT', { size: 13, fill: '#666', rotate: -90, anchor: 'middle' });
  const colors = { Accepted: TAB10[0], Applied: TAB10[1], Enrolled: TAB10[2] };
  let acc = 0;
  const cx = (x0 + x1) / 2, maxW = 600, app = m.cur[0] || 1;
  ['Applied', 'Accepted', 'Enrolled'].forEach((st, k) => {
    const v = m.cur[k] || 0, w = Math.max(60, (maxW * v) / app);
    const ya = sy(acc + v), yb = sy(acc);
    s += R(cx - w / 2, ya, w, yb - ya, colors[st], { tip: `STATUS: ${st}\nSUM(COUNT): ${fmt(m.cur[k])}`, tour: `adm-before-${k}` });
    s += T(cx, (ya + yb) / 2 - 4, st, { anchor: 'middle', size: 13, fill: '#fff' }) + T(cx, (ya + yb) / 2 + 13, fmt(m.cur[k]), { anchor: 'middle', size: 13, fill: '#fff' });
    acc += v;
  });
  s += L(x0, y1, x1, y1, '#999');
  // Color legend and the filter column
  let lx = 1210;
  s += T(lx, 100, 'STATUS', { size: 13, weight: 700, fill: '#333' });
  Object.entries(colors).forEach(([k, c], i) => { s += R(lx, 110 + i * 20, 12, 12, c) + T(lx + 18, 121 + i * 20, k, { size: 12, fill: '#333' }); });
  s += rawFilter(lx, 180, 175, 'ACADEMIC_PERIOD', String(m.fallCode));
  s += rawFilter(lx, 240, 175, 'MONTH_OF_APP', '', ['(All)', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
  const pops = { 'New freshmen': 'N', Transfer: 'T', Readmit: 'R', International: 'I', Adult: 'A', Other: 'Other', Graduate: 'Grad' };
  s += rawFilter(lx, 520, 175, 'STUDENT_POP', '', [pops[m.group] ? pops[m.group] : '(All)']);
  s += rawFilter(lx, 580, 175, 'LEVELofAPPLICANT', m.group === 'Graduate' || m.group === 'Undergraduate' ? m.group : '(All)');
  // The banner image along the bottom of the original
  s += R(16, 720, 1170, 160, '#e9e9e9') + T(600, 808, 'banner image', { anchor: 'middle', size: 16, fill: '#999' });
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
    beforeNote: 'Before: one funnel sized by count, default colors, raw field names, filters stacked down the side.',
    afterNote: 'After: the three counts and their change first, rates beside them, then the funnel and this fall against last.' },
  ftf: { label: 'First-Time Freshmen', file: 'ftf.json', model: ftfModel, before: ftfBefore, after: ftfAfter,
    beforeNote: 'Before: every race on one axis, so the smaller groups flatten against the bottom; term codes instead of names.',
    afterNote: 'After: the latest fall at a glance, then the trend; race split so each group is readable on its own scale.' },
};

const state = { dash: 'admissions', fall: null, group: 'all', split: 50, data: {} };

root.innerHTML = `${HERO ? '' : `
  <div class="demo__head">
    <div>
      <p class="demo__eyebrow">BEFORE ⇄ AFTER · DATA AS PUBLISHED</p>
      <h2 class="demo__title">Same numbers, <i>redesigned.</i></h2>
      <p class="demo__lede">Two of the dashboards I redesigned for Nicholls State's Office of Institutional Research, rebuilt here from their published figures. Drag the seam to compare the original with the redesign; the filters drive both sides.</p>
    </div>
    <button type="button" class="demo__go" data-tour-toggle aria-pressed="false">Play the tour</button>
  </div>`}
  <div class="dash-bar">
    ${HERO ? '<p class="dash-hero-title">Admissions dashboard, Nicholls State University</p>' : `<div class="dash-tabs" role="tablist" aria-label="Dashboard">
      ${Object.entries(DASHES).map(([k, d]) => `<button type="button" role="tab" data-dash="${k}" aria-selected="${k === state.dash}">${d.label}</button>`).join('')}
    </div>`}
    <label class="dash-field">Fall term <select data-fall></select></label>
    <label class="dash-field" data-group-wrap>Students <select data-group></select></label>
  </div>
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
  </div>
  <div class="snaps dash-snaps" role="group" aria-label="Jump to a view">
    <button type="button" data-split="100" aria-pressed="false">Original</button>
    <button type="button" data-split="50" aria-pressed="true">Half and half</button>
    <button type="button" data-split="0" aria-pressed="false">Redesign</button>
  </div>
  <p class="dash-note" data-note></p>
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
  groupWrap.hidden = state.dash !== 'admissions';
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
  const from = state.split, t0 = performance.now();
  cursorTo(handle);
  await wait(500);
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
  // One sweep across the seam shortly after load; any interaction stops it.
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => root.addEventListener(ev, (e) => { if (e.isTrusted) tourRun++; }, { passive: true }));
  if (!reduceMotion) {
    const run = ++tourRun;
    await wait(900);
    for (const [to, ms, pause] of [[94, 1300, 1500], [6, 1900, 1500], [50, 900, 0]]) {
      if (run !== tourRun) break;
      await dragSeam(to, run, ms);
      await wait(pause);
    }
  }
} else if (!reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) { io.disconnect(); if (!touring) startTour(); }
  }, { threshold: 0.5 });
  io.observe(stage);
}
