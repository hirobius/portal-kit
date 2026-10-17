import { test } from "node:test";
import assert from "node:assert/strict";
import { portalGate, loginHtml } from "./gate.mjs";

const OPTS = { client: "Acme & Co", cookie: "acme_auth", salt: "acme", release: "v20", failDelayMs: 0 };
const gate = (env, extra = {}) => portalGate({ ...OPTS, ...extra, env: () => env });
const req = (path = "/", init = {}) => new Request("https://acme.example" + path, init);
const login = (password, ip = "203.0.113.7") =>
  req("/__auth", { method: "POST", body: "password=" + encodeURIComponent(password), headers: { "content-type": "application/x-www-form-urlencoded", "x-real-ip": ip } });
const cookieOf = (res) => res.headers.get("set-cookie").split(";")[0];
const DAY = 86400;

test("fail-open locally: no password and no Vercel env means no gate", async () => {
  assert.equal(await gate({})(req()), undefined);
  assert.equal(await gate({ VERCEL_ENV: "development" })(req()), undefined);
});

test("fail closed on Vercel: production or preview without SITE_PASSWORD returns 503 naming the setting", async () => {
  for (const VERCEL_ENV of ["production", "preview"]) {
    const res = await gate({ VERCEL_ENV })(req("/anything"));
    assert.equal(res.status, 503);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const html = await res.text();
    assert.match(html, /SITE_PASSWORD/);
    assert.match(html, /Environment Variables/);
    // POST /__auth is closed too, nothing gets through.
    assert.equal((await gate({ VERCEL_ENV })(login("x"))).status, 503);
  }
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
  const res = await gate({ SITE_PASSWORD: "pw" })(login("nope"));
  assert.equal(res.status, 401);
  assert.match(await res.text(), /Incorrect password/);
});

test("right password: 303 home with a secure, signed, 7-day session cookie", async () => {
  const res = await gate({ SITE_PASSWORD: "pw" })(login("pw"));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "/");
  const c = res.headers.get("set-cookie");
  assert.match(c, /^acme_auth=\d+\.[0-9a-f]{64};/);
  assert.match(c, /HttpOnly/); assert.match(c, /Secure/); assert.match(c, /SameSite=Lax/);
  assert.match(c, new RegExp(`Max-Age=${7 * DAY}`));
});

test("valid cookie passes straight through; a password change signs everyone out", async () => {
  const cookie = cookieOf(await gate({ SITE_PASSWORD: "pw" })(login("pw")));
  assert.equal(await gate({ SITE_PASSWORD: "pw" })(req("/", { headers: { cookie } })), undefined);
  assert.equal((await gate({ SITE_PASSWORD: "changed" })(req("/", { headers: { cookie } }))).status, 401);
});

test("old unsigned sha256(salt:password) cookies no longer work", async () => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("acme:pw"));
  const old = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const res = await gate({ SITE_PASSWORD: "pw" })(req("/", { headers: { cookie: `acme_auth=${old}` } }));
  assert.equal(res.status, 401);
});

test("session expires: accepted before the expiry, rejected after", async () => {
  let t = Date.UTC(2026, 9, 17);
  const g = gate({ SITE_PASSWORD: "pw" }, { now: () => t });
  const cookie = cookieOf(await g(login("pw")));
  t += 7 * DAY * 1000 - 1000;
  assert.equal(await g(req("/", { headers: { cookie } })), undefined);
  t += 2000;
  assert.equal((await g(req("/", { headers: { cookie } }))).status, 401);
});

test("session length is configurable", async () => {
  const res = await gate({ SITE_PASSWORD: "pw" }, { sessionDays: 1 })(login("pw"));
  assert.match(res.headers.get("set-cookie"), new RegExp(`Max-Age=${DAY}`));
});

test("a tampered token is rejected: changed expiry, changed signature, junk", async () => {
  const g = gate({ SITE_PASSWORD: "pw" });
  const [exp, sig] = cookieOf(await g(login("pw"))).split("=")[1].split(".");
  const flip = (s) => s.slice(0, -1) + (s.at(-1) === "0" ? "1" : "0");
  for (const v of [`${Number(exp) + 999999}.${sig}`, `${exp}.${flip(sig)}`, `${exp}.${sig.slice(1)}`, `${exp}`, "x.y", ""]) {
    assert.equal((await g(req("/", { headers: { cookie: `acme_auth=${v}` } }))).status, 401, v);
  }
});

