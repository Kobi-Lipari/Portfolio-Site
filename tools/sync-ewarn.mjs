// Brings the five data files behind the withdrawal project page in from a
// checkout of the analysis repo, after checking them.
//
//   node tools/sync-ewarn.mjs [path-to-withdrawal-early-warning] [--allow-standin] [--dry-run]
//
// The path can be the repo (the files are read from reports/showcase/ inside
// it) or the folder that holds the files. Default: ../withdrawal-early-warning
// next to this repo.
//
// Every file is checked against the shape the page reads before anything is
// copied (the same checks as ewarn/showcase.py in the analysis repo, plus the
// few things only the page depends on). If one file fails, none is copied.
// Stand-in files, made to design the page before the analysis ran, are
// refused unless --allow-standin is given. --dry-run checks and reports
// without copying.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readBar, readInterval, judge } from '../src/ewarn-read.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEST = path.join(ROOT, 'src', 'data', 'ewarn');
export const FILES = ['promises', 'replay', 'beat', 'advising', 'casefiles'];
const TRAITS = ['gender', 'age_band', 'disability', 'imd_band'];
const STATUSES = new Set(['met', 'missed', 'pending']);
const RESULT_LETTERS = new Set('WFPD');
const FIRST_TASK = new Set(['on time', 'late', 'not submitted', 'none due']);

export class ShowcaseError extends Error {}

const need = (cond, msg) => { if (!cond) throw new ShowcaseError(msg); };
const keys = (obj, names, where) => {
  need(obj !== null && typeof obj === 'object' && !Array.isArray(obj), `${where}: not an object`);
  const missing = names.filter((k) => !(k in obj));
  need(missing.length === 0, `${where}: missing ${missing.join(', ')}`);
};
const commit = (c, where) => {
  keys(c, ['sha', 'date', 'url'], where);
  need(typeof c.sha === 'string' && c.sha.length > 0, `${where}: sha is empty`);
  need(/^\d{4}-\d{2}-\d{2}$/.test(c.date), `${where}: date ${JSON.stringify(c.date)} is not YYYY-MM-DD`);
};

