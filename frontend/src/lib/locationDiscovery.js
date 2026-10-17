export const RECENT_LOCATIONS_KEY = "recent-locations";
export const RECENT_LOCATION_LIMIT = 5;

const EARTH_RADIUS_KM = 6371;

export function parseRecentLocations(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry
        && (typeof entry.id === "string" || typeof entry.id === "number")
        && Number.isFinite(Number(entry.at)))
      .map((entry) => ({ id: String(entry.id), at: Number(entry.at) }))
      .slice(0, RECENT_LOCATION_LIMIT);
  } catch {
    return [];
  }
}

export function addRecentLocation(entries, id, now) {
  const key = String(id);
  return [{ id: key, at: now }, ...entries.filter((entry) => entry.id !== key)]
    .slice(0, RECENT_LOCATION_LIMIT);
}

export function resolveRecentLocations(entries, locations) {
  const byId = new Map((locations || []).map((location) => [String(location.id), location]));
  return entries.map((entry) => byId.get(entry.id)).filter(Boolean);
}

export function coordinatesOf(location) {
  const lat = Number(location?.latitude);
  const lng = Number(location?.longitude);
  if (location?.latitude == null || location?.longitude == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function distanceKm(from, to) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function matchesLocationQuery(location, query) {
  const needle = (query || "").trim().toLowerCase();
  if (!needle) return true;
  return [
    location?.name,
    location?.code,
    location?.addressLine1,
    location?.addressLine2,
    location?.landmark,
    location?.city,
    location?.district,
    location?.stateUt,
    location?.pinCode,
    location?.address,
  ].some((field) => typeof field === "string" && field.toLowerCase().includes(needle));
}

export function nearbyRows(locations, origin, query) {
  const rows = [];
  let withoutCoordinates = 0;
  for (const location of locations || []) {
    if (!matchesLocationQuery(location, query)) continue;
    const coords = coordinatesOf(location);
    if (!coords) {
      withoutCoordinates += 1;
      continue;
    }
    rows.push({ location, distanceKm: distanceKm(origin, coords) });
  }
  rows.sort((a, b) => a.distanceKm - b.distanceKm);
  return { rows, withoutCoordinates };
}

export function formatDistance(km) {
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  return `${km.toFixed(1)} km`;
}
