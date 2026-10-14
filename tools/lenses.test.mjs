// The lens pages (/analyst/, /dev/): each exists, is self-canonical and in the sitemap; the
// root page has the two doors and the lens pages have the audience note; every proof chip is a
// link; and once the parts a lens is allowed to change are taken out, the three pages are the
// same page. A PREVIEW=1 build keeps the lens pages' relative paths at the right depth.
// Each test builds a throwaway copy of the site. Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://kobilipari.com';

async function build(env = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'site-'));
  await cp(path.join(ROOT, 'build.mjs'), path.join(dir, 'build.mjs'));
  await cp(path.join(ROOT, 'src'), path.join(dir, 'src'), { recursive: true });
  await new Promise((resolve, reject) => execFile(process.execPath, ['build.mjs'], { cwd: dir, env: { ...process.env, PREVIEW: '', NOINDEX: '', DRAFT: '', ...env } },
    (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve())));
  const pages = [];
  const walk = async (d) => { for (const e of await readdir(d, { withFileTypes: true })) { if (e.isDirectory()) await walk(path.join(d, e.name)); else if (e.name.endsWith('.html') && !d.includes(`${path.sep}vendor`)) pages.push(path.join(d, e.name)); } };
  await walk(path.join(dir, 'dist'));
  return { dir, dist: path.join(dir, 'dist'), pages };
}

// What a lens may change, taken out before the three pages are compared.
const sameLens = (html) => html
  .replace(/href="\/(analyst|dev)\//g, 'href="/')
  .replace(/<head>[\s\S]*?<\/head>/, '')
  .replace(/ data-lens="[^"]*"/g, '')
  .replace(/<div class="lens-banner"[\s\S]*?<\/div>/, '')
  .replace(/<p class="hero__role">[^<]*<\/p>/, '')
  .replace(/<h1>[\s\S]*?<\/h1>/, '')
  .replace(/<p class="hero__pitch">[^<]*<\/p>/, '')
  .replace(/<p class="hero__recruiter only-sm">[^<]*<\/p>/, '')
  .replace(/<ul class="proof[\s\S]*?<\/ul>/, '')
  .replace(/<nav class="doors"[\s\S]*?<\/nav>/, '')
  .replace(/<section class="featured"[\s\S]*?<\/section>/, '')
  .replace(/<section class="more"[\s\S]*?<\/section>/, '')
  .replace(/<dt>TOOLS<\/dt><dd>[^<]*<\/dd>/, '')
  .replace(/<p class="footer__sub">[^<]*<\/p>/, '')
  .replace(/href="[^"]*resume[^"]*"/g, '')
  .replace(/\s+/g, ' ');

test('the lens pages exist, are self-canonical, are in the sitemap, and differ from the root page only where a lens may', async () => {
  const { dir, dist, pages } = await build();
  try {
    const html = {};
    for (const [key, file] of [['root', 'index.html'], ['analyst', 'analyst/index.html'], ['dev', 'dev/index.html']]) {
      assert.ok(existsSync(path.join(dist, file)), file);
      html[key] = await readFile(path.join(dist, file), 'utf8');
    }
    assert.ok(html.analyst.includes(`<link rel="canonical" href="${SITE}/analyst/">`));
    assert.ok(html.dev.includes(`<link rel="canonical" href="${SITE}/dev/">`));
    const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8');
    assert.ok(sitemap.includes(`<loc>${SITE}/analyst/</loc>`));
    assert.ok(sitemap.includes(`<loc>${SITE}/dev/</loc>`));

    for (const [key, page] of Object.entries(html)) {
      const proof = page.match(/<ul class="proof[\s\S]*?<\/ul>/)[0];
      const items = proof.match(/<li[\s\S]*?<\/li>/g);
      assert.ok(items.length >= 3, `${key}: a proof strip with chips`);
      for (const li of items) assert.ok(li.includes('<a '), `${key}: every chip is a link: ${li}`);
      assert.equal(page.includes('class="doors"'), key === 'root', `${key}: the doors are on the root page only`);
      assert.equal(page.includes('class="lens-banner"'), key !== 'root', `${key}: the audience note is on the lens pages only`);
    }
    assert.ok(html.analyst.includes('<ul class="proof proof--ledger"'));
    assert.ok(!html.dev.includes('proof--ledger'));
    assert.ok(html.analyst.includes('<html lang="en" data-lens="analyst">') && html.analyst.includes('<body data-lens="analyst">'));
    assert.ok(html.dev.includes('<html lang="en" data-lens="dev">') && html.dev.includes('<body data-lens="dev">'));
    assert.ok(!html.root.includes('data-lens='));

    assert.equal(sameLens(html.analyst), sameLens(html.root), 'the analyst page is the root page apart from what a lens may change');
    assert.equal(sameLens(html.dev), sameLens(html.root), 'the developer page is the root page apart from what a lens may change');

    for (const file of pages) {
      const page = await readFile(file, 'utf8');
      assert.doesNotMatch(page, /href="(#)?"/, `${file}: no empty link`);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('PREVIEW=1 keeps the lens pages\' data and scripts at the right depth', async () => {
  const { dir, dist } = await build({ PREVIEW: '1' });
  try {
    const analyst = await readFile(path.join(dist, 'analyst', 'index.html'), 'utf8');
    assert.ok(analyst.includes('data-base="../"'));
    assert.ok(analyst.includes('src="../demo-dash.js"'));
    assert.ok(analyst.includes('<a class="nav__name" href="index.html">'));
    assert.ok(analyst.includes('href="index.html#work"'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