export const CHECKS = {
  promises(d) {
    keys(d, ['standin', 'planCommit', 'testOpened', 'items'], 'promises');
    commit(d.planCommit, 'promises.planCommit');
    for (const k of ['rulesCommit', 'freezeCommit']) if (d[k] != null) commit(d[k], `promises.${k}`);
    if (d.testOpened !== null) commit(d.testOpened, 'promises.testOpened');
    need(Array.isArray(d.items) && d.items.length > 0, 'promises: no items');
    const ids = new Set();
    for (const it of d.items) {
      keys(it, ['id', 'group', 'promise', 'result', 'status'], `promises item ${it?.id}`);
      need(STATUSES.has(it.status), `promises item ${it.id}: status ${JSON.stringify(it.status)}`);
      need(!ids.has(it.id), `promises: duplicate id ${it.id}`);
      ids.add(it.id);
      // Where a bar and an interval both read cleanly the page draws them, so
      // the drawing has to agree with the badge next to it.
      const bar = readBar(it.promise);
      const iv = readInterval(it.result);
      if (bar && iv && it.status !== 'pending' && !d.standin) {
        need(judge(bar, iv).estimate === (it.status === 'met'),
          `promises item ${it.id}: marked ${it.status}, but its estimate ${iv.est} is ${it.status === 'met' ? 'outside' : 'inside'} the declared bar`);
      }
    }
    if (d.items.some((it) => it.status !== 'pending')) need(d.testOpened !== null, 'promises: results given but testOpened is null');
  },

  replay(d) {
    keys(d, ['standin', 'term', 'length', 'cutoffs', 'warnDay', 'highCut', 'population', 'risk', 'left', 'result'], 'replay');
    const n = d.result.length;
    const k = d.cutoffs.length;
    need(n > 0, 'replay: no students');
    need(d.cutoffs.includes(d.warnDay), 'replay: warnDay is not one of the cutoffs');
    need(d.cutoffs.every((c, i) => i === 0 || c > d.cutoffs[i - 1]), 'replay: cutoffs are not in ascending order');
    need(d.length > d.warnDay, 'replay: the term is no longer than the warning day');
    need(d.risk.length === n * k, `replay: risk has ${d.risk.length} values, expected ${n * k}`);
    need(d.left.length === n, 'replay: left and result differ in length');
    need([...d.result].every((ch) => RESULT_LETTERS.has(ch)), 'replay: unknown result letter');
    need(d.risk.every((r) => r === -1 || (r >= 0 && r <= 100)), 'replay: risk outside 0-100');
    need(d.highCut > 0 && d.highCut < 1, 'replay: highCut is not a probability');
    for (let i = 0; i < n; i++) {
      const left = d.left[i];
      d.cutoffs.forEach((day, j) => {
        const gone = left !== null && left < day;
        need((d.risk[i * k + j] === -1) === gone, `replay: student ${i} has a score after leaving, or none while enrolled`);
      });
    }
  },

  beat(d) {
    keys(d, ['standin', 'poolRate', 'threshold', 'cards'], 'beat');
    need(Array.isArray(d.cards) && d.cards.length >= 6, 'beat: fewer than 6 cards');
    need(d.threshold > 0 && d.threshold < 1, 'beat: threshold is not a probability');
    d.cards.forEach((c, i) => {
      keys(c, ['weeks', 'typical', 'activeDays', 'lastSeen', 'firstTask', 'registered', 'credits', 'attempts', 'p', 'withdrew', 'leftDay'], `beat card ${i}`);
      need(c.weeks.length === 5 && c.typical.length === 5, `beat card ${i}: weeks must be pre + 4 weeks`);
      need(FIRST_TASK.has(c.firstTask), `beat card ${i}: firstTask ${JSON.stringify(c.firstTask)}`);
      need(c.p >= 0 && c.p <= 1, `beat card ${i}: p outside 0-1`);
      need(typeof c.withdrew === 'boolean', `beat card ${i}: withdrew must be true or false`);
      need(c.withdrew || c.leftDay === null, `beat card ${i}: leftDay set for a student who stayed`);
      need(c.neverOnline === undefined || typeof c.neverOnline === 'boolean', `beat card ${i}: neverOnline must be true or false`);
    });
    // The page states the pool's withdrawal rate, so it has to be the cards' own.
    const rate = d.cards.filter((c) => c.withdrew).length / d.cards.length;
    need(Math.abs(rate - d.poolRate) < 0.005, `beat: poolRate ${d.poolRate} does not match the cards (${rate.toFixed(3)})`);
  },

  advising(d) {
    keys(d, ['standin', 'n', 'rate', 'traits', 'score', 'withdrew', ...TRAITS], 'advising');
    const n = d.n;
    need(d.score.length === n && d.withdrew.length === n, 'advising: column lengths differ from n');
    need([...d.withdrew].every((ch) => ch === '0' || ch === '1'), 'advising: withdrew must be 0/1');
    need(d.score.every((s) => s >= 0 && s <= 999), 'advising: score outside 0-999');
    for (const t of TRAITS) {
      need(d[t].length === n, `advising: ${t} length differs from n`);
      need(Array.isArray(d.traits[t]), `advising: no labels for ${t}`);
      const top = Math.max(...[...d[t]].map((ch) => parseInt(ch, 36)));
      need(top < d.traits[t].length, `advising: ${t} code ${top} has no label`);
    }
    const rate = [...d.withdrew].filter((ch) => ch === '1').length / n;
    need(Math.abs(rate - d.rate) < 0.001, `advising: rate ${d.rate} does not match the rows (${rate.toFixed(4)})`);
  },

  casefiles(d) {
    keys(d, ['standin', 'total', 'files'], 'casefiles');
    need(Array.isArray(d.files) && d.files.length > 0, 'casefiles: no files');
    for (const f of d.files) {
      keys(f, ['id', 'title', 'expected', 'found', 'decided', 'rows', 'share', 'changed'], `casefile ${f?.id}`);
      need(typeof f.changed === 'boolean', `casefile ${f.id}: changed must be true or false`);
      need(Math.abs(f.share - f.rows / d.total) < 1e-3, `casefile ${f.id}: share does not match rows / total`);
    }
    const sorted = d.files.every((f, i) => i === 0 || (() => {
      const a = d.files[i - 1];
      return a.changed === f.changed ? a.rows >= f.rows : a.changed;
    })());
    need(sorted, 'casefiles: not sorted changed-first, then by rows affected');
  },
};

// One line on what a file holds, for the report.
const count = (items, status) => items.filter((it) => it.status === status).length;
const SUMMARY = {
  promises: (d) => `${d.items.length} promises: ${count(d.items, 'met')} met, ${count(d.items, 'missed')} missed, ${count(d.items, 'pending')} pending`,
  replay: (d) => `${d.result.length} students from ${d.term}, High risk at ${(100 * d.highCut).toFixed(1)}%`,
  beat: (d) => `${d.cards.length} cards, ${(100 * d.poolRate).toFixed(1)}% withdrew, model says "leaves" at ${(100 * d.threshold).toFixed(1)}%`,
  advising: (d) => `${d.n} students, ${(100 * d.rate).toFixed(1)}% withdrew`,
  casefiles: (d) => `${d.files.length} checks, ${d.files.filter((f) => f.changed).length} changed the analysis`,
};
const summarise = (name, data) => { try { return SUMMARY[name](data); } catch { return 'not readable'; } };

