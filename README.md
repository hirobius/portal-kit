# Hirobius Portal Kit

The **single source of truth** for the visual style, structure, and behavior of
every client status portal, current and future. A client
page ships only *data*; this kit renders it. Edit the theme or renderer here
once, redeploy, and every client page updates on next load — no per-project
reinvention.

## What's here

- **`theme.css`** — the whole design system: Satoshi type (embedded as a data
  URI so it works cross-origin), status pills, owner chips, elevated cards,
  light/dark, responsive. Its color/spacing/radius/accent tokens are an **alias
  layer over the Hirobius Design System** (see Design tokens below); restyle the
  brand in hds, restyle portal-kit's own components here.
- **`vendor/hds-tokens.css`** — the hds token source, vendored (generated; do not
  hand-edit). `theme.css` `@import`s it.
- **`scripts/`** — `check-tokens.mjs` (integrity gate) and `sync-hds-tokens.mjs`
  (re-vendor from hds); see Design tokens.
- **`portal.js`** — the shared renderer. It builds the entire page from a
  client's JSON data block, so structure and behavior are shared too.
- **`index.html`** — a live demo rendering sample data through the kit.
- **`clients/EXAMPLE-client-page.html`** — copy this to start a new client page.
- **`fonts/`** — self-hosted Satoshi source (the CSS embeds it; these stay for
  reference and for pages that link the font directly).
- **`vercel.json`** — CORS headers for the fonts + a short cache on `theme.css`
  and `portal.js` so edits propagate within ~5 minutes.

## How a client page uses it

A client page owns only its content. Everything else comes from here:

```html
<link rel="stylesheet" href="https://<portal-kit-host>/theme.css" />
<script type="application/json" id="portal-data"> { ...client data... } </script>
<script src="https://<portal-kit-host>/portal.js" defer></script>
```

Add a `<main id="fallback">…</main>` with a plain "loading" message; the renderer
removes it on load, so it only shows if the kit can't reach the page. See
`clients/EXAMPLE-client-page.html`.

## Design tokens (from the Hirobius Design System)

portal-kit no longer hand-authors its palette. The one DTCG source in
[`hirobius/hds`](https://github.com/hirobius/hds) drives every surface:

- `hds` generates `tokens.css`; it's vendored here at **`vendor/hds-tokens.css`**
  (with a provenance header — never hand-edit it).
- **`theme.css`** `@import`s that file and maps portal-kit's compact names onto it,
  e.g. `--ink: var(--semantic-color-content-primary)`, `--accent: var(--semantic-accent-rest)`.
  Change the brand in hds and it sweeps every client portal on next load.
- **Dark mode** follows hds's `[data-theme="dark"]` attribute; `portal.js` sets it
  from the viewer's system preference (or the theme toggle). Aliased tokens flip
  automatically; only a few portal-local extras (owner chips, the translucent
  scrim, the fixed font-size ramp) carry their own dark values.
- **Re-sync** when hds changes: `node scripts/sync-hds-tokens.mjs` (needs
  `GITHUB_TOKEN` with hds read). **`node scripts/check-tokens.mjs`** guards that
  every referenced hds var resolves; CI runs it in `.github/workflows/token-drift.yml`.

## Spin up a new client portal

1. Copy `clients/EXAMPLE-client-page.html` into the new client's repo as
   `index.html`; point the two `<...portal-kit-host...>` URLs at this deployed kit.
2. Fill in the `#portal-data` JSON — client name, subtitle, and the `sections`
   you want (see below). Put long-form documents in
   `<script type="text/markdown" id="...">` blocks and reference them by `bodyId`.
3. Deploy the client repo (its own Vercel project + password gate). Done — it
   inherits the shared look, the theme switcher, and Copy-for-AI automatically.

## Data shape

Top level:

```json
{
  "client": "Client Name",
  "subtitle": "optional subtitle",
  "lastUpdated": "2026-01-01",
  "header":   { "eyebrow": false, "livelyHeading": true },
  "progress": true,
  "parties":  [{ "label": "Client", "cls": "a" }, { "label": "Hirobius", "cls": "b" }],
  "copyForAI":{ "mode": "generic", "placement": ["top", "footer"] },
  "sections": [ "...ordered, typed sections..." ],
  "contact":  { "name": "", "email": "you@example.com" },
  "footer":   { "lines": ["Prepared by …", "City, ST"] }
}
```

If you omit `sections`, a **simple** layout is synthesized from top-level
`phases` / `updates` / `accordions` / `docs` — enough for a documents-and-status
portal.

### Section types

Each section is `{ "type": "...", "id": "...", "title": "...", ... }`. `id` +
`title` feed the auto right-rail table of contents (shown ≥1280px wide when there
are ≥4 navigable sections). `status` is always `"done" | "in-progress" | "upcoming"`.

| type | what it renders |
|---|---|
| `assist` | intro block ("Start here") with a Copy-for-AI CTA button |
| `callout` | a pulled-out note; `variant:"alert"` adds the amber warning style |
| `status` | Project Status — phase cards with checklist items |
| `tasks` | grouped setup task-cards: `subgroups[]`, each a subhead + optional `decisions` cards + `tasks[]`. A task has `id` (code), `title`, `owner` (→ chip), `tags[]`, `fields[]`, `steps[]`, and a To-do/Done toggle |
| `list` | a bordered list of rows (`name`, `sub`, `status:{label,kind}`, `note`) — used for build status and roadmaps. `kind` is `built` / `wait` / plain |
| `queue` | an ordered "up next" list |
| `cards` | value cards (`columns: 2` or `3`) |
| `request` | a custom-request box that opens a pre-filled `mailto:` |
| `updates` | a dated status feed (newest first) |
| `accordions` | "How We Work Together" — collapsible markdown sections |
| `docs` | document cards that open in an in-page reader |

A task `field` is `{ "k": "Label", "v": "markdown" }`, or `{ "k", "drafts":[…] }`
for email/message drafts (with `{{tokens}}`), or `{ "k", "list":{ "items":[…] } }`
for a category/option grid.

### Copy-for-AI

`copyForAI.mode`:
- **`generic`** (default) — the button compiles the whole rendered portal into
  one Markdown blob to paste into any assistant. `placement` picks where the
  button appears (`["top","footer"]`).
- **`payload`** — the button copies a named `<script type="application/json">`
  block **verbatim** (set `payloadId`), so a structured intake payload's own
  `instructionsForAssistant` drives the assistant.

### Owner chips

`parties` maps a label substring to a chip color: `cls:"a"` and `cls:"b"` are the
two accent chips defined in `theme.css`; an owner naming both parties gets the
blended "both" chip. Rename/recolor by editing the `--chip-a-*` / `--chip-b-*`
tokens.

## To restyle every portal at once

1. Edit `theme.css` (colors, spacing, type, card style — all CSS tokens at the top).
2. Commit and push. Vercel redeploys this host.
3. Every linked client page picks up the change on next load (cache ≈ 5 min).

Structure or behavior change → edit `portal.js` the same way. Keep both changes
**backward-compatible**: existing client pages must keep rendering (the simple
top-level layout and every section type above are a contract).

## Access / privacy

This host serves only presentation code (CSS/JS/fonts) — **no client data** — so
it is public by design. Each client's own page stays behind that page's password
gate; only its non-secret styling and structure come from here.
