# Portal Kit Releases

Client pages pin an **immutable release path** and upgrade deliberately.

- `/releases/<ver>/portal.js` + `/releases/<ver>/theme.css` are frozen, cached
  `immutable` for a year. A client that pins one never changes under it.
- Root `/portal.js` + `/theme.css` are the mutable **edge** build (the demo and
  opt-in only, ~5 min cache). Production client pages should NOT float on root.

To cut a release: copy the working `portal.js` + `theme.css` (+ `vendor/` if the
renderer loads it relative to itself) into `releases/<new-ver>/`, add an entry
below, commit, and deploy. Move a client onto it by changing that client's one
pinned path. Roll back by reverting the path. No build step.

Keep releases **backward-compatible within a major line** (every existing client
page must keep rendering). A breaking change starts a new major (`v2`).

---

## v6 — 2026-10-05
- **Links section.** Legacy-shaped pages with a top-level `links` array get a
  **Links** section above Documents: rows of `{title, url, summary?, section?}`,
  grouped by `section` when there's more than one. The array is generated from
  the client repo's `links.json` (see access-tech-internal `scripts/sync-links.mjs`),
  never hand-edited. Copy page includes the links. Additive; v5 pages render
  unchanged.

## v5 — 2026-10-05
- **Copy a single document.** Every document card gets a secondary **Copy**
  button beside **Read**, and each document gets **Copy document** just under
  its heading in the reader (same spot as Copy page on the main page). Both copy that one document as Markdown (the same text Copy page
  includes for it), so a client can grab one doc and paste it anywhere. No data
  change needed: any doc with a `bodyId` gets both buttons automatically; a doc
  with no body gets neither. Additive; v4 pages render unchanged.

## v4 — 2026-10-05
- **Tokens come from HDS.** `theme.css` imports `@hirobius/design-system@0.20.0`
  `variables.css` (jsDelivr) and maps every kit token (surfaces, ink, lines,
  status, chips, type ramp, radius, spacing, shadow, font) to an HDS semantic or
  primitive token. Each mapping keeps its v3 value as a fallback, so a page still
  renders if the CDN is down. Bump the pinned HDS version here to restyle every
  portal.
- Visible change: body text 14.7 → 16px (HDS base), HDS 4px spacing grid,
  neutral palette from HDS (page #fafafa / cards #fff light; #0a0a0a / #111 dark).
- HDS findings from this pass: (1) HDS flips dark mode only on
  `[data-theme="dark"]`, not `prefers-color-scheme`, so the kit maps system-dark
  itself; (2) HDS's mono family (Geist Mono) isn't loaded by `variables.css`,
  so the kit keeps the system mono stack; (3) HDS's accent tokens are
  monochrome (neutral-900), while the HDS README describes an electric-blue
  accent.

## v3 — 2026-10-04
- **"Copy page" button** replaces "Copy for AI": compact outlined button with a
  clipboard icon (top + footer), the pattern AI-friendly doc sites use. No AI
  note under it unless a page sets `copyForAI.note`. `copyForAI.label` still
  overrides the text. Assist-block CTAs (payload mode) unchanged. Copy page always copies the
  whole page, so it also works on payload-mode pages (set `placement`).
- **Fix:** copy now includes the full page on legacy-shaped pages (top-level
  `phases`/`updates`/`docs`). Before, it copied only the title.

## v2 — 2026-10-02
Thin-client support + content features. Backward-compatible with v1 pages
(every change is additive; absent data renders exactly as before).

- **Thin client:** the renderer self-injects `theme.css` from its own release
  dir when the page doesn't already link it, so a client page can ship only its
  data block + one `<script src=".../releases/v2/portal.js">`.
- **Opt-in analytics:** `"analytics": "vercel"` injects the Vercel insights
  beacon from the client's own origin (no inline snippet in the page).
- **Document archive:** `"archived": true` (+ optional `archivedOn`,
  `archivedReason`) moves a doc into a collapsed "Archive (n)" group.
- **Status-feed ledger:** each update may carry a `"tag"` and
  `"attachments": [{ "label", "bodyId" | "file" | "href" }]` — a `bodyId` opens
  that document in the reader; `file`/`href` links out.
- **Document card icon** now sits above the title.

## v1 — 2026-10-02
Baseline snapshot, byte-identical to the then-current root `portal.js` +
`theme.css` + `vendor/`. No behavior change; it exists so the live client pages
can pin a stable path instead of floating on the root edge build.

Contract at v1:
- Client page links `theme.css` and `portal.js` itself and embeds `#portal-data`
  (plus `text/markdown` document blocks).
- Renderer: data-driven sections + simple top-level layout fallback, Copy-for-AI,
  theme switcher, in-page document reader.
