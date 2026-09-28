// Runs the scanner's decoder off the main thread for the demo, so the page
// keeps animating while a game decodes (about half a second on a laptop,
// longer on a phone).
import { decodeScan } from './vendor/decoder/decoder.js';

self.onmessage = (event) => {
  const { id, scan, forcedSans } = event.data;
  try {
    self.postMessage({ id, ok: true, game: decodeScan(scan, forcedSans ? { forcedSans } : {}) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message ? err.message : err) });
  }
};
