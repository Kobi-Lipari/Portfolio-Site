# KobiLipari.com

Portfolio site for Kobi Lipari: plain HTML, CSS and JavaScript, no dependencies.

## Edit content

- **Projects:** `src/projects.mjs`. Each project has a `lane` (`"build"` or `"design"`), a short `note` for the homepage list, and case-study `sections`.
- **Homepage, nav, footer, about:** `build.mjs` (search for the text you want to change). Contact links are in the `SITE` object at the top.
- **Styles:** `src/styles.css`. Colors live as variables at the top.
- **Hero seam behavior:** `src/seam.js`.

Anything in `[square brackets]` is a placeholder. It shows with a dashed orange underline so it's easy to find.

## Interactive pieces

- **Blueprint mode** (press `B`, or the ruler button): the page switches to its own build drawing, with sizes, type and spacing labelled and hover-to-inspect on anything. `src/site.js`, styles under "Blueprint mode" in `src/styles.css`.
- **Command palette** (`Ctrl/⌘ K` or `/`): jump to any project, section or live site, copy the email address. Its entries are built per page by `siteIndex()` in `build.mjs`.
- **Dark theme:** follows the system setting until the visitor picks one with the moon/sun button. Colors are the variables under "Dark theme" in `src/styles.css`.
- **Scanner decoder demo** (scanner project page): the real decoder from the LCA site, running in the browser on a noisy transcription of the Opera Game. `src/demo-scanner.js` and `src/demo-worker.js`; the decoder itself is in `src/vendor/decoder/`.
- **SQL playground** (retention project page): SQLite in the browser (sql.js, `src/vendor/sqljs/`, MIT) over synthetic cohort data. `src/demo-sql.js`. Chart colors were checked for colorblind separation and contrast on the light, dark and blueprint backgrounds.

A project gets a demo by setting `demo: "scanner"` or `demo: "sql"` in `src/projects.mjs`.

### Refreshing the decoder demo

When the scanner's decoder changes in the LCA website repo, copy it in again (needs Node 22.13+ and a checkout of chess.js at the version the LCA site uses):

```
git clone --branch v1.4.0 --depth 1 https://github.com/jhlywa/chess.js.git /tmp/chess.js
node tools/vendor-decoder.mjs ../lca-website /tmp/chess.js
```

## Build

Requires Node 18 or newer (no `npm install` needed).

```
node build.mjs            # writes the site into dist/
PREVIEW=1 node build.mjs  # relative links, for opening files locally or preview hosts
```

To view locally: `npx serve dist` or `python -m http.server --directory dist`, then open http://localhost:8000. The two demos need this (browsers block their scripts on `file://` pages).

## Deploy on Cloudflare

1. Push this folder to a GitHub repo.
2. In Cloudflare, create a Workers project from the repo. `wrangler.jsonc` points it at `dist`.
   - Build command: `node build.mjs`
   - Output / assets directory: `dist`
3. Put your résumé at `src/resume.pdf`; the build copies it into the site.
4. Once the domain is bought, attach `kobilipari.com` under the project's custom domains.
