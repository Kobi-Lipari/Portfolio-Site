// Live demo of the scoresheet decoder on the scanner project page.
//
// The sheet is what the vision model returned for a handwritten copy of the
// Opera Game (Morphy, 1858), mistakes included: a B read as 8, an N read as
// H, a g read as q, missing capture and check marks, castling written with
// zeros, and move 14 never written down. The decoder is the real one from
// louisianachess.org/scanner, copied in by tools/vendor-decoder.mjs.
import { Chess } from './vendor/decoder/chess.js';

const cell = (raw, confidence = 'high') => ({ raw, confidence });
const SHEET = {
  header: { event: 'Paris Opera House', date: '1858', whiteName: 'Paul Morphy', blackName: 'Duke & Count', result: '1-0', legibility: 'partial' },
  rows: [
    { n: 1, white: cell('e4'), black: cell('e5') },
    { n: 2, white: cell('Nf3'), black: cell('d6') },
    { n: 3, white: cell('d4'), black: cell('8g4', 'medium') },
    { n: 4, white: cell('de5', 'medium'), black: cell('Bxf3') },
    { n: 5, white: cell('Qf3'), black: cell('dxe5') },
    { n: 6, white: cell('Bc4'), black: cell('Hf6', 'low') },
    { n: 7, white: cell('Qb3'), black: cell('Qe7') },
    { n: 8, white: cell('Nc3'), black: cell('c6') },
    { n: 9, white: cell('Bq5', 'medium'), black: cell('b5') },
    { n: 10, white: cell('Nxb5'), black: cell('cxb5') },
    { n: 11, white: cell('Bxb5'), black: cell('Nbd7') },
    { n: 12, white: cell('0-0-0'), black: cell('Rd8') },
    { n: 13, white: cell('Rxd7'), black: cell('Rxd7') },
    { n: 14, white: null, black: cell('Qe6') },
    { n: 15, white: cell('Bxd7+'), black: cell('Nxd7') },
    { n: 16, white: cell('Qb8+'), black: cell('Nxb8') },
    { n: 17, white: cell('Rd8++'), black: null },
  ],
};
const REAL_GAME_END = 'Rd8#';
const NEEDS_LOOK = new Set(['flagged', 'guessed']);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Decoding (Web Worker, main-thread fallback) ─────────────────────
let worker = null;
let nextId = 1;
const pending = new Map();
function decode(forcedSans) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    try {
      worker ??= new Worker(new URL('./demo-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        const job = pending.get(e.data.id);
        pending.delete(e.data.id);
        if (job) (e.data.ok ? job.resolve(e.data.game) : job.reject(new Error(e.data.error)));
      };
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, scan: SHEET, forcedSans });
    } catch {
      import('./vendor/decoder/decoder.js')
        .then(({ decodeScan }) => resolve(decodeScan(SHEET, forcedSans ? { forcedSans } : {})))
        .catch(reject);
    }
  });
}

// ── Board ───────────────────────────────────────────────────────────
const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FILES = 'abcdefgh';
const SVGNS = 'http://www.w3.org/2000/svg';

function drawBoard(svg, fen, lastMove) {
  const board = new Chess(fen).board();
  svg.replaceChildren();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const square = FILES[f] + (8 - r);
      const rect = document.createElementNS(SVGNS, 'rect');
      rect.setAttribute('x', f * 10); rect.setAttribute('y', r * 10);
      rect.setAttribute('width', 10); rect.setAttribute('height', 10);
      rect.setAttribute('class', `sq ${(r + f) % 2 ? 'sq--dark' : 'sq--light'}${lastMove && (lastMove.from === square || lastMove.to === square) ? ' sq--last' : ''}`);
      svg.append(rect);
      const piece = board[r][f];
      if (piece) {
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', f * 10 + 5); t.setAttribute('y', r * 10 + 5.6);
        t.setAttribute('class', `pc pc--${piece.color}`);
        t.textContent = GLYPH[piece.type] + '︎';
        svg.append(t);
      }
      if (f === 0) svg.append(coord(0.9, r * 10 + 2.4, String(8 - r), (r + f) % 2));
      if (r === 7) svg.append(coord(f * 10 + 8.9, 79.3, FILES[f], (r + f) % 2));
    }
  }
}
function coord(x, y, label, onDark) {
  const t = document.createElementNS(SVGNS, 'text');
  t.setAttribute('x', x); t.setAttribute('y', y);
  t.setAttribute('class', `coord${onDark ? ' coord--on-dark' : ''}`);
  t.textContent = label;
  return t;
}

/** Positions after each ply (index 0 = start), with the squares each move used. */
function replay(game) {
  const chess = new Chess();
  const steps = [{ fen: chess.fen(), last: null }];
  for (const m of game.moves) {
    const mv = chess.move(m.san);
    steps.push({ fen: chess.fen(), last: { from: mv.from, to: mv.to } });
  }
  return steps;
}

