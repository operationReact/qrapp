/**
 * In-memory holder for the effective location id.
 *
 * The persisted `active-location` in localStorage only ever holds the base /
 * global selection. Section-level overrides (for regular ADMIN / MANAGER users)
 * are intentionally transient and must NOT be written to localStorage. Non-React
 * service helpers, however, historically defaulted their `locationId` by reading
 * localStorage directly, which would ignore an active section override.
 *
 * This module lets {@link LocationContext} mirror the current effective location
 * id here so those service helpers can scope requests to the overridden location
 * without persisting it. Before the context initializes (or when running outside
 * the app, e.g. in tests) it transparently falls back to the persisted value.
 */

const STORAGE_KEY = "active-location";

let effectiveLocationId; // undefined until the context initializes it
const listeners = new Set();

function readStoredLocationId() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")?.id ?? null;
  } catch {
    return null;
  }
}

/** Update the effective location id (called by LocationContext). */
export function setEffectiveLocationId(id) {
  const next = id ?? null;
  if (effectiveLocationId === next) return;
  effectiveLocationId = next;
  listeners.forEach((listener) => listener(next));
}

/**
 * The effective location id for scoped requests: the in-memory value once the
 * context has initialized it, otherwise the persisted (base) selection.
 */
export function getEffectiveLocationId() {
  return effectiveLocationId !== undefined ? effectiveLocationId : readStoredLocationId();
}

/** Subscribe to effective location changes; returns an unsubscribe function. */
export function subscribeEffectiveLocationId(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
