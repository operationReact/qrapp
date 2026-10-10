import test from "node:test";
import assert from "node:assert/strict";
import { getPartnerGreeting, getPartnerLogoUrl } from "./partnerBranding.js";

const kolkataDate = (value) => new Date(`${value}+05:30`);

test("getPartnerGreeting uses morning before noon in Asia/Kolkata", () => {
  assert.equal(getPartnerGreeting(kolkataDate("2026-10-09T11:59:59")), "Good morning");
});

test("getPartnerGreeting switches to afternoon at noon in Asia/Kolkata", () => {
  assert.equal(getPartnerGreeting(kolkataDate("2026-10-09T12:00:00")), "Good afternoon");
  assert.equal(getPartnerGreeting(kolkataDate("2026-10-09T16:59:59")), "Good afternoon");
});

test("getPartnerGreeting switches to evening at 5 PM and remains correct after midnight", () => {
  assert.equal(getPartnerGreeting(kolkataDate("2026-10-09T17:00:00")), "Good evening");
  assert.equal(getPartnerGreeting(kolkataDate("2026-10-10T00:00:00")), "Good morning");
});

test("getPartnerLogoUrl keeps the registered partner logo distinct from the Bro logo", () => {
  assert.equal(
    getPartnerLogoUrl({ partnerCode: "URBANWRK", logoUrl: "/bro-logo.png" }),
    "/assets/partners/urban-work-logo.png",
  );
  assert.equal(
    getPartnerLogoUrl({ partnerCode: "OTHER", logoUrl: "/assets/partners/other.png" }),
    "/assets/partners/other.png",
  );
});
