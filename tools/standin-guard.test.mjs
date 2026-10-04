// What the build does with the withdrawal project: published with real data,
// never with stand-in data, and with no links into a private repo.
// Each test builds a throwaway copy of the site. Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = 'withdrawal-early-warning';
const REPO = 'github.com/Kobi-Lipari/withdrawal-early-warning';

async function siteCopy(t, { standin = false, edit } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'site-build-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(path.join(ROOT, 'build.mjs'), path.join(dir, 'build.mjs'));
  await cp(path.join(ROOT, 'src'), path.join(dir, 'src'), { recursive: true });
  if (standin) {
    const file = path.join(dir, 'src', 'data', 'ewarn', 'beat.json');
    await writeFile(file, JSON.stringify({ ...JSON.parse(await readFile(file, 'utf8')), standin: true }));
  }
  if (edit) await edit(dir);
  return dir;
}
const build = (dir, env = {}) => new Promise((resolve) => {
  const clean = { ...process.env, ...env };
  for (const k of ['PREVIEW', 'DRAFT', 'HOLD_BACK']) if (!(k in env)) delete clean[k];
  execFile(process.execPath, ['build.mjs'], { cwd: dir, env: clean }, (err, stdout, stderr) => resolve({ code: err ? err.code : 0, out: stdout + stderr }));
});
const read = (dir, file) => readFile(path.join(dir, 'dist', file), 'utf8');
async function pages(dir, folder = 'dist') {
  const out = [];
  for (const entry of await readdir(path.join(dir, folder), { withFileTypes: true })) {
    const rel = path.join(folder, entry.name);
    if (entry.isDirectory() && !['vendor', 'img', 'data'].includes(entry.name)) out.push(...await pages(dir, rel));
    else if (entry.name.endsWith('.html')) out.push(await readFile(path.join(dir, rel), 'utf8'));
  }
  return out;
}

test('with the real data, the production build publishes the page, first among the featured work', async (t) => {
  const dir = await siteCopy(t);
  const { code, out } = await build(dir);
  assert.equal(code, 0, out);
  assert.ok(existsSync(path.join(dir, 'dist', 'work', SLUG, 'index.html')));
  assert.deepEqual((await readdir(path.join(dir, 'dist', 'data', 'ewarn'))).sort(), ['advising.json', 'beat.json', 'casefiles.json', 'promises.json', 'replay.json']);
  assert.ok(existsSync(path.join(dir, 'dist', 'ewarn-read.js')));
  const home = await read(dir, 'index.html');
  const featured = home.slice(home.indexOf('class="featured"'), home.indexOf('class="more"'));
  assert.equal([...featured.matchAll(/href="\/work\/([^/]+)\/"/g)].map((m) => m[1])[0], SLUG);
  assert.equal([...featured.matchAll(/<li>/g)].length, 3, 'featured work stays at three cards');
  assert.match(await read(dir, 'work/index.html'), new RegExp(`/work/${SLUG}/`));
  const page = await read(dir, `work/${SLUG}/index.html`);
  assert.doesNotMatch(page, /\[[A-Z][^\]]*\]/, 'no placeholder text is left on the page');
  assert.doesNotMatch(page, /class="todo"/);
});

test('a stand-in file stops the production build before anything is written', async (t) => {
  const dir = await siteCopy(t, { standin: true });
  const { code, out } = await build(dir);
  assert.equal(code, 1);
  assert.match(out, /stand-in numbers must not be published/);
  assert.match(out, /sync-ewarn\.mjs/);
  assert.equal(existsSync(path.join(dir, 'dist')), false);
});

test('missing data files stop the production build too', async (t) => {
  const dir = await siteCopy(t, { edit: (d) => rm(path.join(d, 'src', 'data', 'ewarn'), { recursive: true }) });
  const { code, out } = await build(dir);
  assert.equal(code, 1);
  assert.match(out, /stand-in or missing/);
});

test('HOLD_BACK=1 builds the rest of the site with no trace of the project', async (t) => {
  const dir = await siteCopy(t, { standin: true });
  const { code, out } = await build(dir, { HOLD_BACK: '1' });
  assert.equal(code, 0, out);
  assert.match(out, /Skipping "Who's About to Withdraw\?"/);
  assert.equal(existsSync(path.join(dir, 'dist', 'work', SLUG)), false);
  assert.equal(existsSync(path.join(dir, 'dist', 'data', 'ewarn')), false);
  for (const html of await pages(dir)) assert.equal(html.includes(SLUG), false, 'no page links to the project or lists it in the palette');
  const home = await read(dir, 'index.html');
  const featured = home.slice(home.indexOf('class="featured"'), home.indexOf('class="more"'));
  assert.deepEqual([...featured.matchAll(/href="\/work\/([^/]+)\/"/g)].map((m) => m[1]), ['tableau-dashboards', 'lca-website', 'scoresheet-scanner']);
});

test('a preview build shows the project even with stand-in data', async (t) => {
  const dir = await siteCopy(t, { standin: true });
  const { code, out } = await build(dir, { PREVIEW: '1' });
  assert.equal(code, 0, out);
  assert.ok(existsSync(path.join(dir, 'dist', 'work', SLUG, 'index.html')));
  assert.equal(JSON.parse(await read(dir, 'data/ewarn/beat.json')).standin, true, 'the page reads this flag and shows its stand-in banner');
});

test('links into the analysis repo stay out of every page until repoIsPublic is switched on', async (t) => {
  const dir = await siteCopy(t);
  assert.equal((await build(dir)).code, 0);
  for (const html of await pages(dir)) {
    assert.equal(html.includes(REPO), false, 'no link into the private repo');
    assert.doesNotMatch(html, /<a\b[^>]*href="#?"/, 'no link that goes nowhere');
  }
  assert.doesNotMatch(await read(dir, `work/${SLUG}/index.html`), /data-repo-links/);

  const projects = path.join(dir, 'src', 'projects.mjs');
  const source = await readFile(projects, 'utf8');
  assert.equal(source.split('repoIsPublic: false').length, 2, 'one switch, off by default');
  await writeFile(projects, source.replace('repoIsPublic: false', 'repoIsPublic: true'));
  assert.equal((await build(dir)).code, 0);
  const page = await read(dir, `work/${SLUG}/index.html`);
  assert.match(page, /data-repo-links="on"/);
  assert.match(page, new RegExp(`href="https://${REPO}"[^>]*>Code &amp; notebooks`));
  assert.match(page, new RegExp(`href="https://${REPO}/blob/main/ANALYSIS_PLAN\\.md"[^>]*>Analysis plan`));
  assert.match(await read(dir, 'index.html'), new RegExp(REPO), 'the command palette lists the repo links');
});
