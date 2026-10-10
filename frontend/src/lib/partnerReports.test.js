import test from "node:test";
import assert from "node:assert/strict";
import {
  businessToday,
  downloadBlob,
  executiveFilename,
  filenameFromDisposition,
  formatRangeLabel,
  formatTotal,
  reportErrorMessage,
  reportFilename,
  reportParams,
  resolveRange,
  responseFilename,
  safeFilename,
  validateRange,
} from "./partnerReports.js";

const TODAY = "2026-10-09";

test("businessToday uses the Asia/Kolkata calendar day", () => {
  assert.equal(businessToday(new Date("2026-10-08T19:00:00Z")), "2026-10-09");
  assert.equal(businessToday(new Date("2026-10-08T17:00:00Z")), "2026-10-08");
});

test("resolveRange covers every preset", () => {
  assert.deepEqual(resolveRange("today", TODAY), { startDate: TODAY, endDate: TODAY });
  assert.deepEqual(resolveRange("yesterday", TODAY), { startDate: "2026-10-08", endDate: "2026-10-08" });
  assert.deepEqual(resolveRange("last7", TODAY), { startDate: "2026-10-03", endDate: TODAY });
  assert.deepEqual(resolveRange("last30", TODAY), { startDate: "2026-09-10", endDate: TODAY });
  assert.deepEqual(resolveRange("thisMonth", TODAY), { startDate: "2026-10-01", endDate: TODAY });
  assert.deepEqual(resolveRange("lastMonth", TODAY), { startDate: "2026-09-01", endDate: "2026-09-30" });
  assert.deepEqual(resolveRange("custom", TODAY, { startDate: "2026-01-01", endDate: "2026-01-31" }), { startDate: "2026-01-01", endDate: "2026-01-31" });
});

test("resolveRange handles month and year boundaries", () => {
  assert.deepEqual(resolveRange("lastMonth", "2026-01-15"), { startDate: "2025-12-01", endDate: "2025-12-31" });
  assert.deepEqual(resolveRange("lastMonth", "2026-03-02"), { startDate: "2026-02-01", endDate: "2026-02-28" });
  assert.deepEqual(resolveRange("lastMonth", "2028-03-02"), { startDate: "2028-02-01", endDate: "2028-02-29" });
  assert.deepEqual(resolveRange("yesterday", "2026-01-01"), { startDate: "2025-12-31", endDate: "2025-12-31" });
});

test("validateRange rejects unusable ranges", () => {
  assert.equal(validateRange({ startDate: "2026-10-01", endDate: TODAY }, TODAY), null);
  assert.equal(validateRange({ startDate: TODAY, endDate: TODAY }, TODAY), null);
  assert.match(validateRange({ startDate: "", endDate: TODAY }, TODAY), /both/);
  assert.match(validateRange({ startDate: "2026-02-30", endDate: TODAY }, TODAY), /valid/);
  assert.match(validateRange({ startDate: "2026-10-05", endDate: "2026-10-01" }, TODAY), /on or before/);
  assert.match(validateRange({ startDate: "2026-10-01", endDate: "2026-10-10" }, TODAY), /future/);
  assert.match(validateRange({ startDate: "2025-01-01", endDate: TODAY }, TODAY), /at most 365/);
  assert.equal(validateRange({ startDate: "2025-10-10", endDate: TODAY }, TODAY), null);
});

test("reportParams only sends a location for location-scoped reports", () => {
  const range = { startDate: "2026-10-03", endDate: TODAY };
  assert.deepEqual(reportParams({ locationId: "7", ...range }, "sales"), { locationId: 7, from: "2026-10-03", to: TODAY });
  assert.deepEqual(reportParams({ locationId: "", ...range }, "sales"), { locationId: undefined, from: "2026-10-03", to: TODAY });
  assert.equal(reportParams({ locationId: "7", ...range }, "finance").locationId, undefined);
  assert.equal(reportParams({ locationId: "7", ...range }).locationId, 7);
});

