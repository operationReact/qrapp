import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_LOCATIONS,
  ALL_LOCATIONS_ID,
  activeLocationScopeId,
  isAllLocationsSelection,
} from "./allLocations.js";

test("isAllLocationsSelection detects the sentinel option", () => {
  assert.equal(isAllLocationsSelection(ALL_LOCATIONS), true);
  assert.equal(isAllLocationsSelection({ id: ALL_LOCATIONS_ID }), true);
  assert.equal(isAllLocationsSelection({ isAllLocations: true }), true);
});

test("isAllLocationsSelection is false for real locations and empty values", () => {
  assert.equal(isAllLocationsSelection({ id: 5, name: "Pragati Nagar" }), false);
  assert.equal(isAllLocationsSelection(null), false);
  assert.equal(isAllLocationsSelection(undefined), false);
});

test("All Locations is distinct from null / no selection", () => {
  // Distinct object identity and id, yet resolves to null scope for requests.
  assert.notEqual(ALL_LOCATIONS, null);
  assert.equal(ALL_LOCATIONS.id, ALL_LOCATIONS_ID);
  assert.equal(isAllLocationsSelection(null), false);
});

test("activeLocationScopeId omits locationId (null) for All Locations", () => {
  assert.equal(activeLocationScopeId(ALL_LOCATIONS), null);
  assert.equal(activeLocationScopeId({ id: ALL_LOCATIONS_ID }), null);
});

test("activeLocationScopeId returns the real id for a specific location", () => {
  assert.equal(activeLocationScopeId({ id: 7 }), 7);
  assert.equal(activeLocationScopeId(null), null);
  assert.equal(activeLocationScopeId({}), null);
});
