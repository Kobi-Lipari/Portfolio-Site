// Prints where the big blocks of a page land, for checking that the layout holds still while
// the demos load.
//
//   node build.mjs
//   TOOLS_DIR=~/node-tools node tools/measure.mjs dist / [390]
//
// Prints JSON: each selector below with its x, y, width and height (page pixels) at 1440 x 900,
// or at 390 x 844 when the third argument is 390. A selector the page does not have is null.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { launch, serve } from './browser.mjs';

const SELECTORS = ['.nav', '.hero', '.hero h1', '.hero__demo', '.proof', '.featured', '.about', '.footer', '.demo[data-demo="dash"]', '.demo[data-demo="scanner"]', '.sqlpad', '.sqlpad__editor', '.sqlpad__out', '.dash-stage'];
const [distArg = 'dist', pagePath = '/', widthArg = '1440'] = process.argv.slice(2);
const DIST = path.resolve(distArg);
if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error(`${distArg}/index.html is missing. Run \`node build.mjs\` first.`);
  process.exit(1);
}
const phone = widthArg === '390';
const viewport = phone ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const browser = await launch();
if (!browser) {
  console.error('measure needs playwright (or playwright-core) in TOOLS_DIR.');
  process.exit(1);
}
const site = await serve(DIST);
try {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', isMobile: phone, hasTouch: phone });
  const page = await context.newPage();
  const res = await page.goto(site.url + pagePath, { waitUntil: 'networkidle' });
  if (!res || res.status() !== 200) {
    console.error(`${pagePath} answered ${res ? res.status() : 'nothing'}.`);
    process.exit(1);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const boxes = await page.evaluate((selectors) => Object.fromEntries(selectors.map((s) => {
    const el = document.querySelector(s);
    if (!el) return [s, null];
    const b = el.getBoundingClientRect();
    const r = (n) => Math.round(n * 10) / 10;
    return [s, { x: r(b.left + window.scrollX), y: r(b.top + window.scrollY), width: r(b.width), height: r(b.height) }];
  })), SELECTORS);
  console.log(JSON.stringify(boxes, null, 2));
} finally {
  await browser.close();
  site.close();
}
