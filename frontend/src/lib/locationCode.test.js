import test from "node:test";
import assert from "node:assert/strict";
import { isLocationCodeFormat, locationCodePreview } from "./indiaStates.js";

test("suggests a code from name and state", () => {
  assert.equal(locationCodePreview("GeBBS Healthcare Solutions", "Telangana"), "GEBBS-TG-001");
  assert.equal(locationCodePreview("Microsoft Hyderabad", "Karnataka"), "MICROSOFT-KA-001");
  assert.equal(locationCodePreview("Bro & Bro Pragati Nagar", "Telangana"), "BROBRO-TG-001");
});

test("returns an empty suggestion until name and state are available", () => {
  assert.equal(locationCodePreview("GeBBS Healthcare Solutions"), "");
  assert.equal(locationCodePreview("   ", "Telangana"), "");
});

test("normalizes punctuation and whitespace", () => {
  assert.equal(locationCodePreview("  ABC  &  Food Court! ", "Andhra Pradesh"), "ABC-AP-001");
});

test("identifies legacy codes that must be regenerated", () => {
  assert.equal(isLocationCodeFormat("GEBBS-TG-001"), true);
  assert.equal(isLocationCodeFormat("MEENAKSHI_TOWERS"), false);
});
