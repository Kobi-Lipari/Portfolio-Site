// Reads the numeric bars out of promises.json. Shared by the page
// (demo-ewarn.js) and the checks in tools/sync-ewarn.mjs, so the tool tests
// exactly what the page will draw.
//
// A promise such as "Test-term ROC AUC of at least 0.75." declares a bar. A
// result such as "0.616 (95% CI 0.600 to 0.630)." gives the estimate and its
// interval. Text that doesn't read cleanly returns null, and the page then
// shows the words alone.

const NUM = '(-?\\d+(?:\\.\\d+)?)';

// The passing range a promise declares: { lo, hi }, either end may be null.
export function readBar(promise) {
  let m = new RegExp(`between ${NUM} and ${NUM}`).exec(promise);
  if (m) return { lo: Number(m[1]), hi: Number(m[2]) };
  m = new RegExp(`at least ${NUM}`).exec(promise);
  if (m) return { lo: Number(m[1]), hi: null };
  m = new RegExp(`within ${NUM} points`).exec(promise);
  if (m) return { lo: null, hi: Number(m[1]) };
  return null;
}

// The first estimate with a 95% interval in a result: { est, lo, hi }.
export function readInterval(result) {
  const m = new RegExp(`${NUM}(?: points)? \\(95% CI ${NUM} to ${NUM}\\)`).exec(result);
  if (!m) return null;
  const [est, lo, hi] = m.slice(1).map(Number);
  return lo <= est && est <= hi ? { est, lo, hi } : null;
}

// Where an estimate and its interval sit against a bar. The plan judges a bar
// on the estimate; `crosses` says the interval reaches the other side of it.
export function judge(bar, iv) {
  const inside = (v) => (bar.lo == null || v >= bar.lo) && (bar.hi == null || v <= bar.hi);
  const estimate = inside(iv.est);
  const whole = inside(iv.lo) && inside(iv.hi);
  const some = (bar.lo == null || iv.hi >= bar.lo) && (bar.hi == null || iv.lo <= bar.hi);
  return { estimate, crosses: estimate ? !whole : some };
}

// "at least 0.75", "0.8 to 1.2", "at most 5"
export function barText(bar) {
  if (bar.lo != null && bar.hi != null) return `${bar.lo} to ${bar.hi}`;
  return bar.lo != null ? `at least ${bar.lo}` : `at most ${bar.hi}`;
}
