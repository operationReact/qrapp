import test from "node:test";
import assert from "node:assert/strict";
import { notificationErrorMessage, safePartnerPath, unreadLabel } from "./partnerNotifications.js";

test("safePartnerPath allows internal partner routes", () => {
  assert.equal(safePartnerPath("/partner"), "/partner");
  assert.equal(safePartnerPath("/partner/finance/settlements/12"), "/partner/finance/settlements/12");
  assert.equal(safePartnerPath("/partner/finance/settlements/12/"), "/partner/finance/settlements/12");
  assert.equal(safePartnerPath("  /partner/reports "), "/partner/reports");
});

test("safePartnerPath ignores external, malformed and traversal targets", () => {
  for (const value of [
    "https://evil.example/partner/x", "//evil.example/partner", "/\\evil.example", "javascript:alert(1)",
    "/admin/users", "/partnerx/1", "partner/finance", "/partner/../admin", "/partner/./x", "/partner//x",
    "/partner/finance?next=https://evil.example", "/partner/finance#x", "/partner/%2e%2e/admin", "/partner/a b",
    "", null, undefined, 42, {},
  ]) {
    assert.equal(safePartnerPath(value), null, String(value));
  }
});

test("unreadLabel hides zero and caps large counts", () => {
  assert.equal(unreadLabel(0), "");
  assert.equal(unreadLabel(undefined), "");
  assert.equal(unreadLabel(7), "7");
  assert.equal(unreadLabel(250), "99+");
});

test("notificationErrorMessage distinguishes network and permission errors", () => {
  assert.match(notificationErrorMessage({}), /Unable to reach/);
  assert.match(notificationErrorMessage({ response: { status: 403 } }), /permission/);
  assert.match(notificationErrorMessage({ response: { status: 500 } }), /temporarily/);
});