test("formatTotal formats by unit without inventing values", () => {
  assert.equal(formatTotal({ unit: "COUNT", value: 1234567 }), "12,34,567");
  assert.equal(formatTotal({ unit: "CURRENCY_INR", value: "1500.5" }), "\u20B91,500.50");
  assert.equal(formatTotal({ unit: "PERCENT", value: 12.5 }), "12.5%");
  assert.equal(formatTotal({ unit: "PERCENT", value: null }), "\u2014");
  assert.equal(formatTotal(undefined), "\u2014");
});

test("formatRangeLabel collapses single days", () => {
  assert.equal(formatRangeLabel({ startDate: "2026-10-09", endDate: "2026-10-09" }), "9 Oct 2026");
  assert.equal(formatRangeLabel({ startDate: "2026-10-03", endDate: "2026-10-09" }), "3 Oct 2026 \u2013 9 Oct 2026");
  assert.equal(formatRangeLabel({}), "");
});

test("filenames match the backend format and are sanitized", () => {
  assert.equal(reportFilename("sales", { from: "2026-10-03", to: TODAY }, "csv"), "partner-sales-report-2026-10-03-to-2026-10-09.csv");
  assert.equal(executiveFilename({ from: "2026-10-03", to: TODAY }), "partner-executive-report-2026-10-03-to-2026-10-09.pdf");
  assert.equal(safeFilename("../../etc/passwd", "x.csv"), "etc-passwd");
  assert.equal(safeFilename('a"b\r\nc.csv', "x.csv"), "a-b-c.csv");
  assert.equal(safeFilename("", "fallback.csv"), "fallback.csv");
  assert.equal(safeFilename("...", "fallback.csv"), "fallback.csv");
});

test("filenameFromDisposition reads quoted, bare and encoded names", () => {
  assert.equal(filenameFromDisposition('attachment; filename="report.csv"'), "report.csv");
  assert.equal(filenameFromDisposition("attachment; filename=report.csv"), "report.csv");
  assert.equal(filenameFromDisposition("attachment; filename*=UTF-8''my%20report.csv"), "my report.csv");
  assert.equal(filenameFromDisposition(undefined), null);
  assert.equal(responseFilename({ headers: { "content-disposition": 'attachment; filename="a/b.csv"' } }, "x.csv"), "a-b.csv");
  assert.equal(responseFilename({ headers: {} }, "x.csv"), "x.csv");
  assert.equal(responseFilename({ headers: { get: () => 'attachment; filename="ok.pdf"' } }, "x.pdf"), "ok.pdf");
});

test("downloadBlob clicks a temporary anchor and revokes the object URL", () => {
  const calls = [];
  const link = { click: () => calls.push("click"), remove: () => calls.push("remove") };
  const env = {
    document: { createElement: (tag) => { calls.push(`create:${tag}`); return link; }, body: { appendChild: () => calls.push("append") } },
    URL: { createObjectURL: () => "blob:test", revokeObjectURL: (url) => calls.push(`revoke:${url}`) },
    setTimeout: (callback) => callback(),
  };
  const name = downloadBlob(new Blob(["a,b"]), "../bad name.csv", "text/csv", env);
  assert.equal(name, "bad-name.csv");
  assert.equal(link.href, "blob:test");
  assert.equal(link.download, "bad-name.csv");
  assert.deepEqual(calls, ["create:a", "append", "click", "remove", "revoke:blob:test"]);
});

test("reportErrorMessage maps backend codes and network failures", () => {
  assert.match(reportErrorMessage({ response: { status: 400, data: { code: "report_range_too_long" } } }), /too long/);
  assert.match(reportErrorMessage({ response: { status: 403, data: {} } }), /permission/);
  assert.match(reportErrorMessage({}), /Unable to reach/);
  assert.equal(reportErrorMessage({ response: { status: 500, data: {} } }, "fallback"), "fallback");
});
