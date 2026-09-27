# KobiLipari.com

Portfolio site for Kobi Lipari: plain HTML, CSS and JavaScript, no dependencies.

## Edit content

- **Projects:** `src/projects.mjs`. Each project has a `lane` (`"build"` or `"design"`), a short `note` for the homepage list, and case-study `sections`.
- **Homepage, nav, footer, about:** `build.mjs` (search for the text you want to change). Contact links are in the `SITE` object at the top.
- **Styles:** `src/styles.css`. Colors live as variables at the top.
- **Hero seam behavior:** `src/seam.js`.

Anything in `[square brackets]` is a placeholder. It shows with a dashed orange underline so it's easy to find.

## Build

Requires Node 18 or newer (no `npm install` needed).

```
node build.mjs            # writes the site into dist/
PREVIEW=1 node build.mjs  # relative links, for opening files locally or preview hosts
```

To view locally: `npx serve dist` or `python -m http.server --directory dist`, then open http://localhost:8000.

## Deploy on Cloudflare

1. Push this folder to a GitHub repo.
2. In Cloudflare, create a Workers project from the repo (static assets).
   - Build command: `node build.mjs`
   - Output / assets directory: `dist`
3. Put your résumé at `src/resume.pdf`; the build copies it into the site.
4. Once the domain is bought, attach `kobilipari.com` under the project's custom domains.
