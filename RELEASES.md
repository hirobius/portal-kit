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

## v10 — 2026-10-06
- **No sideways slide on phones.** Document tables sit in their own scroll box
  (`.table-scroll`), and the reader only scrolls up and down, so a wide table no
  longer shifts the whole page when touched. Links in table cells wrap.
- **Strikethrough:** `~~done item~~` renders as struck-through text, for
  "Already done" lists.
- Additive: v9 pages render the same, minus the sideways slide.

## v9 — 2026-10-06
Every document prints as a clean US Letter (8.5x11in) page.
- **Print or save PDF** button under each document's heading in the reader. A
  document open in the reader prints by itself; the main page prints with every
  fold opened (restored after).
- **Print styles:** `@page { size: letter }`, 0.75in margins, 10.5pt body,
  black-on-white, buttons hidden, tables bordered and kept whole, headings kept
  with their text, external links show their URL, empty table cells get signing
  room.
- Additive: v8 pages render unchanged on screen.

## v8 — 2026-10-06
Shorter pages: long sections fold instead of scrolling forever.
- **Phases fold.** Every `status` phase is a tap-to-open card (chevron right).
  A finished phase starts closed, still showing "5 of 5 done"; others start
  open. `"open": true|false` on a phase overrides.
- **Updates show the newest 2.** Older entries sit under "Older updates (N)".
  `"show": N` on the section changes the count.
- **Documents can fold too.** `"show": N` on a `docs` section keeps the first N
  as cards and puts the rest under "More documents (N)". Default: show all.
- **Deep links open what they point at.** A `#id` inside a folded phase or list
  opens every fold around it (on load and on hash change).
- Copy page still copies everything, folded or not. Additive: v7 pages render
  under v8, with finished phases and older updates folded.

## v7 — 2026-10-05
One framework for every client page: the kit absorbs what clients were hand-rolling.
- **One checklist pattern.** A `status` item may carry `owner`, `fields[]`,
  `steps[]` (+ `stepsTitle`), `bodyId`, `open`; it then opens on tap inside the
  same simple checklist (chevron right, detail indented under the label). An
  item `id` becomes a deep-link anchor. A phase can take a `note`. Item state
  comes only from data — no device-local "To do" toggles. `tasks` and `list`
  still render but are **legacy**; new pages use `status`.
- **No eyebrows.** Section `eyebrow` (and `decisions.eyebrow`) is no longer
  rendered; field labels and link groups are sentence case, not ALL CAPS.
- **One header, one footer.** The header is always `Private • Updated <date>`,
  h1, subtitle (`header.eyebrow:false` / `livelyHeading` ignored). The footer is
  Copy page → "Questions? <contact.email>" → theme toggle; `footer.lines` renders
  only when there's no `contact.email`.
- **Doc cards** put the icon above the title by default (Access Tech's local
  override is no longer needed).
- **Shared tools** (`releases/v7/tools/`, Node built-ins): `check-portal.mjs`
  (JSON valid, bodyId refs, no page-local CSS/scripts, single pinned release,
  known section types, secrets, `--strict` fails on legacy keys) and
  `sync-links.mjs` (writes `links.json` client entries into `#portal-data`, for
  `sections` or legacy pages). Client repos vendor the copy matching their pin.
- Canonical page: `sections` → `status` → `updates` → `links` → `docs`, then
  optional kit blocks (`assist`, `cards`, `request`, `mermaid`).
- Patched in place before any client pinned it: a closed "Read the draft" toggle
  inside an open checklist row read "Hide" (show/hide labels now key off their own
  `<details>`, not any open ancestor). Also: the request-box label, "On this
  page" title, diagram lane titles and "Coming up" heading are sentence case.
- Additive for data: v6 pages render under v7, minus eyebrows/legacy header and
  footer lines.

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
