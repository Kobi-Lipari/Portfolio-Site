// Makes the picture that link previews show (Open Graph / Twitter card), the touch icon and
// favicon.ico, from the site's own design: the homepage headline, the fonts in
// src/vendor/fonts and the colours in src/styles.css.
//
//   node build.mjs
//   TOOLS_DIR=<folder where playwright is installed> node tools/share-image.mjs
//
// Writes src/img/og.png (1200 x 630), src/img/apple-touch-icon.png (180 x 180) and
// src/favicon.ico (32 x 32). Playwright is not a dependency of this site; install it anywhere
// (npm i playwright) and point TOOLS_DIR at that folder. Re-run after the headline, the
// role line or the headshot changes.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = path.join(ROOT, 'dist/index.html');
if (!existsSync(home)) {
  console.error('dist/index.html is missing. Run `node build.mjs` first.');
  process.exit(1);
}
const require = createRequire(path.join(path.resolve(process.env.TOOLS_DIR || ROOT), 'noop.js'));
const { chromium } = require('playwright');

// The words come from the built homepage, so the picture never disagrees with the site.
const html = await readFile(home, 'utf8');
const pick = (re) => (html.match(re) || [])[1] || '';
const headline = pick(/<h1>([\s\S]*?)<\/h1>/);
const name = pick(/<p class="hero__name">([^<]*)</);
const role = pick(/<p class="hero__role">([^<]*)</);
const host = pick(/<link rel="canonical" href="https?:\/\/([^/"]+)/);

const data = async (file, type) => `data:${type};base64,${(await readFile(path.join(ROOT, file))).toString('base64')}`;
const face = async (family, file, style = 'normal', weight = '400') =>
  `@font-face { font-family: '${family}'; font-style: ${style}; font-weight: ${weight}; src: url(${await data(`src/vendor/fonts/${file}.woff2`, 'font/woff2')}) format('woff2'); }`;
const fonts = (await Promise.all([
  face('Geist', 'geist-latin-wght-normal', 'normal', '400 600'),
  face('Geist Mono', 'geist-mono-latin-400-normal'),
  face('Instrument Serif', 'instrument-serif-latin-400-normal'),
  face('Instrument Serif', 'instrument-serif-latin-400-italic', 'italic'),
])).join('\n');
const photo = existsSync(path.join(ROOT, 'src/img/headshot-sm.webp')) ? await data('src/img/headshot-sm.webp', 'image/webp') : null;

// The mark from the favicon: the before/after seam of the hero, navy on the left, paper on the right.
const mark = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32"><rect width="16" height="32" fill="#0E2438"/><rect x="16" width="16" height="32" fill="#F3EEE6"/><rect x="15" width="2" height="32" fill="#C8553A"/></svg>`;

const card = `<!doctype html><meta charset="utf-8"><style>
${fonts}
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; display: flex; background: #F3EEE6; color: #15171C; font-family: 'Geist', sans-serif; -webkit-font-smoothing: antialiased; }
.text { flex: 1; min-width: 0; padding: 60px 0 54px 72px; display: flex; flex-direction: column; justify-content: space-between; }
.me { display: flex; align-items: center; gap: 22px; }
.me img { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; }
.name { font-size: 30px; font-weight: 600; }
.role { margin-top: 6px; font-family: 'Geist Mono', monospace; font-size: 17px; letter-spacing: 0.08em; text-transform: uppercase; color: #6A6358; }
h1 { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: 124px; line-height: 0.96; letter-spacing: -0.01em; }
.host { font-family: 'Geist Mono', monospace; font-size: 20px; color: #4A4D55; }
.seam { width: 264px; position: relative; background: #0E2438;
  background-image: repeating-linear-gradient(0deg, rgba(127, 182, 240, 0.12) 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, rgba(127, 182, 240, 0.12) 0 1px, transparent 1px 24px); }
.seam::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: #C8553A; }
.seam::after { content: ''; position: absolute; left: -25px; top: 50%; width: 56px; height: 56px; margin-top: -28px; border-radius: 50%; background: #FFFFFF; border: 3px solid #C8553A; }
</style>
<div class="text">
  <div class="me">${photo ? `<img src="${photo}" alt="">` : ''}<div><p class="name">${name}</p><p class="role">${role}</p></div></div>
  <h1>${headline}</h1>
  <p class="host">${host}</p>
</div>
<div class="seam"></div>`;

const browser = await chromium.launch();
const shoot = async (content, width, height) => {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(content);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  await page.close();
  return png;
};
const icon = (size) => `<!doctype html><style>* { margin: 0; } body { width: ${size}px; height: ${size}px; } svg { display: block; }</style>${mark(size)}`;
const og = await shoot(card, 1200, 630);
const touch = await shoot(icon(180), 180, 180);
const small = await shoot(icon(32), 32, 32);
await browser.close();

// favicon.ico: one 32 x 32 PNG in an ICO wrapper (6-byte header, one 16-byte entry, the PNG).
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
ico.writeUInt8(32, 6); ico.writeUInt8(32, 7); ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(small.length, 14); ico.writeUInt32LE(22, 18);

await writeFile(path.join(ROOT, 'src/img/og.png'), og);
await writeFile(path.join(ROOT, 'src/img/apple-touch-icon.png'), touch);
await writeFile(path.join(ROOT, 'src/favicon.ico'), Buffer.concat([ico, small]));
console.log(`Wrote src/img/og.png (${og.length} bytes), src/img/apple-touch-icon.png (${touch.length} bytes), src/favicon.ico (${small.length + 22} bytes).`);
