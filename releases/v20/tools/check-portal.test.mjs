import { test } from "node:test";
import assert from "node:assert/strict";
import { runAllChecks } from "./check-portal.mjs";

const KIT = "https://portal-kit-adrian-6234s-projects.vercel.app/releases/v7";
const page = (data, extra = "") => `<!doctype html><html><head>
<link rel="stylesheet" href="${KIT}/theme.css" />
<style>#fallback { max-width:640px; }</style>${extra}
</head><body><main id="fallback">Loading</main>
<script type="application/json" id="portal-data">${JSON.stringify(data)}</script>
<script type="text/markdown" id="doc-a"># A</script>
<script src="${KIT}/portal.js" defer></script></body></html>`;
const canonical = {
  client: "X", contact: { email: "a@b.com" },
  sections: [
    { type: "status", id: "status", title: "Status", phases: [{ title: "P", items: [{ label: "x", status: "done", bodyId: "doc-a" }] }] },
    { type: "links", id: "links", title: "Links", items: [] },
  ],
};
const rules = (html, level) => runAllChecks(html).filter((f) => !level || f.level === level).map((f) => f.rule);

test("a canonical v7 page is clean", () => {
  assert.deepEqual(runAllChecks(page(canonical)), []);
});

test("page-local CSS and scripts are errors", () => {
  const r = rules(page(canonical, "<style>.doc h3 { display:block }</style><script>window.x=1</script>"), "error");
  assert.ok(r.includes("local-style"));
  assert.ok(r.includes("local-script"));
});

test("vercel insights snippet points at the analytics flag", () => {
  const f = runAllChecks(page(canonical, '<script defer src="/_vercel/insights/script.js"></script>'));
  assert.match(f.find((x) => x.rule === "local-script").fix, /"analytics": "vercel"/);
});

test("dangling bodyId is an error; unknown section type is an error", () => {
  const bad = structuredClone(canonical);
  bad.sections[0].phases[0].items[0].bodyId = "nope";
  bad.sections.push({ type: "carousel" });
  const r = rules(page(bad), "error");
  assert.ok(r.includes("body-ref-dangling"));
  assert.ok(r.includes("unknown-section"));
});

test("legacy shape, eyebrows, header and legacy sections warn", () => {
  const legacy = { client: "X", header: { eyebrow: false }, sections: [{ type: "tasks", eyebrow: "SETUP" }] };
  const r = rules(page(legacy), "warn");
  for (const x of ["legacy-header", "legacy-section", "eyebrow", "no-contact"]) assert.ok(r.includes(x), x);
});

test("broken JSON and mixed releases are errors", () => {
  const html = page(canonical).replace('"client":"X"', '"client":"X",,').replace(`${KIT}/portal.js`, KIT.replace("v7", "v6") + "/portal.js");
  const r = rules(html, "error");
  assert.ok(r.includes("json-invalid"));
  assert.ok(r.includes("mixed-release"));
});

test("tags mentioned inside HTML comments are ignored", () => {
  const html = page(canonical).replace("<body>", '<body><!-- put docs in <script type="text/markdown"> blocks; no <style> here -->');
  assert.deepEqual(runAllChecks(html), []);
});
