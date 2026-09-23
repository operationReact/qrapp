import { canAccessAdmin, canSelectAllLocations, isKitchenStaffOnly } from "./roles";
import { activeLocationScopeId, isAllLocationsSelection } from "./allLocations";

/**
 * Section-level location scoping helpers.
 *
 * SUPER_ADMIN keeps the persisted, root-level Location dropdown (including the
 * aggregate "All Locations" option). Regular ADMIN / MANAGER users must not see
 * that root-level selector; instead they may pick among their assigned
 * locations at the section level. A section selection is a transient override
 * that changes the effective location locally WITHOUT mutating the persisted
 * global context (localStorage). KITCHEN_STAFF remain queue-only and never see
 * any location selector.
 */

/**
 * True when the user may use the persisted, root-level location selector with
 * the aggregate "All Locations" scope — SUPER_ADMIN only.
 */
export function canUseRootLocationSelector(user) {
  return canSelectAllLocations(user);
}

/**
 * True when the user may use a section-level location selector: users who can
 * reach the admin area, are not kitchen-only, and are NOT SUPER_ADMIN (the
 * latter use the root-level selector instead).
 */
export function canUseSectionLocationSelector(user) {
  return (
    canAccessAdmin(user)
    && !isKitchenStaffOnly(user)
    && !canSelectAllLocations(user)
  );
}

/**
 * The set of locations that may be chosen at the section level. The aggregate
 * "All Locations" sentinel is never a valid section-level choice for
 * non-SUPER_ADMIN users, so it is filtered out.
 */
export function assignableSectionLocations(availableLocations = []) {
  return (availableLocations || []).filter((location) => !isAllLocationsSelection(location));
}

/**
 * Resolve a section override against the currently available (assigned)
 * locations. Returns the matching location object, or null when the override is
 * empty, the "All Locations" sentinel, or not among the assigned locations.
 */
export function resolveSectionOverride(override, availableLocations = []) {
  if (!override || isAllLocationsSelection(override)) return null;
  return (availableLocations || []).find(
    (location) => String(location.id) === String(override.id),
  ) || null;
}

/**
 * The effective location for a section: the valid section override when one is
 * set, otherwise the base (persisted / default) location.
 */
export function resolveEffectiveLocation({ baseLocation = null, override = null, availableLocations = [] } = {}) {
  return resolveSectionOverride(override, availableLocations) || baseLocation || null;
}

/**
 * The effective `locationId` used for scoped requests / query keys. For
 * non-SUPER_ADMIN users this is always a concrete assigned location id (never
 * the "All Locations" null sentinel), because section overrides and their
 * default location resolve to real locations.
 */
export function resolveEffectiveLocationId(args) {
  return activeLocationScopeId(resolveEffectiveLocation(args));
}
