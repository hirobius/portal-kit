#!/usr/bin/env node
/**
 * sync-hds-tokens.mjs — re-vendor hirobius/hds's generated tokens.css.
 *
 * portal-kit consumes the hds token source as a vendored copy (vendor/hds-tokens.css)
 * because portal-kit is buildless and static. This script refreshes that copy from
 * hds `main` and rewrites the provenance header (source sha + date).
 *
 *   node scripts/sync-hds-tokens.mjs           # write the vendored file
 *   node scripts/sync-hds-tokens.mjs --check   # exit 1 if the vendored file is stale
 *
 * Auth: hirobius/hds is private, so set GITHUB_TOKEN (or GH_TOKEN) to a token with
 * read access to it. In CI, pass a secret; without a token this exits 0 with a notice
 * so it never hard-fails a run that simply cannot reach hds.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = join(ROOT, 'vendor', 'hds-tokens.css');
const SRC_PATH = 'src/styles/tokens.css';
const API = `https://api.github.com/repos/hirobius/hds/contents/${SRC_PATH}?ref=main`;
const check = process.argv.includes('--check');
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

if (!token) {
  console.log('sync-hds-tokens: no GITHUB_TOKEN/GH_TOKEN set — skipping (cannot reach private hds). Not a failure.');
  process.exit(0);
}

const res = await fetch(API, {
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'User-Agent': 'portal-kit-sync' },
});
if (!res.ok) {
  console.error(`sync-hds-tokens: GitHub API ${res.status} ${res.statusText} fetching ${SRC_PATH}`);
  process.exit(1);
}
const body = await res.text();
// GitHub's raw media type returns the file content directly; also record the blob sha.
const shaRes = await fetch(API, {
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'portal-kit-sync' },
});
const sha = shaRes.ok ? (await shaRes.json()).sha : 'unknown';

const header = `/* ============================================================================
   VENDORED FROM hirobius/hds — DO NOT HAND-EDIT.
   Source: hirobius/hds  ${SRC_PATH}  (branch: main)
   Synced: ${new Date().toISOString().slice(0, 10)} · source content sha: ${sha}
   Re-sync: node scripts/sync-hds-tokens.mjs   (or copy hds ${SRC_PATH})
   Drift is checked by scripts/check-tokens.mjs (CI: .github/workflows/token-drift.yml).
   theme.css @imports this file and aliases portal-kit's compact token names onto
   these vars, so a brand change in hds sweeps every client portal on next load.
   ============================================================================ */
`;
const next = header + body.replace(/^﻿/, '');

const current = readFileSync(VENDOR, 'utf8');
// Compare on body only (ignore the dated header line), so a same-content re-sync is a no-op.
const strip = (s) => s.replace(/\/\* =+[\s\S]*?=+ \*\/\n/, '').trim();
const stale = strip(current) !== strip(next);

if (check) {
  if (stale) {
    console.error('✗ sync-hds-tokens --check: vendor/hds-tokens.css is STALE vs hds main. Run: node scripts/sync-hds-tokens.mjs');
    process.exit(1);
  }
  console.log('✓ sync-hds-tokens --check: vendored tokens match hds main.');
  process.exit(0);
}

writeFileSync(VENDOR, next);
console.log(stale ? `✓ sync-hds-tokens: vendor/hds-tokens.css updated from hds@${sha}.` : '✓ sync-hds-tokens: already current (header refreshed).');
