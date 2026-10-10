import test from "node:test";
import assert from "node:assert/strict";
import {
  canManageFinance,
  financeErrorMessage,
  formatDate,
  formatInr,
  formatPeriod,
  parseAmountInput,
  recentPeriods,
  settlementActions,
  statementFilename,
} from "./partnerFinance.js";

test("formatInr groups digits in the Indian system without arithmetic", () => {
  assert.equal(formatInr("1234567.5"), "\u20B912,34,567.50");
  assert.equal(formatInr(0), "\u20B90.00");
  assert.equal(formatInr("999"), "\u20B9999.00");
  assert.equal(formatInr("12345678901234567.89"), "\u20B912,34,56,78,90,12,34,567.89");
  assert.equal(formatInr("-1500.25"), "-\u20B91,500.25");
});

test("formatInr handles missing and malformed values", () => {
  assert.equal(formatInr(null), "\u2014");
  assert.equal(formatInr(undefined), "\u2014");
  assert.equal(formatInr("abc"), "\u2014");
  assert.equal(formatInr("-0.00"), "\u20B90.00");
});

test("period and date formatting avoid timezone shifts", () => {
  assert.equal(formatPeriod("2026-03"), "March 2026");
  assert.equal(formatPeriod("bad"), "bad");
  assert.equal(formatDate("2026-03-01"), "1 Mar 2026");
});

test("recentPeriods walks back across year boundaries", () => {
  assert.deepEqual(recentPeriods(3, "2026-01-15"), ["2026-01", "2025-12", "2025-11"]);
});

test("only PARTNER_ADMIN can manage finance", () => {
  assert.equal(canManageFinance({ info: { roles: ["PARTNER_ADMIN"] } }), true);
  assert.equal(canManageFinance({ info: { roles: ["PARTNER_USER"] } }), false);
  assert.equal(canManageFinance({ isSuperUser: true, info: { roles: [] } }), false);
  assert.equal(canManageFinance(null), false);
});

test("settlementActions follows the settlement lifecycle", () => {
  assert.deepEqual(settlementActions("CALCULATED"), { recalculate: true, adjust: true, approve: true, markPaid: false, void: true });
  assert.deepEqual(settlementActions("APPROVED"), { recalculate: false, adjust: false, approve: false, markPaid: true, void: true });
  assert.equal(Object.values(settlementActions("PAID")).some(Boolean), false);
  assert.equal(Object.values(settlementActions("VOID")).some(Boolean), false);
});

test("parseAmountInput accepts positive amounts with up to two decimals", () => {
  assert.equal(parseAmountInput("120.5"), "120.5");
  assert.equal(parseAmountInput("0.00"), null);
  assert.equal(parseAmountInput("1.234"), null);
  assert.equal(parseAmountInput("-5"), null);
  assert.equal(parseAmountInput(""), null);
});

test("financeErrorMessage maps backend codes", () => {
  assert.match(financeErrorMessage({ response: { status: 409, data: { code: "settlement_already_exists_for_period" } } }), /already exists/);
  assert.match(financeErrorMessage({ response: { status: 403, data: {} } }), /permission/);
  assert.match(financeErrorMessage({}), /Unable to reach/);
});

test("statementFilename falls back safely", () => {
  assert.equal(statementFilename({ id: 7, period: "2026-03" }), "settlement-2026-03-7.pdf");
});
