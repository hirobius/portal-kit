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

## v1 — 2026-10-02
Baseline snapshot, byte-identical to the then-current root `portal.js` +
`theme.css` + `vendor/`. No behavior change; it exists so the live client pages
can pin a stable path instead of floating on the root edge build.

Contract at v1:
- Client page links `theme.css` and `portal.js` itself and embeds `#portal-data`
  (plus `text/markdown` document blocks).
- Renderer: data-driven sections + simple top-level layout fallback, Copy-for-AI,
  theme switcher, in-page document reader.
