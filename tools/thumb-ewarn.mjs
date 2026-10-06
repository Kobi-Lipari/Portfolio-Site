// Makes the card thumbnail for the withdrawal project from the page's own
// replay chart: the end-of-term dot plot, its caption and the tally tiles.
//
//   node build.mjs
//   TOOLS_DIR=<folder where playwright and sharp are installed> node tools/thumb-ewarn.mjs
//
// Writes src/img/thumb-ewarn.webp (960 x 600) and thumb-ewarn-sm.webp (480 x 300).
// Playwright and sharp are not dependencies of this site; install them anywhere
// (npm i playwright sharp) and point TOOLS_DIR at that folder. Re-run after the
// data in src/data/ewarn changes.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PAGE = 'work/withdrawal-early-warning/';
if (!existsSync(path.join(DIST, PAGE, 'index.html'))) {
  console.error('The page is not in dist/. Run `node build.mjs` first (it leaves the page out while the data is stand-in).');
  process.exit(1);
}
const require = createRequire(path.join(path.resolve(process.env.TOOLS_DIR || ROOT), 'noop.js'));
const { chromium } = require('playwright');
const sharp = require('sharp');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  let p = path.normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (p.endsWith(path.sep)) p += 'index.html';
  try {
    const body = await readFile(path.join(DIST, p));
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));

const browser = await chromium.launch();
try {
  // Reduced motion: the replay draws each state at once instead of animating to it.
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto(`http://127.0.0.1:${server.address().port}/${PAGE}`);
  await page.locator('#replay').scrollIntoViewIfNeeded();
  const scrub = page.locator('#replay input[type=range]');
  await scrub.waitFor();
  await scrub.evaluate((el) => { el.value = el.max; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.evaluate(() => document.fonts.ready);
  const stage = page.locator('#replay .ew-replay__stage');
  await stage.scrollIntoViewIfNeeded();
  const box = await stage.evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.left + window.scrollX, y: b.top + window.scrollY, width: b.width, height: b.height }; });
  // Skip the label row above the dots, then take a 16:10 frame: the chart first, with its
  // caption and tiles below (cards crop the picture from the top, so the chart always shows).
  const clip = { x: box.x, y: box.y + box.height * 0.16, width: box.width, height: box.width / 1.6 };
  const png = await page.screenshot({ clip, fullPage: true });
  for (const [name, w, h] of [['thumb-ewarn', 960, 600], ['thumb-ewarn-sm', 480, 300]]) {
    await sharp(png).resize(w, h, { fit: 'cover', position: 'top' }).webp({ quality: 86 }).toFile(path.join(ROOT, 'src', 'img', `${name}.webp`));
    console.log(`wrote src/img/${name}.webp (${w} x ${h})`);
  }
} finally {
  await browser.close();
  server.close();
}
