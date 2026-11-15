# Hirobius Portal Kit

A shared `theme.css` and `portal.js` renderer for client status portals. Plain static files
on Vercel. Client pages in other repos load a pinned release from this host.

## Commands

- `python3 -m http.server 8000` - serve the demo (`index.html`).
- `node --test tools/*.test.mjs` - test the tools.
- `node scripts/check-repo-docs.mjs` - check README.md, CONTRIBUTING.md and this file.
- `GITHUB_TOKEN=… node tools/check-clients.mjs` - compare client pages with `clients/registry.json`.

## Rules

- Changes to `theme.css` and `portal.js` must stay backward-compatible. Every section type in `docs/data-shape.md` is a contract.
- Never edit a folder under `releases/`. To ship a change, cut a release under `releases/vN` and add its entry to `RELEASES.md`.
- A release holds `portal.js`, `theme.css`, `tools/` and, if the renderer needs it, `vendor/`.
- This host is public and holds no client data. Never add client data or secrets.
- The tools use Node built-ins only. Do not add a package.json or a build step.
- Update `clients/registry.json` in the pull request that moves a client.
- Every file in the repo is deployed. `docs/` and `scripts/` are served as static files, so keep them free of private data.
- Put detail in `docs/`, one subject per file. Commit subjects are `type: what changed`.

## Fleet hub
This repo is part of the Hirobius fleet. The operations hub is the
hirobius/ops repo: fleet state at /api/projects, consolidated tasks at
/ops/tasks (this repo's GitHub Issues sync there), current cross-project
state in docs/ai/HANDOFF.md (in ops). Conventions for every session here:
(a) track new work as GitHub Issues in THIS repo — never a local TODO
file; (b) before ending any session that changed project state, update
root status.json (updatedAt, phase, headline, next, blocked) — the ops
dashboard renders it; (c) read the ops HANDOFF before cross-project
decisions.
