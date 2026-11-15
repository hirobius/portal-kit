# Client pages

## How a client page uses the kit

A client page is data only. All other parts come from a pinned release:

```html
<link rel="stylesheet" href="https://portal-kit-adrian-6234s-projects.vercel.app/releases/v7/theme.css" />
<script type="application/json" id="portal-data"> { ...client data... } </script>
<script src="https://portal-kit-adrian-6234s-projects.vercel.app/releases/v7/portal.js" defer></script>
```

- Do not put page-local CSS or scripts in a client page. If a client needs something the kit
  cannot express, add it to the kit and cut a release.
- `tools/check-portal.mjs` enforces this. Run it in the client repo. `--strict` also fails
  legacy keys.
- Add a `<main id="fallback">…</main>` with a plain "loading" message. The renderer removes it
  on load, so it shows only if the page cannot reach the kit.
- `clients/EXAMPLE-client-page.html` shows all of this.

## Start a new client portal

1. Copy `clients/EXAMPLE-client-page.html` into the client's repo as `index.html`. It is
   pinned to the latest release. Copy `releases/vN/tools/*.mjs` into the repo's `scripts/kit/`.
2. Fill in `#portal-data` in the canonical order: `status`, `updates`, `links`, `docs`, then
   optional kit blocks. See [data-shape.md](data-shape.md).
   - Put the client's links in `links.json` and run `node scripts/kit/sync-links.mjs`.
   - Put long documents in `<script type="text/markdown" id="...">` blocks and refer to them
     by `bodyId`.
   - Run `node scripts/kit/check-portal.mjs --strict` before every push.
3. Add a row to `clients/registry.json` (repo, pages, release, layout).
   `GITHUB_TOKEN=… node tools/check-clients.mjs` then shows each client whose page does not
   match the registry, or is behind the latest release.
4. Deploy the client repo as its own Vercel project with a password gate. The page gets the
   shared look, the theme switcher and Copy-for-AI with no more work.

## The password gate

The gate is shared (v20 and later).

- Copy the pattern at the top of `tools/gate.mjs` into `middleware.js`. It is config only.
  It loads `./scripts/kit/gate.mjs` with `import()`, so it works on the Edge and Node runtimes.
- Set `SITE_PASSWORD` in the Vercel project.
- If the site's `.vercelignore` excludes `scripts/`, include `scripts/kit/gate.mjs` again.
- Login looks: `variant` is `card` (default), `plain` or `split`.
