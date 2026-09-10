# Hirobius Portal Kit

The **single source of truth** for the visual style and structure of every
client status portal (Lilac, Access Tech, and future clients). Edit the theme
here once, redeploy, and every client page that links it updates on next load —
no per-project reinvention.

## What's here

- **`theme.css`** — the whole design system: Satoshi type, neutral palette,
  pill status chips (done / in-progress / upcoming), elevated white cards,
  light/dark, responsive. This is the file you edit to restyle every portal.
- **`portal.js`** — the shared renderer. It builds the entire page (header +
  Project Status + Status Updates + Documents) from a client's JSON data block,
  so structure and behavior are shared too.
- **`index.html`** — a live demo rendering sample data through the kit.
- **`clients/EXAMPLE-client-page.html`** — copy this to start a new client page.
- **`fonts/`** — self-hosted Satoshi (served with CORS so client pages on other
  domains can use it).
- **`vercel.json`** — CORS headers for the fonts + a short cache on `theme.css`
  and `portal.js` so edits propagate within ~5 minutes.

## How a client page uses it

A client page owns only its content. Everything else comes from here:

```html
<link rel="stylesheet" href="https://<portal-kit-host>/theme.css" />
<script type="application/json" id="portal-data"> { ...client data... } </script>
<script src="https://<portal-kit-host>/portal.js" defer></script>
```

That's the entire page. See `clients/EXAMPLE-client-page.html`.

## Data shape

```json
{
  "client": "Client Name",
  "lastUpdated": "2026-01-01",
  "subtitle": "optional custom subtitle",
  "phases": [
    { "id": "phase-0", "title": "Phase 0 — Title", "status": "in-progress",
      "items": [ { "label": "A task", "status": "done" } ] }
  ],
  "updates": [ { "date": "2026-01-01", "note": "First update." } ],
  "documents": [ { "title": "Proposal", "description": "Plan and pricing.", "file": "/docs/proposal.pdf" } ]
}
```

`status` is always one of `"done"`, `"in-progress"`, `"upcoming"`. A document
with no real `file` (or the `REPLACE_WITH_PROPOSAL_FILE_PATH` placeholder) shows
"Awaiting file".

## To restyle every portal at once

1. Edit `theme.css` (colors, spacing, type, card style — all in CSS tokens at the
   top).
2. Commit and push. Vercel redeploys this host.
3. Every linked client page picks up the change on next load (cache ≈ 5 min).

Structure or behavior change → edit `portal.js` the same way.

## Access / privacy

This host serves only presentation code (CSS/JS/fonts) — no client data — so it
is public by design. Each client's own page stays behind that page's password
gate; only its non-secret styling comes from here.
