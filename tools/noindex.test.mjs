// The index switch: the default build can be indexed and has a sitemap; NOINDEX=1 puts a
// noindex tag on every page and turns crawlers away in robots.txt.
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
const NOINDEX_TAG = '<meta name="robots" content="noindex, nofollow">';

async function build(env = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'site-'));
  await cp(path.join(ROOT, 'build.mjs'), path.join(dir, 'build.mjs'));
  await cp(path.join(ROOT, 'src'), path.join(dir, 'src'), { recursive: true });
  await new Promise((resolve, reject) => execFile(process.execPath, ['build.mjs'], { cwd: dir, env: { ...process.env, PREVIEW: '', NOINDEX: '', ...env } },
    (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve())));
  const pages = [];
  const walk = async (d) => { for (const e of await readdir(d, { withFileTypes: true })) { if (e.isDirectory()) await walk(path.join(d, e.name)); else if (e.name.endsWith('.html') && !d.includes(`${path.sep}vendor`)) pages.push(path.join(d, e.name)); } };
  await walk(path.join(dir, 'dist'));
  return { dir, dist: path.join(dir, 'dist'), pages };
}

test('the default build is indexable: no noindex tag except on the 404 page, a sitemap, an open robots.txt', async () => {
  const { dir, dist, pages } = await build();
  try {
    assert.ok(pages.length >= 3);
    for (const file of pages) {
      const html = await readFile(file, 'utf8');
      assert.equal(html.includes(NOINDEX_TAG), path.basename(file) === '404.html', file);
    }
    const robots = await readFile(path.join(dist, 'robots.txt'), 'utf8');
    assert.match(robots, /^Allow: \/$/m);
    assert.doesNotMatch(robots, /^Disallow: \/$/m);
    assert.match(robots, /^Sitemap: https:\/\/\S+\/sitemap\.xml$/m);
    const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8');
    assert.equal((sitemap.match(/<loc>/g) || []).length, pages.length - 1, 'every page but the 404 is in the sitemap');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('NOINDEX=1 marks every page noindex, disallows all crawlers and writes no sitemap', async () => {
  const { dir, dist, pages } = await build({ NOINDEX: '1' });
  try {
    for (const file of pages) assert.ok((await readFile(file, 'utf8')).includes(NOINDEX_TAG), file);
    assert.equal(await readFile(path.join(dist, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
    assert.equal(existsSync(path.join(dist, 'sitemap.xml')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
