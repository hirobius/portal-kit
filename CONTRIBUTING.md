# Contributing

## Setup

You need Node (any current version) and Python 3 or another static file server.
There is nothing to install.

```bash
python3 -m http.server 8000
```

Open http://localhost:8000 to see the demo.

## Check

Run this before each push:

```bash
node --test tools/*.test.mjs && node scripts/check-repo-docs.mjs
```

The first command tests the tools. The second checks README.md, CONTRIBUTING.md and CLAUDE.md.

## Rules for a change

- Keep `theme.css` and `portal.js` backward-compatible. Existing client pages must keep rendering.
- Do not edit a folder under `releases/`. A release is frozen.
- To ship a change to clients, cut a release under `releases/vN`. See [RELEASES.md](RELEASES.md).
- Update `clients/registry.json` in the same pull request that moves a client.

## Branch and pull request

1. Branch from `main`.
2. Keep the pull request small. One pull request is one change.
3. Write commit subjects as `type: what changed`, in plain English, 72 characters or less.
   Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
4. Fill in the pull request template. Add screenshots for a visual change.

## Issues

File bugs and tasks in this repository's GitHub Issues. Use the templates.
Report a security problem in private. See [SECURITY.md](SECURITY.md).
