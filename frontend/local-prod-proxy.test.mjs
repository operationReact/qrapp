import { test } from "node:test";
import assert from "node:assert/strict";
import { productionProxy, PROD_API, PROXY_PREFIX } from "./local-prod-proxy.mjs";

function check(method, { allowWrites = false, origin, host = "localhost:5173", fetchSite, url = PROXY_PREFIX + "/api/locations/public" } = {}) {
  let middleware, passed = false, status;
  productionProxy({ allowWrites }).configureServer({ middlewares: { use(fn) { middleware = fn; } } });
  const res = { writeHead(code) { status = code; }, end() {} };
  middleware({ method, url, headers: { host, origin, "sec-fetch-site": fetchSite } }, res, () => { passed = true; });
  return { passed, status };
}
test("production target is fixed HTTPS and TLS verified", () => {
  const config = productionProxy().config();
  const proxy = Object.values(config.server.proxy)[0];
  assert.equal(proxy.target, "https://migrate-prod-api.broandbro.in");
  assert.equal(proxy.target, PROD_API);
  assert.equal(proxy.secure, true);
  assert.equal(config.server.host, "localhost");
  assert.equal(proxy.rewrite(PROXY_PREFIX + "/api/locations/public"), "/api/locations/public");
});
test("read-only mode rejects write methods", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(check(method).status, 403);
  for (const method of ["GET", "HEAD", "OPTIONS"]) assert.equal(check(method).passed, true);
});
test("explicit write mode allows same-origin POST", () => {
  assert.equal(check("POST", { allowWrites: true, origin: "http://localhost:5173" }).passed, true);
});
test("cross-origin requests are rejected even in write mode", () => {
  assert.equal(check("POST", { allowWrites: true, origin: "https://untrusted.example" }).status, 403);
});
test("other paths are not intercepted", () => {
  assert.equal(check("POST", { url: "/ordinary" }).passed, true);
});

test("refuses DNS rebinding and cross-site GET requests", () => {
  assert.equal(check("GET", { host: "untrusted.example:5173", origin: "http://untrusted.example:5173" }).status, 403);
  assert.equal(check("GET", { fetchSite: "cross-site" }).status, 403);
});
