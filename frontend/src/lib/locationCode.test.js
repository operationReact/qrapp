import test from "node:test";
import assert from "node:assert/strict";
import { locationNameAbbreviation } from "./indiaStates.js";

function suggestedCode(name) {
  const prefix = locationNameAbbreviation(name);
  return prefix ? `${prefix}-001` : "";
}

test("suggests a code from the name alone", () => {
  assert.equal(suggestedCode("GeBBS Healthcare Solutions"), "GEBBS-001");
  assert.equal(suggestedCode("Microsoft Hyderabad"), "MICROSOFT-001");
  assert.equal(suggestedCode("Bro & Bro Pragati Nagar"), "BROBRO-001");
});

test("returns an empty suggestion for a blank name", () => {
  assert.equal(suggestedCode("   "), "");
});

test("normalizes punctuation and whitespace", () => {
  assert.equal(suggestedCode("  ABC  &  Food Court! "), "ABC-001");
});
