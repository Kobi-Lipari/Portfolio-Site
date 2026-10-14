// The browser the tools in this folder share: tools/shoot.mjs, tools/measure.mjs,
// tools/share-image.mjs and tools/thumb-ewarn.mjs. Playwright is not a dependency of the
// site; install it anywhere (npm i playwright sharp, or playwright-core) and point TOOLS_DIR
// at that folder. The browser itself is the system Chromium (/usr/bin/chromium, or
// CHROMIUM=<path>): no bundled browser is downloaded.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CHROMIUM = process.env.CHROMIUM || '/usr/bin/chromium';
export const TOOLS_DIR = path.resolve(process.env.TOOLS_DIR || ROOT);
// Loads a package installed in TOOLS_DIR (playwright, sharp); throws when it is not there.
export const requireTool = createRequire(path.join(TOOLS_DIR, 'noop.js'));

// Playwright's chromium, launched headless on the system browser; null when neither
// playwright nor playwright-core is installed in TOOLS_DIR (the caller falls back or stops).
export async function launch() {
  let chromium;
  try {
    ({ chromium } = requireTool('playwright'));
  } catch {
    try { ({ chromium } = requireTool('playwright-core')); } catch { return null; }
  }
  return chromium.launch({ executablePath: CHROMIUM, headless: true });
}

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.xml': 'application/xml', '.txt': 'text/plain',
};

// Serves a built site folder on a free local port (browsers block the demos' scripts on
// file:// pages). Returns { url, close }.
export async function serve(dir) {
  const server = http.createServer(async (req, res) => {
    let p = path.normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (p.endsWith(path.sep)) p += 'index.html';
    try {
      const body = await readFile(path.join(dir, p));
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}
