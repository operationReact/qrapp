import test from "node:test";
import assert from "node:assert/strict";
import { getSafeRedirect } from "./safeRedirect.js";

test("accepts same-origin app paths", () => {
  assert.equal(getSafeRedirect("/cart"), "/cart");
  assert.equal(getSafeRedirect("/checkout?step=2"), "/checkout?step=2");
});

test("rejects external, protocol-relative and malformed targets", () => {
  assert.equal(getSafeRedirect("https://evil.example"), null);
  assert.equal(getSafeRedirect("//evil.example"), null);
  assert.equal(getSafeRedirect("/\\evil.example"), null);
  assert.equal(getSafeRedirect(undefined), null);
  assert.equal(getSafeRedirect(42), null);
});

test("rejects auth pages to prevent redirect loops", () => {
  assert.equal(getSafeRedirect("/login"), null);
  assert.equal(getSafeRedirect("/register?verify=true"), null);
  assert.equal(getSafeRedirect("/forget-password"), null);
});
