import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectPage, compare, latestRelease } from "./check-clients.mjs";

const page = (v, data) => `<link href="https://h/releases/${v}/theme.css"><script type="application/json" id="portal-data">${JSON.stringify(data)}</script><script src="https://h/releases/${v}/portal.js"></script>`;

test("reads the pinned release and layout", () => {
  assert.deepEqual(inspectPage(page("v7", { sections: [] })), { release: "v7", layout: "canonical" });
  assert.deepEqual(inspectPage(page("v5", { phases: [] })), { release: "v5", layout: "legacy" });
  assert.equal(inspectPage(page("v6", {}).replace("v6/portal", "v7/portal")).release, "mixed");
});

test("registry mismatch is a problem; behind latest is a warning", () => {
  const row = { repo: "hirobius/x", release: "v7", layout: "canonical" };
  const r = compare(row, { "index.html": { release: "v5", layout: "legacy" } }, "v7");
  assert.equal(r.problems.length, 2);
  const w = compare({ ...row, release: "v6" }, { "index.html": { release: "v6", layout: "canonical" } }, "v7");
  assert.deepEqual([w.problems.length, w.warnings.length], [0, 1]);
});

test("latest release comes from releases/", async () => {
  assert.match(await latestRelease(), /^v\d+$/);
});