export async function sync({ from, to = DEST, allowStandin = false, dryRun = false } = {}) {
  const dir = existsSync(path.join(from, 'reports', 'showcase')) ? path.join(from, 'reports', 'showcase') : from;
  const incoming = {};
  const problems = [];
  for (const name of FILES) {
    try {
      const text = await readFile(path.join(dir, `${name}.json`), 'utf8');
      const data = JSON.parse(text);
      CHECKS[name](data);
      incoming[name] = { text, data };
    } catch (err) {
      problems.push(`${name}.json: ${err.code === 'ENOENT' ? `not found in ${dir}` : err.message}`);
    }
  }
  const standins = FILES.filter((name) => incoming[name]?.data.standin);
  if (!problems.length && !standins.length) {
    // The page calls the game's cut point the model's High-risk group, so the
    // two files have to carry the same cut point.
    if (incoming.beat.data.threshold !== incoming.replay.data.highCut) {
      problems.push(`beat.json: threshold ${incoming.beat.data.threshold} is not the High cut point in replay.json (${incoming.replay.data.highCut})`);
    }
  }
  if (problems.length) throw new ShowcaseError(`Nothing was copied.\n  ${problems.join('\n  ')}`);
  if (standins.length && !allowStandin) {
    throw new ShowcaseError(`Nothing was copied: ${standins.map((n) => `${n}.json`).join(', ')} ${standins.length === 1 ? 'is a stand-in' : 'are stand-ins'}, not the real analysis.\n  Pass --allow-standin to copy anyway; the production build then leaves the page out.`);
  }

  const report = [];
  for (const name of FILES) {
    const target = path.join(to, `${name}.json`);
    const { text, data } = incoming[name];
    const before = existsSync(target) ? await readFile(target, 'utf8') : null;
    let was = null;
    try { was = before === null ? null : JSON.parse(before); } catch { was = {}; }
    const state = before === null ? 'new' : before === text ? 'unchanged' : 'updated';
    report.push({
      name, state, standin: Boolean(data.standin), wasStandin: Boolean(was?.standin),
      summary: summarise(name, data), before: was && state === 'updated' ? summarise(name, was) : null,
    });
    if (!dryRun && state !== 'unchanged') {
      await mkdir(to, { recursive: true });
      await writeFile(target, text);
    }
  }
  return { dir, report, standins, dryRun };
}

export function formatReport({ dir, report, standins, dryRun }) {
  const lines = [`From ${dir}`];
  for (const r of report) {
    const flag = r.standin ? ' (STAND-IN)' : r.wasStandin ? ' (was stand-in, now real)' : '';
    lines.push(`  ${`${r.name}.json`.padEnd(15)} ${r.state.padEnd(9)} ${r.summary}${flag}`);
    if (r.before && r.before !== r.summary) lines.push(`  ${''.padEnd(15)} ${'was'.padEnd(9)} ${r.before}`);
  }
  const changed = report.filter((r) => r.state !== 'unchanged').length;
  lines.push(dryRun
    ? `Dry run: ${changed} of ${report.length} files would change. Nothing was copied.`
    : `${changed} of ${report.length} files changed.${changed ? ' Rebuild with `node build.mjs`.' : ''}`);
  if (standins.length) lines.push('Stand-in data: the production build leaves the page out until the real files are synced.');
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const unknown = [...flags].filter((f) => !['--allow-standin', '--dry-run'].includes(f));
  const paths = args.filter((a) => !a.startsWith('--'));
  if (unknown.length || paths.length > 1) {
    console.error('usage: node tools/sync-ewarn.mjs [path-to-withdrawal-early-warning] [--allow-standin] [--dry-run]');
    process.exit(2);
  }
  const from = path.resolve(paths[0] || path.join(ROOT, '..', 'withdrawal-early-warning'));
  try {
    const result = await sync({ from, allowStandin: flags.has('--allow-standin'), dryRun: flags.has('--dry-run') });
    let head = '';
    try { head = execFileSync('git', ['-C', result.dir, 'log', '-1', '--format=%h %s'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* not a git checkout */ }
    console.log(formatReport(result));
    if (head) console.log(`Analysis repo at: ${head}`);
  } catch (err) {
    if (!(err instanceof ShowcaseError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}
