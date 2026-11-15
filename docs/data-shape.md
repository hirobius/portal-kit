# Data shape

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

## Section types

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

## Copy-for-AI

`copyForAI.mode`:
- **`generic`** (default) — the button compiles the whole rendered portal into
  one Markdown blob to paste into any assistant. `placement` picks where the
  button appears (`["top","footer"]`).
- **`payload`** — the button copies a named `<script type="application/json">`
  block **verbatim** (set `payloadId`), so a structured intake payload's own
  `instructionsForAssistant` drives the assistant.

## Owner chips

`parties` maps a label substring to a chip color: `cls:"a"` and `cls:"b"` are the
two accent chips defined in `theme.css`; an owner naming both parties gets the
blended "both" chip. Rename/recolor by editing the `--chip-a-*` / `--chip-b-*`
tokens.