test("SITE_SESSION_SECRET is used when set: tokens from the password-only key no longer verify", async () => {
  const cookie = cookieOf(await gate({ SITE_PASSWORD: "pw" })(login("pw")));
  const withSecret = gate({ SITE_PASSWORD: "pw", SITE_SESSION_SECRET: "s3cret" });
  assert.equal((await withSecret(req("/", { headers: { cookie } }))).status, 401);
  const c2 = cookieOf(await withSecret(login("pw")));
  assert.equal(await withSecret(req("/", { headers: { cookie: c2 } })), undefined);
  assert.equal((await gate({ SITE_PASSWORD: "pw", SITE_SESSION_SECRET: "other" })(req("/", { headers: { cookie: c2 } }))).status, 401);
});

test("every failed attempt waits before answering", async () => {
  const g = gate({ SITE_PASSWORD: "pw" }, { failDelayMs: 60 });
  const t0 = Date.now();
  assert.equal((await g(login("nope"))).status, 401);
  assert.ok(Date.now() - t0 >= 55, "failed login should be delayed");
  const t1 = Date.now();
  assert.equal((await g(login("pw"))).status, 303);
  assert.ok(Date.now() - t1 < 55, "a correct login is not delayed");
});

test("default failure delay is about 500 ms", async () => {
  const g = portalGate({ ...OPTS, failDelayMs: undefined, env: () => ({ SITE_PASSWORD: "pw" }) });
  const t0 = Date.now();
  await g(login("nope"));
  assert.ok(Date.now() - t0 >= 480);
});

test("10 failures from one IP lock that IP out for 15 minutes, even with the right password", async () => {
  let t = Date.UTC(2026, 9, 17);
  const g = gate({ SITE_PASSWORD: "pw" }, { now: () => t });
  for (let i = 0; i < 10; i++) assert.equal((await g(login("nope"))).status, 401);
  const locked = await g(login("pw"));
  assert.equal(locked.status, 429);
  assert.equal(locked.headers.get("retry-after"), String(15 * 60));
  assert.match(await locked.text(), /Too many attempts/);
  // Another IP is unaffected.
  assert.equal((await g(login("pw", "198.51.100.9"))).status, 303);
  // Lock lifts after 15 minutes.
  t += 15 * 60 * 1000 + 1;
  assert.equal((await g(login("pw"))).status, 303);
});

test("a successful login resets that IP's failure count", async () => {
  const g = gate({ SITE_PASSWORD: "pw" });
  for (let i = 0; i < 9; i++) await g(login("nope"));
  assert.equal((await g(login("pw"))).status, 303);
  for (let i = 0; i < 9; i++) assert.equal((await g(login("nope"))).status, 401);
  assert.equal((await g(login("pw"))).status, 303);
});

test("client IP comes from x-real-ip, else the first x-forwarded-for entry", async () => {
  const g = gate({ SITE_PASSWORD: "pw" });
  const xff = (ip, pw = "nope") =>
    req("/__auth", { method: "POST", body: "password=" + pw, headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": `${ip}, 10.0.0.1` } });
  for (let i = 0; i < 10; i++) await g(xff("192.0.2.1"));
  assert.equal((await g(xff("192.0.2.1", "pw"))).status, 429);
  assert.equal((await g(xff("192.0.2.2", "pw"))).status, 303);
});

test("variants and footer note render; unknown variant falls back to card", () => {
  for (const v of ["card", "plain", "split"]) assert.match(loginHtml({ ...OPTS, variant: v }), new RegExp(`pk-login--${v}`));
  assert.match(loginHtml({ ...OPTS, variant: "nope" }), /pk-login--card/);
  assert.match(loginHtml({ ...OPTS, note: "Private <portal>" }), /Private &lt;portal&gt;/);
});
