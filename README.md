# Hirobius Portal Kit

The **single source of truth** for the visual style, structure, and behavior of
every client status portal, current and future. A client
page ships only *data*; this kit renders it. Edit the theme or renderer here
once, redeploy, and every client page updates on next load — no per-project
reinvention.

## What's here

- **`theme.css`** — the whole design system: Satoshi type (embedded as a data
  URI so it works cross-origin), neutral palette, status pills, owner chips,
  elevated cards, light/dark, responsive. Edit this to restyle every portal.
- **`portal.js`** — the shared renderer. It builds the entire page from a
  client's JSON data block, so structure and behavior are shared too.
- **`index.html`** — a live demo rendering sample data through the kit.
- **`clients/EXAMPLE-client-page.html`** — copy this to start a new client page.
- **`fonts/`** — self-hosted Satoshi source (the CSS embeds it; these stay for
  reference and for pages that link the font directly).
- **`vercel.json`** — CORS headers for the fonts + a short cache on `theme.css`
  and `portal.js` so edits propagate within ~5 minutes.

## How a client page uses it

A client page is **data only**. Everything else comes from a pinned release:

```html
<link rel="stylesheet" href="https://portal-kit-adrian-6234s-projects.vercel.app/releases/v7/theme.css" />
<script type="application/json" id="portal-data"> { ...client data... } </script>
<script src="https://portal-kit-adrian-6234s-projects.vercel.app/releases/v7/portal.js" defer></script>
```

No page-local CSS or scripts: if a client needs something the kit can't
express, add it to the kit and cut a release. `tools/check-portal.mjs` enforces
this (run it in the client repo; `--strict` also fails legacy keys).

Add a `<main id="fallback">…</main>` with a plain "loading" message; the renderer
removes it on load, so it only shows if the kit can't reach the page. See
`clients/EXAMPLE-client-page.html`.

## Spin up a new client portal

1. Copy `clients/EXAMPLE-client-page.html` into the new client's repo as
   `index.html` (already pinned to the latest release), and copy
   `releases/vN/tools/*.mjs` into the repo's `scripts/kit/`.
2. Fill in `#portal-data` in the **canonical order**: `status` → `updates` →
   `links` → `docs`, then optional kit blocks. Put the client's links in
   `links.json` and run `node scripts/kit/sync-links.mjs`. Put long-form documents in
   `<script type="text/markdown" id="...">` blocks and reference them by `bodyId`.
   Run `node scripts/kit/check-portal.mjs --strict` before every push.
4. Add a row to `clients/registry.json` (repo, pages, release, layout).
   `GITHUB_TOKEN=… node tools/check-clients.mjs` then shows any client whose
   page doesn't match the registry, or is behind the latest release.
3. Deploy the client repo (its own Vercel project + password gate). Done — it
   inherits the shared look, the theme switcher, and Copy-for-AI automatically.

## Data shape

Top level:

```json
{
  "client": "Client Name",
  "subtitle": "optional subtitle",
  "lastUpdated": "2026-01-01",
  "progress": true,
  "parties":  [{ "label": "Client", "cls": "a" }, { "label": "Hirobius", "cls": "b" }],
  "copyForAI":{ "mode": "generic", "placement": ["top", "footer"] },
  "sections": [ "...ordered, typed sections..." ],
  "contact":  { "name": "", "email": "you@example.com" }
}
```

If you omit `sections`, a **simple** layout is synthesized from top-level
`phases` / `updates` / `accordions` / `docs` — enough for a documents-and-status
portal.

### Section types

Each section is `{ "type": "...", "id": "...", "title": "...", ... }`. No
`eyebrow` (v7 doesn't render it). `id` +
`title` feed the auto right-rail table of contents (shown ≥1280px wide when there
are ≥4 navigable sections). `status` is always `"done" | "in-progress" | "upcoming"`.

| type | what it renders |
|---|---|
| `assist` | intro block ("Start here") with a Copy-for-AI CTA button |
| `callout` | a pulled-out note; `variant:"alert"` adds the amber warning style |
| `status` | Project Status — phase cards with checklist items. **The one checklist pattern (v7):** an item `{id,label,status,desc}` may add `owner`, `fields[]`, `steps[]`, `bodyId` and then opens on tap. A phase may add `note`. Finished phases fold into a collapsed "Completed (n)" group at the bottom (v17–v18; `"completedLast": false` on the section to opt out). |
| `links` | link rows grouped by `section`, written from `links.json` by `tools/sync-links.mjs` |
| `tasks` | **legacy (use `status`)** — grouped setup task-cards: `subgroups[]`, each a subhead + optional `decisions` cards + `tasks[]`. A task has `id` (code), `title`, `owner` (→ chip), `tags[]`, `fields[]`, `steps[]`, and a To-do/Done toggle |
| `list` | **legacy (use `status`)** — a bordered list of rows (`name`, `sub`, `status:{label,kind}`, `note`) — used for build status and roadmaps. `kind` is `built` / `wait` / plain |
| `queue` | an ordered "up next" list |
| `cards` | value cards (`columns: 2` or `3`) |
| `request` | a custom-request box that opens a pre-filled `mailto:` |
| `updates` | a dated status feed (newest first) |
| `accordions` | "How We Work Together" — collapsible markdown sections |
| `docs` | document cards that open in an in-page reader. An item may add `signUrl` (https signing link, e.g. DocuSeal) for a **Review and sign** button on the card and at the end of the document (v11), `signPending: true` to show that button greyed out until the link exists (v12), `signLabel` to change its text, and `signedOn: "YYYY-MM-DD"` once it's signed (v15): the button is replaced by a "Signed" pill on the card and a done line in the reader, with an optional `signedCopyUrl` link to the signed PDF. |

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
