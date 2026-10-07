import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLinks, clientLinks, applyLinks } from "./sync-links.mjs";

const page = (data) => `<html>\n  <script type="application/json" id="portal-data">\n  ${JSON.stringify(data)}\n  </script>\n</html>`;
const parse = (h) => JSON.parse(h.match(/id="portal-data">([\s\S]*?)<\/script>/)[1]);
const manifest = {
  links: [
    { id: "a", title: "Site", url: "https://a.com", audience: "client", section: "Biz" },
    { id: "b", title: "Kit", url: "https://b.com", audience: "internal" },
    { id: "c", title: "Folder", url: "https://c.com", audience: "client", publish: false },
  ],
};

test("only published client links reach the portal", () => {
  assert.deepEqual(clientLinks(manifest), [{ title: "Site", url: "https://a.com", section: "Biz" }]);
});

test("sections page: adds a links section before docs, then is idempotent", () => {
  const html = page({ client: "X", sections: [{ type: "status" }, { type: "docs", items: [] }] });
  const once = applyLinks(html, clientLinks(manifest));
  const secs = parse(once).sections;
  assert.deepEqual(secs.map((s) => s.type), ["status", "links", "docs"]);
  assert.equal(secs[1].items[0].url, "https://a.com");
  assert.equal(applyLinks(once, clientLinks(manifest)), once);
});

test("sections page: replaces an existing links section in place", () => {
  const html = page({ sections: [{ type: "links", id: "links", title: "Links", items: [{ title: "old", url: "https://o.com" }] }] });
  assert.deepEqual(parse(applyLinks(html, [])).sections[0].items, []);
});

test("legacy page: sets top-level links", () => {
  const out = applyLinks(page({ client: "X", docs: [] }), clientLinks(manifest));
  assert.equal(parse(out).links[0].title, "Site");
});

test("validation catches bad entries", () => {
  const p = validateLinks({ links: [{ id: "a", title: "A", url: "http://x", audience: "public" }, { id: "a" }] });
  assert.ok(p.some((x) => x.includes("https://")));
  assert.ok(p.some((x) => x.includes("audience")));
  assert.ok(p.some((x) => x.includes("duplicate")));
  assert.deepEqual(validateLinks(manifest), []);
});
