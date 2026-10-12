import { test } from "node:test";
import assert from "node:assert/strict";
import { portalGate, loginHtml } from "./gate.mjs";

const OPTS = { client: "Acme & Co", cookie: "acme_auth", salt: "acme", release: "v20" };
const gate = (env) => portalGate({ ...OPTS, env: () => env });
const req = (path = "/", init = {}) => new Request("https://acme.example" + path, init);

test("fail-open: no password configured means no gate", async () => {
  assert.equal(await gate({})(req()), undefined);
});

test("unauthenticated visitor gets the login page (401), no badge, name escaped", async () => {
  const res = await gate({ SITE_PASSWORD: "pw" })(req());
  assert.equal(res.status, 401);
  const html = await res.text();
  assert.match(html, /Acme &amp; Co/);
  assert.doesNotMatch(html, /class="pill"/);
  assert.match(html, /releases\/v20\/theme\.css/);
  assert.match(html, /action="\/__auth"/);
});

test("wrong password: 401 with an error message", async () => {
  const res = await gate({ SITE_PASSWORD: "pw" })(req("/__auth", { method: "POST", body: "password=nope", headers: { "content-type": "application/x-www-form-urlencoded" } }));
  assert.equal(res.status, 401);
  assert.match(await res.text(), /Incorrect password/);
});

test("right password: 303 home with a secure session cookie", async () => {
  const res = await gate({ SITE_PASSWORD: "pw" })(req("/__auth", { method: "POST", body: "password=pw", headers: { "content-type": "application/x-www-form-urlencoded" } }));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "/");
  const c = res.headers.get("set-cookie");
  assert.match(c, /^acme_auth=[0-9a-f]{64};/);
  assert.match(c, /HttpOnly/); assert.match(c, /Secure/); assert.match(c, /SameSite=Lax/);
});

test("valid cookie passes straight through; a stale one does not", async () => {
  const ok = await gate({ SITE_PASSWORD: "pw" })(req("/__auth", { method: "POST", body: "password=pw" }));
  const cookie = ok.headers.get("set-cookie").split(";")[0];
  assert.equal(await gate({ SITE_PASSWORD: "pw" })(req("/", { headers: { cookie } })), undefined);
  const stale = await gate({ SITE_PASSWORD: "changed" })(req("/", { headers: { cookie } }));
  assert.equal(stale.status, 401);
});

test("same cookie token as the old per-site middleware (no forced logouts)", async () => {
  const ok = await gate({ SITE_PASSWORD: "pw" })(req("/__auth", { method: "POST", body: "password=pw" }));
  const token = ok.headers.get("set-cookie").split(";")[0].split("=")[1];
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("acme:pw"));
  const expected = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  assert.equal(token, expected);
});

test("variants and footer note render; unknown variant falls back to card", () => {
  for (const v of ["card", "plain", "split"]) assert.match(loginHtml({ ...OPTS, variant: v }), new RegExp(`pk-login--${v}`));
  assert.match(loginHtml({ ...OPTS, variant: "nope" }), /pk-login--card/);
  assert.match(loginHtml({ ...OPTS, note: "Private <portal>" }), /Private &lt;portal&gt;/);
});
