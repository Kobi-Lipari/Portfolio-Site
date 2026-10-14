// Tests for tools/sync-ewarn.mjs and the bar reader the page shares with it.
// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sync, formatReport, CHECKS, FILES, DEST, ShowcaseError } from './sync-ewarn.mjs';
import { readBar, readInterval, judge, barText } from '../src/ewarn-read.js';

// The smallest set of files that matches the contract.
const card = (over = {}) => ({
  weeks: [1, 2, 3, 4, 5], typical: [2, 2, 2, 2, 2], activeDays: 9, lastSeen: 2, firstTask: 'on time',
  registered: 30, credits: 60, attempts: 0, p: 0.2, withdrew: false, leftDay: null, ...over,
});
const valid = () => ({
  promises: {
    standin: false,
    planCommit: { sha: '1111111', date: '2026-01-01', url: '#' },
    testOpened: { sha: '2222222', date: '2026-01-03', url: '#' },
    items: [
      { id: 'auc', group: 'Prediction', promise: 'Test-term ROC AUC of at least 0.75.', result: '0.616 (95% CI 0.600 to 0.630).', status: 'missed' },
      { id: 'audit', group: 'Data', promise: 'Every check runs first.', result: 'All logged.', status: 'met' },
    ],
  },
  replay: {
    standin: false, term: '2014J', length: 100, cutoffs: [7, 14, 21, 28], warnDay: 28, highCut: 0.3, population: 50,
    risk: [10, -1, -1, -1, 20, 30, 40, 50, 5, 5, 5, 5], left: [10, null, 60], result: 'WPW',
  },
  beat: {
    standin: false, poolRate: 0.25, threshold: 0.3,
    cards: [card(), card(), card({ p: 0.4, withdrew: true, leftDay: 40 }), card(), card({ withdrew: true, leftDay: null }), card(), card(), card({ neverOnline: true, lastSeen: 58 })],
  },
  advising: {
    standin: false, n: 4, rate: 0.5,
    traits: { gender: ['Female', 'Male'], age_band: ['Under 35', '35 to 55'], disability: ['No', 'Yes'], imd_band: ['Low', 'High'] },
    score: [900, 500, 300, 100], withdrew: '1010', gender: '0101', age_band: '0011', disability: '0000', imd_band: '0110',
  },
  casefiles: {
    standin: false, total: 100,
    files: [
      { id: 'a', title: 'A', expected: 'e', found: 'f', decided: 'd', rows: 50, share: 0.5, changed: true },
      { id: 'b', title: 'B', expected: 'e', found: 'f', decided: 'd', rows: 80, share: 0.8, changed: false },
    ],
  },
});

async function folder(files, sub = '') {
  const dir = await mkdtemp(path.join(tmpdir(), 'ewarn-sync-'));
  const target = path.join(dir, sub);
  await mkdir(target, { recursive: true });
  for (const [name, data] of Object.entries(files)) await writeFile(path.join(target, `${name}.json`), JSON.stringify(data));
  return dir;
}
const empty = () => mkdtemp(path.join(tmpdir(), 'ewarn-dest-'));

test('copies five valid files byte for byte, then reports nothing to do', async (t) => {
  const from = await folder(valid());
  const to = await empty();
  t.after(() => Promise.all([rm(from, { recursive: true }), rm(to, { recursive: true })]));

  const first = await sync({ from, to });
  assert.deepEqual(first.report.map((r) => r.state), ['new', 'new', 'new', 'new', 'new']);
  assert.deepEqual((await readdir(to)).sort(), FILES.map((n) => `${n}.json`).sort());
  for (const name of FILES) {
    assert.equal(await readFile(path.join(to, `${name}.json`), 'utf8'), await readFile(path.join(from, `${name}.json`), 'utf8'));
  }
  const second = await sync({ from, to });
  assert.deepEqual(second.report.map((r) => r.state), ['unchanged', 'unchanged', 'unchanged', 'unchanged', 'unchanged']);
  assert.match(formatReport(second), /0 of 5 files changed/);
});

