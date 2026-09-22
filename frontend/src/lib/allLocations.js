/**
 * "All Locations" is an explicit, SUPER_ADMIN-only selection that is distinct
 * from "no location selected" (null). When active, scoped admin/analytics
 * requests must OMIT `locationId` so the backend aggregates across every
 * location. It is represented by a sentinel option whose `id` never collides
 * with a real location id.
 */
export const ALL_LOCATIONS_ID = "__ALL__";

export const ALL_LOCATIONS = Object.freeze({
  id: ALL_LOCATIONS_ID,
  code: "ALL_LOCATIONS",
  name: "All Locations",
  isAllLocations: true,
});

/** True when the given selection represents the aggregate "All Locations" option. */
export function isAllLocationsSelection(location) {
  if (!location) return false;
  return location.isAllLocations === true || String(location.id) === ALL_LOCATIONS_ID;
}

/**
 * Resolve the `locationId` used for scoped requests / query keys. The aggregate
 * "All Locations" selection resolves to null so callers omit `locationId`
 * (the existing `locationId != null` convention), yielding cross-location data.
 */
export function activeLocationScopeId(location) {
  if (!location || isAllLocationsSelection(location)) return null;
  return location.id ?? null;
}
