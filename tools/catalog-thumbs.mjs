// Makes the card thumbnail for each dashboard in the catalog: a 560 px wide WebP of its first
// page, written next to the page screenshots as src/img/dashboards/<slug>/thumb.webp.
//
//   TOOLS_DIR=<folder where sharp is installed> node tools/catalog-thumbs.mjs
//
// Reads src/data/dashboards/catalog.json (the kit's records) and the screenshots the kit put in
// src/img/dashboards/<slug>/. Dashboards without screenshots (internal ones, and the public ones
// whose new design is not published yet) get no thumbnail. Re-run after new screenshots land.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(path.resolve(process.env.TOOLS_DIR || ROOT), 'noop.js'));
const sharp = require('sharp');

const { dashboards } = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', 'dashboards', 'catalog.json'), 'utf8'));
let n = 0;
for (const d of dashboards) {
  const first = d.screenshots?.[0]?.file;
  if (!first) continue;
  const src = path.join(ROOT, 'src', 'img', 'dashboards', d.slug, path.basename(first));
  if (!existsSync(src)) { console.error(`missing ${src}`); continue; }
  await sharp(src).resize(560).webp({ quality: 80 }).toFile(path.join(ROOT, 'src', 'img', 'dashboards', d.slug, 'thumb.webp'));
  n++;
}
console.log(`wrote ${n} thumbnails under src/img/dashboards/`);