test('reads from reports/showcase inside a checkout of the analysis repo', async (t) => {
  const from = await folder(valid(), 'reports/showcase');
  const to = await empty();
  t.after(() => Promise.all([rm(from, { recursive: true }), rm(to, { recursive: true })]));
  const { dir, report } = await sync({ from, to });
  assert.equal(dir, path.join(from, 'reports', 'showcase'));
  assert.equal(report.length, 5);
});

test('reports what changed, including stand-in files replaced by real ones', async (t) => {
  const old = valid();
  old.promises.standin = true;
  old.promises.items[0].status = 'pending';
  const to = await folder(old);
  const from = await folder(valid());
  t.after(() => Promise.all([rm(from, { recursive: true }), rm(to, { recursive: true })]));
  const result = await sync({ from, to });
  const promises = result.report.find((r) => r.name === 'promises');
  assert.equal(promises.state, 'updated');
  assert.equal(promises.wasStandin, true);
  assert.equal(promises.before, '2 promises: 1 met, 0 missed, 1 pending');
  assert.equal(promises.summary, '2 promises: 1 met, 1 missed, 0 pending');
  assert.equal(result.report.filter((r) => r.state === 'unchanged').length, 4);
  assert.match(formatReport(result), /was stand-in, now real/);
});

test('refuses stand-in files unless asked, and copies nothing', async (t) => {
  const files = valid();
  files.replay.standin = true;
  const from = await folder(files);
  const to = await empty();
  t.after(() => Promise.all([rm(from, { recursive: true }), rm(to, { recursive: true })]));

  await assert.rejects(sync({ from, to }), (err) => err instanceof ShowcaseError && /replay\.json is a stand-in/.test(err.message));
  assert.deepEqual(await readdir(to), []);

  const allowed = await sync({ from, to, allowStandin: true });
  assert.deepEqual(allowed.standins, ['replay']);
  assert.equal((await readdir(to)).length, 5);
  assert.match(formatReport(allowed), /STAND-IN/);
});

test('a dry run checks and reports but copies nothing', async (t) => {
  const from = await folder(valid());
  const to = await empty();
  t.after(() => Promise.all([rm(from, { recursive: true }), rm(to, { recursive: true })]));
  const result = await sync({ from, to, dryRun: true });
  assert.deepEqual(await readdir(to), []);
  assert.match(formatReport(result), /5 of 5 files would change/);
});

const BROKEN = [
  ['a missing file', (f) => { delete f.advising; }, /advising\.json: not found/],
  ['a missing field', (f) => { delete f.beat.threshold; }, /beat: missing threshold/],
  ['an unknown status', (f) => { f.promises.items[1].status = 'passed'; }, /status "passed"/],
  ['a duplicate promise id', (f) => { f.promises.items[1].id = 'auc'; }, /duplicate id auc/],
  ['results before the test term was opened', (f) => { f.promises.testOpened = null; }, /testOpened is null/],
  ['a badge that contradicts its own estimate', (f) => { f.promises.items[0].status = 'met'; }, /marked met, but its estimate 0\.616 is outside/],
  ['risk scores that do not line up with students', (f) => { f.replay.risk.pop(); }, /risk has 11 values, expected 12/],
  ['a score after the student left', (f) => { f.replay.risk[1] = 12; }, /score after leaving/],
  ['an unknown outcome letter', (f) => { f.replay.result = 'WPX'; }, /unknown result letter/],
  ['a cut point that is not a probability', (f) => { f.replay.highCut = 28; }, /highCut is not a probability/],
  ['too few cards for a round', (f) => { f.beat.cards.length = 5; }, /fewer than 6 cards/],
  ['an unknown first-assignment value', (f) => { f.beat.cards[0].firstTask = 'early'; }, /firstTask "early"/],
  ['a leaving day for a student who stayed', (f) => { f.beat.cards[0].leftDay = 30; }, /leftDay set for a student who stayed/],
  ['a pool rate the cards do not have', (f) => { f.beat.poolRate = 0.194; }, /poolRate 0\.194 does not match the cards/],
  ['a neverOnline flag that is not true or false', (f) => { f.beat.cards[7].neverOnline = 'yes'; }, /neverOnline must be true or false/],
  ['a game cut point that differs from the warning list', (f) => { f.beat.threshold = 0.5; }, /threshold 0\.5 is not the High cut point/],
  ['a trait code with no label', (f) => { f.advising.gender = '0102'; }, /gender code 2 has no label/],
  ['columns of different lengths', (f) => { f.advising.score.push(1); }, /column lengths differ from n/],
  ['a rate the rows do not have', (f) => { f.advising.rate = 0.194; }, /rate 0\.194 does not match the rows/],
  ['case files out of order', (f) => { f.casefiles.files.reverse(); }, /not sorted changed-first/],
  ['a share that does not match its rows', (f) => { f.casefiles.files[0].share = 0.1; }, /share does not match rows/],
];
for (const [what, breakIt, message] of BROKEN) {
  test(`rejects ${what}, and copies nothing`, async (t) => {
    const files = valid();
    breakIt(files);
    const from = await folder(files);
    const to = await empty();
    t.after(() => Promise.all([rm(from, { recursive: true }), rm(to, { recursive: true })]));
    await assert.rejects(sync({ from, to }), (err) => {
      assert.ok(err instanceof ShowcaseError);
      assert.match(err.message, /^Nothing was copied/);
      assert.match(err.message, message);
      return true;
    });
    assert.deepEqual(await readdir(to), []);
  });
}

