// The dashboards catalog: thirty cards, twelve thumbnails for the dashboards live in the new
// design, links only to public dashboards on Nicholls' Tableau Public profile (never to an
// internal one, never to the office's live Dashboard Catalog), and every internal dashboard
// marked as sample data. Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function build() {
  const dir = await mkdtemp(path.join(tmpdir(), 'site-'));
  await cp(path.join(ROOT, 'build.mjs'), path.join(dir, 'build.mjs'));
  await cp(path.join(ROOT, 'src'), path.join(dir, 'src'), { recursive: true });
  await new Promise((resolve, reject) => execFile(process.execPath, ['build.mjs'], { cwd: dir, env: { ...process.env, PREVIEW: '', DRAFT: '', NOINDEX: '', HOLD_BACK: '' } },
    (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve())));
  return dir;
}

test('the dashboards page carries the whole catalog, and links only where it may', async () => {
  const dir = await build();
  try {
    const html = await readFile(path.join(dir, 'dist', 'work', 'tableau-dashboards', 'index.html'), 'utf8');
    const { dashboards } = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', 'dashboards', 'catalog.json'), 'utf8'));
    const cards = html.match(/<li class="card card--catalog"[\s\S]*?<\/li>/g) || [];
    assert.equal(cards.length, 30, 'thirty cards');
    assert.equal(dashboards.length, 30);
    assert.equal((html.match(/\/thumb\.webp"/g) || []).length, 12, 'twelve thumbnails, one per dashboard live in the new design');
    assert.equal(dashboards.filter((d) => d.live?.design_live_now === 'new').length, 12);

    const links = [...html.matchAll(/href="(https:\/\/public\.tableau\.com[^"]*)"/g)].map((m) => m[1]);
    const allowed = new Set(dashboards.filter((d) => d.show_as === 'live embed').map((d) => d.live.profile_url));
    for (const href of links) assert.ok(allowed.has(href), `a link to a public dashboard only: ${href}`);
    assert.equal(links.length, allowed.size, 'every public dashboard is linked once');
    assert.ok(!links.some((h) => /DashboardCatalog/i.test(h)), 'no link to the live Dashboard Catalog');
    for (const d of dashboards.filter((x) => x.show_as !== 'live embed')) assert.ok(!d.live?.profile_url, `${d.slug} has no public address to link`);

    for (const card of cards) {
      const slug = card.match(/data-dash="([^"]+)"/)[1];
      const d = dashboards.find((x) => x.slug === slug);
      assert.ok(d, slug);
      if (d.show_as === 'sample copy') {
        assert.match(card, /sample data/, `${slug} says sample data`);
        assert.doesNotMatch(card, /href=/, `${slug} has no link`);
        assert.doesNotMatch(card, /<img/, `${slug} shows no picture`);
      }
      if (slug === 'dashboard-catalog') {
        assert.match(card, /01-all-dashboards\.webp/, 'the Dashboard Catalog shows its first screenshot');
        assert.doesNotMatch(card, /href=/, 'the Dashboard Catalog has no link');
      }
      for (const img of card.match(/<img[^>]*>/g) || []) {
        assert.match(img, /loading="lazy"/, `${slug} image is lazy`);
        assert.match(img, /width="\d+" height="\d+"/, `${slug} image has a size`);
        assert.match(img, /alt="[^"]+"/, `${slug} image has alt text`);
      }
    }
    assert.doesNotMatch(html, /Eight dashboards are on it/, 'the old count is gone');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
