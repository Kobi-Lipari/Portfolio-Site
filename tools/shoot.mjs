// Screenshots every page of the built site at two widths in three looks and reports what a
// visitor would notice: a page that is not 200, sideways scrolling, script errors.
//
//   node build.mjs
//   TOOLS_DIR=~/node-tools node tools/shoot.mjs dist shots [--motion] [--pages=/,/work/] [--diff=<dir>]
//
// Pages: every <loc> in dist/sitemap.xml plus /404.html, or the --pages list. Widths: 1440 x 900
// and 390 x 844 (the phone width is emulated with touch). Looks: light, dark and bp (Blueprint
// mode). Animations are off (reduced motion) unless --motion. Writes shots/<page>-<width>[-dark|-bp].png
// and shots/report.json, one row per page, width and look, and exits 1 when any row has a status
// other than 200, scrolls sideways or logged an error. --diff=<dir> compares each new picture with
// the same-named one in <dir> (an earlier run) pixel by pixel with sharp and reports the share
// that changed as diff (a number, or a note when the sizes differ or the old picture is missing);
// nothing fails on it.
// Without playwright in TOOLS_DIR the system Chromium takes the light shots itself: no dark or bp
// looks and no status, scroll or error checks; those rows say fallback: true.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { launch, serve, requireTool, CHROMIUM } from './browser.mjs';

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const [distArg = 'dist', outArg = 'shots'] = args.filter((a) => !a.startsWith('--'));
const DIST = path.resolve(distArg);
const OUT = path.resolve(outArg);
if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error(`${distArg}/index.html is missing. Run \`node build.mjs\` first.`);
  process.exit(1);
}

const WIDTHS = [[1440, 900], [390, 844]];
const LOOKS = ['light', 'dark', 'bp'];
let pages;
if (flags.pages) {
  pages = String(flags.pages).split(',').map((p) => p.trim()).filter(Boolean);
} else {
  const sitemap = path.join(DIST, 'sitemap.xml');
  if (!existsSync(sitemap)) {
    console.error(`${distArg}/sitemap.xml is missing (NOINDEX builds have none). Build without NOINDEX, or pass --pages=/,/work/.`);
    process.exit(1);
  }
  pages = [...(await readFile(sitemap, 'utf8')).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  pages.push('/404.html');
}
const DIFF = flags.diff ? path.resolve(String(flags.diff)) : null;
let sharp = null;
if (DIFF) {
  try { sharp = requireTool('sharp'); } catch { console.error('--diff needs sharp in TOOLS_DIR.'); process.exit(1); }
  if (!existsSync(DIFF)) { console.error(`${flags.diff} is missing.`); process.exit(1); }
}
// Share of pixels (0 to 100) that differ between two pictures of the same size; a note otherwise.
async function pixelDiff(a, b) {
  if (!existsSync(b)) return 'no earlier picture';
  const [x, y] = await Promise.all([a, b].map((f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) return `size ${x.info.width}x${x.info.height} vs ${y.info.width}x${y.info.height}`;
  let changed = 0;
  for (let i = 0; i < x.data.length; i += 4) {
    if (x.data[i] !== y.data[i] || x.data[i + 1] !== y.data[i + 1] || x.data[i + 2] !== y.data[i + 2] || x.data[i + 3] !== y.data[i + 3]) changed++;
  }
  return Number(((100 * changed) / (x.data.length / 4)).toFixed(2));
}
const slug = (p) => (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '-'));
const file = (p, width, look) => path.join(OUT, `${slug(p)}-${width}${look === 'light' ? '' : `-${look}`}.png`);

await mkdir(OUT, { recursive: true });
const site = await serve(DIST);
const report = [];
const browser = await launch();
try {
  if (browser) {
    for (const p of pages) for (const [width, height] of WIDTHS) for (const look of LOOKS) {
      const phone = width < 600;
      const context = await browser.newContext({
        viewport: { width, height },
        colorScheme: look === 'dark' ? 'dark' : 'light',
        reducedMotion: flags.motion ? 'no-preference' : 'reduce',
        isMobile: phone, hasTouch: phone,
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e.message || e)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      let status = null;
      try {
        const res = await page.goto(site.url + p, { waitUntil: 'networkidle' });
        status = res ? res.status() : null;
      } catch (e) {
        errors.push(String(e.message || e));
      }
      if (look === 'bp') {
        await page.evaluate(() => document.documentElement.classList.add('bp-mode'));
        await page.waitForTimeout(600);
      }
      await page.waitForTimeout(300);
      const { scrollWidth, scrollHeight } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
      const out = file(p, width, look);
      // The whole page in one picture by making the viewport as tall as the page: Chromium's own
      // full-page capture drops the touch emulation while it draws, which would put the Blueprint
      // button (hidden on touch screens) into the phone shots.
      await page.setViewportSize({ width, height: Math.min(scrollHeight, 8000) });
      await page.waitForTimeout(150);
      await page.screenshot({ path: out });
      const row = { page: p, width, look, status, scrollWidth, sideways: scrollWidth > width, errors, file: path.relative(process.cwd(), out) };
      if (DIFF) {
        row.diff = await pixelDiff(out, path.join(DIFF, path.basename(out)));
        console.log(`${p} ${width} ${look}: ${typeof row.diff === 'number' ? `${row.diff}% of pixels changed` : row.diff}`);
      }
      report.push(row);
      await context.close();
    }
  } else {
    console.log(`No playwright in TOOLS_DIR: ${CHROMIUM} takes the light shots itself. Dark and bp looks need playwright-core.`);
    const run = promisify(execFile);
    for (const p of pages) for (const [width, height] of WIDTHS) {
      const out = file(p, width, 'light');
      await run(CHROMIUM, ['--headless=new', '--hide-scrollbars', `--window-size=${width},${height}`, `--screenshot=${out}`, site.url + p]);
      report.push({ page: p, width, look: 'light', fallback: true, status: null, scrollWidth: null, sideways: null, errors: [], file: path.relative(process.cwd(), out) });
    }
  }
} finally {
  if (browser) await browser.close();
  site.close();
}

await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
const bad = report.filter((r) => !r.fallback && (r.status !== 200 || r.sideways || r.errors.length));
for (const r of bad) {
  const why = [r.status !== 200 ? `status ${r.status}` : '', r.sideways ? `scrolls sideways (${r.scrollWidth} > ${r.width})` : '', ...r.errors].filter(Boolean).join('; ');
  console.log(`FAIL ${r.page} ${r.width} ${r.look}: ${why}`);
}
console.log(`${report.length} shots in ${path.relative(process.cwd(), OUT) || '.'}, ${bad.length} with problems; report in ${path.relative(process.cwd(), path.join(OUT, 'report.json'))}.`);
process.exit(bad.length ? 1 : 0);