test('reads the declared bar and the interval out of the words', () => {
  assert.deepEqual(readBar('Test-term ROC AUC of at least 0.75.'), { lo: 0.75, hi: null });
  assert.deepEqual(readBar('Calibration slope between 0.8 and 1.2 on the test term.'), { lo: 0.8, hi: 1.2 });
  assert.deepEqual(readBar('Catch and false-alarm rates within 5 points across gender groups.'), { lo: null, hi: 5 });
  assert.equal(readBar('Groups under 100 students are shown but not judged.'), null);
  assert.deepEqual(readInterval('0.616 (95% CI 0.600 to 0.630).'), { est: 0.616, lo: 0.6, hi: 0.63 });
  assert.deepEqual(readInterval('Catch-rate gap 5.7 points (95% CI 1.9 to 10.1); false-alarm gap 5.0 points.'), { est: 5.7, lo: 1.9, hi: 10.1 });
  assert.equal(readInterval('All 15 checks logged; 11 changed the analysis.'), null);
  assert.equal(readInterval('0.9 (95% CI 1.0 to 1.1)'), null, 'an estimate outside its own interval is not drawn');
  assert.equal(barText({ lo: 0.8, hi: 1.2 }), '0.8 to 1.2');
  assert.equal(barText({ lo: 0.75, hi: null }), 'at least 0.75');
  assert.equal(barText({ lo: null, hi: 5 }), 'at most 5');
});

test('judges a bar on the estimate and says when the interval reaches across it', () => {
  const band = { lo: 0.8, hi: 1.2 };
  assert.deepEqual(judge(band, { est: 1.187, lo: 1.042, hi: 1.324 }), { estimate: true, crosses: true });
  assert.deepEqual(judge(band, { est: 1.0, lo: 0.9, hi: 1.1 }), { estimate: true, crosses: false });
  assert.deepEqual(judge({ lo: 0.75, hi: null }, { est: 0.616, lo: 0.6, hi: 0.63 }), { estimate: false, crosses: false });
  assert.deepEqual(judge({ lo: null, hi: 5 }, { est: 5.7, lo: 1.9, hi: 10.1 }), { estimate: false, crosses: true });
  assert.deepEqual(judge({ lo: null, hi: 5 }, { est: 18.7, lo: 12.8, hi: 35.8 }), { estimate: false, crosses: false });
});

test('the files committed in src/data/ewarn match the contract', async () => {
  for (const name of FILES) {
    const file = path.join(DEST, `${name}.json`);
    assert.ok(existsSync(file), `${name}.json is missing`);
    CHECKS[name](JSON.parse(await readFile(file, 'utf8')));
  }
});