// ── UI ──────────────────────────────────────────────────────────────
function init(el) {
  el.innerHTML = `
    <div class="demo__head">
      <div>
        <p class="demo__eyebrow">TRY IT · RUNS IN YOUR BROWSER</p>
        <h2 class="demo__title">Decode a real scoresheet</h2>
        <p class="demo__lede">This is the decoder from the live scanner. On the left is what the vision model read from a handwritten copy of Morphy's Opera Game (1858), misreadings and all. Press decode and watch the rules of chess sort it out.</p>
      </div>
      <button type="button" class="demo__go" data-go>Decode this sheet</button>
    </div>
    <div class="demo__grid">
      <figure class="sheet" aria-label="The scoresheet as read by the vision model">
        <div class="sheet__head"><span>White <b>${SHEET.header.whiteName}</b></span><span>Black <b>${SHEET.header.blackName}</b></span></div>
        <table class="sheet__table">
          <thead><tr><th scope="col">#</th><th scope="col">White</th><th scope="col">Black</th></tr></thead>
          <tbody>${SHEET.rows.map((row) => `<tr><th scope="row">${row.n}</th>${['white', 'black'].map((side) => {
            const c = row[side];
            return `<td data-ply="${row.n * 2 - (side === 'white' ? 1 : 0)}"><span class="sheet__ink${c && c.confidence !== 'high' ? ' sheet__ink--unsure' : ''}">${c ? c.raw : ''}</span><span class="sheet__fix"></span></td>`;
          }).join('')}</tr>`).join('')}</tbody>
        </table>
        <figcaption>Result <b>${SHEET.header.result}</b> · <span class="sheet__legend"><i class="sheet__ink--unsure">underlined</i> = the model wasn't sure</span></figcaption>
      </figure>
      <div class="demo__right">
        <svg class="board" viewBox="0 0 80 80" role="img" aria-label="Chess board"></svg>
        <div class="demo__nav" role="group" aria-label="Step through the game">
          <button type="button" data-step="start" aria-label="Start">⏮</button>
          <button type="button" data-step="-1" aria-label="Previous move">◀</button>
          <span class="demo__pos" aria-live="polite">Start</span>
          <button type="button" data-step="1" aria-label="Next move">▶</button>
          <button type="button" data-step="end" aria-label="Last move">⏭</button>
        </div>
        <ol class="moves" aria-label="Decoded moves"></ol>
        <p class="demo__status" role="status" aria-live="polite">Press <b>Decode this sheet</b> to start.</p>
        <div class="picker" hidden></div>
      </div>
    </div>`;

  const goBtn = el.querySelector('[data-go]');
  const boardSvg = el.querySelector('.board');
  const movesOl = el.querySelector('.moves');
  const status = el.querySelector('.demo__status');
  const posLabel = el.querySelector('.demo__pos');
  const picker = el.querySelector('.picker');

  let game = null;
  let steps = [{ fen: new Chess().fen(), last: null }];
  let at = 0;
  let fixed = new Set();
  let busy = false;

  const label = (m) => `${Math.ceil(m.ply / 2)}${m.ply % 2 ? '.' : '…'} ${m.san}`;

  function show(ply) {
    at = Math.max(0, Math.min(ply, steps.length - 1));
    drawBoard(boardSvg, steps[at].fen, steps[at].last);
    const m = game?.moves[at - 1];
    posLabel.textContent = m ? label(m) : 'Start';
    boardSvg.setAttribute('aria-label', m ? `Board after ${label(m)}` : 'Starting position');
    movesOl.querySelectorAll('button').forEach((b) => b.classList.toggle('is-current', Number(b.dataset.ply) === at));
  }

  function annotateSheet(upTo) {
    el.querySelectorAll('.sheet td[data-ply]').forEach((td) => {
      const ply = Number(td.dataset.ply);
      const m = game?.moves[ply - 1];
      const fix = td.querySelector('.sheet__fix');
      td.className = '';
      fix.textContent = '';
      if (!m || ply > upTo) return;
      const raw = td.querySelector('.sheet__ink').textContent;
      if (fixed.has(ply)) { td.className = 'is-fixed'; fix.textContent = m.san; }
      else if (NEEDS_LOOK.has(m.status)) { td.className = 'is-look'; fix.textContent = m.san + '?'; }
      else if (m.san !== raw) { td.className = 'is-corrected'; fix.textContent = m.san; }
    });
  }

  function renderMoves(upTo = Infinity) {
    movesOl.replaceChildren();
    game.moves.forEach((m) => {
      if (m.ply > upTo) return;
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.ply = String(m.ply);
      const look = NEEDS_LOOK.has(m.status) && !fixed.has(m.ply);
      b.className = `mv${look ? ' mv--look' : ''}${fixed.has(m.ply) ? ' mv--fixed' : ''}${!look && !fixed.has(m.ply) && m.status === 'corrected' ? ' mv--corrected' : ''}`;
      b.textContent = label(m);
      b.setAttribute('aria-label', `${label(m)}${look ? ', needs a look' : ''}. Change this move`);
      b.addEventListener('click', () => openPicker(m));
      li.append(b);
      movesOl.append(li);
    });
  }

  function summarize() {
    const looks = game.moves.filter((m) => NEEDS_LOOK.has(m.status) && !fixed.has(m.ply));
    const last = game.moves[game.moves.length - 1];
    if (last?.san === REAL_GAME_END) {
      status.innerHTML = '<b>That’s the real game.</b> Morphy mates on d8. One correction was enough: fixing move 14 let the decoder re-read the ending.'
        + (looks.length
          ? ` The ${looks.length === 1 ? 'amber move left is' : `${looks.length} amber moves left are`} right too; the decoder flags corrections it isn't sure of so a person can confirm them.`
          : '');
      status.className = 'demo__status is-good';
    } else if (looks.length) {
      const blank = looks.find((m) => m.sourceRaw === null);
      status.innerHTML = blank
        ? `Move ${Math.ceil(blank.ply / 2)} was left blank, so the decoder had to guess (<b>${label(blank)}</b>), and the ending no longer fits. Tap that move and pick the right one. Hint: the rook goes to d1.`
        : `<b>${looks.length}</b> ${looks.length === 1 ? 'move needs' : 'moves need'} a look. Tap one to fix it.`;
      status.className = 'demo__status is-look';
    } else {
      status.textContent = 'Every move checked.';
      status.className = 'demo__status';
    }
  }

  async function run(forcedSans) {
    if (busy) return;
    busy = true;
    goBtn.disabled = true;
    status.className = 'demo__status';
    status.textContent = forcedSans ? 'Re-reading the rest of the game…' : 'Decoding…';
    try {
      const started = performance.now();
      game = await decode(forcedSans);
      steps = replay(game);
      const ms = Math.round(performance.now() - started);
      if (!forcedSans && !reduceMotion) {
        // Play the moves in, so the corrections land one by one.
        for (let ply = 1; ply <= game.moves.length; ply++) {
          renderMoves(ply);
          annotateSheet(ply);
          show(ply);
          await new Promise((r) => setTimeout(r, 110));
        }
      }
      renderMoves();
      annotateSheet(Infinity);
      show(game.moves.length);
      summarize();
      if (!forcedSans) status.innerHTML = `<span class="demo__time">Decoded in ${ms} ms.</span> ` + status.innerHTML;
      goBtn.textContent = 'Start over';
    } catch {
      status.textContent = 'Something went wrong running the decoder in this browser.';
    } finally {
      busy = false;
      goBtn.disabled = false;
    }
  }

  function openPicker(m) {
    if (busy) return;
    const legal = new Chess(m.fenBefore).moves();
    const order = (san) => { const i = 'KQRBNO'.indexOf(san[0]); return i === -1 ? 6 : i; };
    legal.sort((a, b) => order(a) - order(b) || a.localeCompare(b));
    const likely = [...new Set([m.san, ...m.alternatives.map((a) => a.san)])].filter((s) => legal.includes(s)).slice(0, 4);
    picker.hidden = false;
    picker.innerHTML = `
      <div class="picker__head">
        <p><b>${label(m)}</b> · ${m.sourceRaw === null ? 'blank on the sheet' : `written “${m.sourceRaw}”`}</p>
        <button type="button" class="picker__close" aria-label="Close">✕</button>
      </div>
      <p class="picker__sub">Most likely</p>
      <div class="picker__row">${likely.map((s) => `<button type="button" data-san="${s}" class="${s === m.san ? 'is-current' : ''}">${s === m.san ? 'Keep ' + s : s}</button>`).join('')}</div>
      <p class="picker__sub">Every legal move here</p>
      <div class="picker__row picker__row--all">${legal.map((s) => `<button type="button" data-san="${s}">${s}</button>`).join('')}</div>`;
    picker.querySelector('.picker__close').addEventListener('click', () => { picker.hidden = true; });
    picker.querySelectorAll('[data-san]').forEach((b) => b.addEventListener('click', () => fix(m, b.dataset.san)));
    picker.querySelector('.picker__row button')?.focus();
    show(m.ply - 1);
  }

  async function fix(m, san) {
    picker.hidden = true;
    fixed = new Set([...fixed].filter((p) => p < m.ply));
    fixed.add(m.ply);
    if (game.moves[m.ply - 1].san === san) { renderMoves(); annotateSheet(Infinity); summarize(); return; }
    await run([...game.moves.slice(0, m.ply - 1).map((x) => x.san), san]);
  }

  goBtn.addEventListener('click', () => {
    fixed = new Set();
    picker.hidden = true;
    run(null);
  });
  el.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
    const s = b.dataset.step;
    show(s === 'start' ? 0 : s === 'end' ? steps.length - 1 : at + Number(s));
  }));
  boardSvg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(at + 1);
    if (e.key === 'ArrowLeft') show(at - 1);
  });
  show(0);
}

const root = document.querySelector('[data-demo="scanner"]');
if (root) init(root);
