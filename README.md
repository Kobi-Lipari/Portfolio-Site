# KobiLipari.com

Portfolio site for Kobi Lipari: plain HTML, CSS and JavaScript, no dependencies.

## Edit content

- **Projects:** `src/projects.mjs`. Each project has a `lane` (`"build"` or `"design"`), a short `note` for the homepage list, and case-study `sections`.
- **Homepage, nav, footer, about:** `build.mjs` (search for the text you want to change). Contact links are in the `SITE` object at the top.
- **Styles:** `src/styles.css`. Colors live as variables at the top.
- **Hero:** the Admissions before/after from the dashboards project (`src/demo-dash.js` with `data-mode="hero"`).

Anything in `[square brackets]` is a placeholder. The live build leaves placeholders out (and drops a case-study section or timeline that is only a placeholder); `DRAFT=1 node build.mjs` shows them with a dashed orange underline so they're easy to find.

## Interactive pieces

- **Blueprint mode** (press `B`, or the ruler button): the page switches to its own build drawing, with sizes, type and spacing labelled and hover-to-inspect on anything. `src/site.js`, styles under "Blueprint mode" in `src/styles.css`.
- **Command palette** (`Ctrl/⌘ K` or `/`): jump to any project, section or live site, copy the email address. Its entries are built per page by `siteIndex()` in `build.mjs`.
- **Dark theme:** follows the system setting until the visitor picks one with the moon/sun button. Colors are the variables under "Dark theme" in `src/styles.css`.
- **Scanner decoder demo** (scanner project page): the real decoder from the LCA site, running in the browser on a noisy transcription of the Opera Game. `src/demo-scanner.js` and `src/demo-worker.js`; the decoder itself is in `src/vendor/decoder/`.
- **Withdrawal project page:** five pieces, each filled from its own JSON file in `src/data/ewarn/`: the plan against the result, a replayed term, a guessing game against the model, an advising simulator and the data-check case files. `src/demo-ewarn.js` (and `src/ewarn-read.js`, which reads the declared bars out of the plan's wording), styles under "Withdrawal project" in `src/styles.css`. See "Refreshing the withdrawal page's data" below.
- **SQL playground** (retention project page): SQLite in the browser (sql.js, `src/vendor/sqljs/`, MIT) over synthetic cohort data. `src/demo-sql.js`. Chart colors were checked for colorblind separation and contrast on the light, dark and blueprint backgrounds.

A project gets a demo by setting `demo: "scanner"` or `demo: "sql"` in `src/projects.mjs`.

### Refreshing the decoder demo

When the scanner's decoder changes in the LCA website repo, copy it in again (needs Node 22.13+ and a checkout of chess.js at the version the LCA site uses):

```
git clone --branch v1.4.0 --depth 1 https://github.com/jhlywa/chess.js.git /tmp/chess.js
node tools/vendor-decoder.mjs ../lca-website /tmp/chess.js
```

### Refreshing the withdrawal page's data

The five pieces on the withdrawal project page read five small JSON files in `src/data/ewarn/`, written by the analysis repo (`ewarn/showcase.py` there describes them). When the analysis changes, bring them in again (needs Node 22):

```
node tools/sync-ewarn.mjs ../withdrawal-early-warning
```

The path is a checkout of the analysis repo (the files are read from `reports/showcase/` inside it); that path is also the default. The tool checks every file against the shape the page reads before it copies anything, copies nothing if one of them fails, and prints what changed. Add `--dry-run` to check without copying.

Stand-in files (made to design the page before the analysis ran, marked `"standin": true`) are refused unless you pass `--allow-standin`. Stand-in numbers are never published: if one of the files in `src/data/ewarn/` is a stand-in, `node build.mjs` stops with an error and writes nothing, so a deploy fails and the live site keeps its last good version. To publish the rest of the site without the project (no page, no card, no palette entry, no data files), run `HOLD_BACK=1 node build.mjs`. `PREVIEW=1` builds always show the project, under a "Stand-in data" banner.

The page's links into the analysis repo (code, plan, commits) are off while that repo is private: commit IDs show as plain text. Set `repoIsPublic: true` on the project in `src/projects.mjs` once it is public.

The homepage card's picture is made from the page's replay chart: `TOOLS_DIR=<folder with playwright and sharp installed> node tools/thumb-ewarn.mjs` after a build.

`node --test` runs the tool's tests, and checks that the committed files match the contract.

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
