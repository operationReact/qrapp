import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addRecentLocation,
  coordinatesOf,
  distanceKm,
  formatDistance,
  matchesLocationQuery,
  nearbyRows,
  parseRecentLocations,
  resolveRecentLocations,
} from "./locationDiscovery.js";

test("parseRecentLocations ignores malformed storage", () => {
  assert.deepEqual(parseRecentLocations(null), []);
  assert.deepEqual(parseRecentLocations("not json"), []);
  assert.deepEqual(parseRecentLocations('{"id":1}'), []);
  assert.deepEqual(
    parseRecentLocations('[{"id":3,"at":10},{"id":null,"at":1},{"id":"4","at":"x"}]'),
    [{ id: "3", at: 10 }],
  );
});

test("addRecentLocation moves repeats to the front and caps the list", () => {
  let entries = [];
  for (let id = 1; id <= 7; id += 1) entries = addRecentLocation(entries, id, id);
  entries = addRecentLocation(entries, 4, 99);
  assert.equal(entries.length, 5);
  assert.deepEqual(entries[0], { id: "4", at: 99 });
  assert.equal(entries.filter((entry) => entry.id === "4").length, 1);
});

test("resolveRecentLocations drops ids that are no longer available", () => {
  const locations = [{ id: 2, name: "B" }, { id: 5, name: "E" }];
  const resolved = resolveRecentLocations([{ id: "9", at: 1 }, { id: "2", at: 2 }], locations);
  assert.deepEqual(resolved, [{ id: 2, name: "B" }]);
});

test("coordinatesOf rejects missing or non-numeric coordinates", () => {
  assert.equal(coordinatesOf({ latitude: null, longitude: 77 }), null);
  assert.equal(coordinatesOf({ latitude: "abc", longitude: 77 }), null);
  assert.deepEqual(coordinatesOf({ latitude: "17.4", longitude: "78.4" }), { lat: 17.4, lng: 78.4 });
});

test("distanceKm returns roughly correct great-circle distance", () => {
  const hyderabad = { lat: 17.385, lng: 78.4867 };
  const secunderabad = { lat: 17.4399, lng: 78.4983 };
  const km = distanceKm(hyderabad, secunderabad);
  assert.ok(km > 5 && km < 7, `expected ~6 km, got ${km}`);
  assert.equal(distanceKm(hyderabad, hyderabad), 0);
});

test("nearbyRows sorts by distance and counts locations lacking coordinates", () => {
  const origin = { lat: 17.385, lng: 78.4867 };
  const locations = [
    { id: 1, name: "Far", latitude: 12.97, longitude: 77.59 },
    { id: 2, name: "Near", latitude: 17.39, longitude: 78.49 },
    { id: 3, name: "Unknown", latitude: null, longitude: null },
  ];
  const { rows, withoutCoordinates } = nearbyRows(locations, origin, "");
  assert.deepEqual(rows.map((row) => row.location.id), [2, 1]);
  assert.equal(withoutCoordinates, 1);
});

test("matchesLocationQuery matches name, code, city and pin case-insensitively", () => {
  const location = { name: "GeBBS Healthcare", code: "GEBBS", city: "Hyderabad", pinCode: "500081" };
  assert.equal(matchesLocationQuery(location, "gebbs"), true);
  assert.equal(matchesLocationQuery(location, "  HYDER "), true);
  assert.equal(matchesLocationQuery(location, "500081"), true);
  assert.equal(matchesLocationQuery(location, "mumbai"), false);
  assert.equal(matchesLocationQuery(location, ""), true);
});

test("formatDistance uses metres below one kilometre", () => {
  assert.equal(formatDistance(0.42), "420 m");
  assert.equal(formatDistance(0.001), "1 m");
  assert.equal(formatDistance(2.345), "2.3 km");
});
