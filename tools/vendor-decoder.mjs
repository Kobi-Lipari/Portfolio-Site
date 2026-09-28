// Copies the scoresheet decoder from the LCA website repo into this site as
// plain browser JavaScript, for the live demo on the scanner project page.
//
//   node tools/vendor-decoder.mjs <path-to-lca-website> <path-to-chess.js-checkout>
//
// The decoder is TypeScript and depends on chess.js. Both are converted by
// stripping the types (Node's built-in stripper, no build tools needed) and
// pointing imports at the neighbouring .js files, so the browser loads them
// as ordinary ES modules. The output is committed: the site's own build
// doesn't need either repo. Re-run this when the decoder changes.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';

const [lcaRepo, chessRepo] = process.argv.slice(2);
if (!lcaRepo || !chessRepo) {
  console.error('usage: node tools/vendor-decoder.mjs <lca-website repo> <chess.js repo>');
  process.exit(1);
}

const OUT = 'src/vendor/decoder';
await mkdir(OUT, { recursive: true });

const DECODER_FILES = ['types', 'confusionMatrix', 'normalize', 'candidates', 'chessAdapter', 'decoder'];

function toBrowserJs(ts) {
  return stripTypeScriptTypes(ts, { mode: 'strip' })
    .replace(/from\s+'chess\.js'/g, "from './chess.js'")
    .replace(/from\s+'(\.\/[^'.]+)'/g, "from '$1.js'");
}

for (const name of DECODER_FILES) {
  const src = path.join(lcaRepo, 'src/lib/scanner', `${name}.ts`);
  const js = toBrowserJs(await readFile(src, 'utf8'));
  await writeFile(path.join(OUT, `${name}.js`), `// Generated from lca-website src/lib/scanner/${name}.ts by tools/vendor-decoder.mjs. Do not edit.\n${js}`);
}

// chess.js: its source plus a stand-in for the PGN parser, which the
// decoder never uses (it only writes PGN, never reads it).
const chess = toBrowserJs(await readFile(path.join(chessRepo, 'src/chess.ts'), 'utf8'));
await writeFile(path.join(OUT, 'chess.js'), `// chess.js (https://github.com/jhlywa/chess.js), BSD-2-Clause, see chess.js.LICENSE.\n// Types stripped by tools/vendor-decoder.mjs. Do not edit.\n${chess}`);
await writeFile(path.join(OUT, 'pgn.js'), `// Stand-in for chess.js's generated PGN parser; the demo never parses PGN.\nexport function parse() { throw new Error('PGN parsing is not included in this build'); }\n`);
await copyFile(path.join(chessRepo, 'LICENSE'), path.join(OUT, 'chess.js.LICENSE'));

console.log(`Wrote ${DECODER_FILES.length + 2} modules to ${OUT}/`);
