#!/usr/bin/env node
/**
 * check-tokens.mjs — integrity gate for the vendored hds token layer.
 *
 * theme.css aliases portal-kit's compact token names onto hds vars defined in
 * vendor/hds-tokens.css. This guards that seam:
 *   1. vendor/hds-tokens.css still carries its "VENDORED FROM hirobius/hds" header
 *      (i.e. nobody replaced it with a hand-authored file).
 *   2. every hds-namespaced var that theme.css references is actually defined in
 *      the vendored file — no dangling `var(--semantic-…)` that would silently
 *      fall back to `initial` and break the theme.
 *
 * Pure Node, no deps, no network — safe to run in CI without cross-repo auth.
 * (Staleness vs hds latest is a separate concern; re-sync with sync-hds-tokens.mjs.)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const theme = readFileSync(join(ROOT, 'theme.css'), 'utf8');
const vendor = readFileSync(join(ROOT, 'vendor', 'hds-tokens.css'), 'utf8');

const errors = [];

// 1. Header guard
if (!/VENDORED FROM hirobius\/hds/.test(vendor)) {
  errors.push('vendor/hds-tokens.css is missing its "VENDORED FROM hirobius/hds" header — is it still the generated file?');
}

// 2. Defined vars in the vendored file
const defined = new Set([...vendor.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm)].map((m) => m[1]));

// hds namespaces theme.css is allowed to reference from the vendored file
const HDS_NS = /^--(semantic|primitive|component|role|hds-motion)-/;

// Every var(--x) reference in theme.css that targets an hds namespace must be defined
const referenced = new Set([...theme.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)].map((m) => m[1]));
const dangling = [...referenced].filter((v) => HDS_NS.test(v) && !defined.has(v)).sort();

if (dangling.length) {
  errors.push(`theme.css references ${dangling.length} hds var(s) not defined in vendor/hds-tokens.css:`);
  dangling.forEach((v) => errors.push(`  - ${v}`));
}

if (errors.length) {
  console.error('✗ check-tokens FAILED:\n' + errors.join('\n'));
  process.exit(1);
}

const hdsRefs = [...referenced].filter((v) => HDS_NS.test(v)).length;
console.log(`✓ check-tokens — ${hdsRefs} hds var reference(s) in theme.css, all defined in the vendored token file; header intact.`);
