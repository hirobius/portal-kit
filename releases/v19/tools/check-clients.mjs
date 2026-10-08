#!/usr/bin/env node
// check-clients.mjs — is every client page on the release and layout the
// registry says, and is anyone behind the latest kit release?
//
//   GITHUB_TOKEN=… node tools/check-clients.mjs
//
// Reads clients/registry.json, fetches each page from the client repo's default
// branch, and reports its pinned releases/vN and page shape (canonical
// `sections` vs legacy top-level layout). Exit 1 on a registry mismatch; being
// behind the latest release is a warning only. Node built-ins only.

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Pinned release (e.g. "v7") and shape of a client page's HTML. */
export function inspectPage(html) {
  const pins = [...html.matchAll(/\/releases\/(v\d+)\/(?:theme\.css|portal\.js)/g)].map((m) => m[1]);
  const release = pins.length && new Set(pins).size === 1 ? pins[0] : pins.length ? "mixed" : "unpinned";
  const m = /<script type="application\/json" id="portal-data">([\s\S]*?)<\/script>/.exec(html);
  let layout = "unknown";
  if (m) {
    try { layout = Array.isArray(JSON.parse(m[1]).sections) ? "canonical" : "legacy"; } catch { layout = "invalid-json"; }
  }
  return { release, layout };
}

/** Highest releases/vN directory in this repo. */
export async function latestRelease(dir = ROOT + "releases") {
  const vs = (await readdir(dir)).map((d) => /^v(\d+)$/.exec(d)).filter(Boolean).map((m) => +m[1]);
  return "v" + Math.max(...vs);
}

/** Compare one registry row with what its pages actually pin. */
export function compare(row, seen, latest) {
  const problems = [], warnings = [];
  for (const [page, got] of Object.entries(seen)) {
    const at = `${row.repo}/${page}`;
    if (got.error) { problems.push(`${at}: ${got.error}`); continue; }
    if (got.release !== row.release) problems.push(`${at}: pins ${got.release}, registry says ${row.release}`);
    if (got.layout !== row.layout) problems.push(`${at}: layout ${got.layout}, registry says ${row.layout}`);
    if (got.release !== latest && /^v\d+$/.test(got.release)) warnings.push(`${at}: on ${got.release}, latest is ${latest}`);
  }
  return { problems, warnings };
}

async function fetchPage(repo, page, token) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${page}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.raw+json" },
  });
  if (res.status === 404) return { error: `not found (or GITHUB_TOKEN can't see ${repo})` };
  if (!res.ok) return { error: `GitHub returned ${res.status}` };
  return inspectPage(await res.text());
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("check-clients: GITHUB_TOKEN is not set, so private client repos can't be read. Export a token with read access to the client repos, then re-run.");
    process.exit(2);
  }
  const { clients } = JSON.parse(await readFile(ROOT + "clients/registry.json", "utf8"));
  const latest = await latestRelease();
  let failed = 0;
  for (const row of clients) {
    const seen = {};
    for (const page of row.pages) seen[page] = await fetchPage(row.repo, page, token);
    const { problems, warnings } = compare(row, seen, latest);
    const ok = !problems.length;
    console.log(`${ok ? "✓" : "✗"} ${row.client} (${row.repo}) — registry ${row.release}/${row.layout}`);
    problems.forEach((p) => console.log(`    ✗ ${p}`));
    warnings.forEach((w) => console.log(`    ! ${w}`));
    if (!ok) failed++;
  }
  console.log(failed ? `\ncheck-clients: ${failed} client(s) don't match the registry.` : `\ncheck-clients: all clients match the registry (latest ${latest}).`);
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
