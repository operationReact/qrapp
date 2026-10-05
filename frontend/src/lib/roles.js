export const ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  KITCHEN_STAFF: "KITCHEN_STAFF",
  CUSTOMER: "CUSTOMER",
};

export const CAN_ACCESS_ADMIN = [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER, ROLE.KITCHEN_STAFF];

export function userRoles(user, locationId = null) {
  const locationAccess = user?.locationAccess || user?.info?.locationAccess;
  const locationAssignment = locationId != null && Array.isArray(locationAccess)
    ? locationAccess.find((access) => String(access?.location?.id) === String(locationId))
    : null;
  const roles = locationAssignment?.role
    || user?.roles || user?.info?.roles || user?.authorities || user?.role || user?.info?.role || [];
  return (Array.isArray(roles) ? roles : [roles])
    .map((role) => String(role?.authority || role?.name || role).replace(/^ROLE_/, "").toUpperCase())
    .map((role) => role === "SUPERUSER" ? ROLE.SUPER_ADMIN : role)
    .filter((role) => Object.values(ROLE).includes(role));
}

export function hasRole(user, roles, locationId = null) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return Boolean(user?.isSuperUser || allowed.some((role) => userRoles(user, locationId).includes(String(role).replace(/^ROLE_/, "").toUpperCase())));
}

export function canManageUsers(user) { return hasRole(user, [ROLE.SUPER_ADMIN]); }
export function canManageLocations(user) { return hasRole(user, [ROLE.SUPER_ADMIN]); }

/**
 * Only SUPER_ADMIN may select the aggregate "All Locations" scope. ADMIN,
 * MANAGER and KITCHEN_STAFF are always confined to a single location.
 */
export function canSelectAllLocations(user) { return hasRole(user, [ROLE.SUPER_ADMIN]); }

export function canAccessAdmin(user) {
  return Boolean(user?.isAdmin || user?.isSuperUser || hasRole(user, CAN_ACCESS_ADMIN));
}

/**
 * True when the user's only admin capability is KITCHEN_STAFF — such users are
 * restricted to the Kitchen Queue and must not reach any other admin surface.
 */
export function isKitchenStaffOnly(user, locationId = null) {
  if (!user) return false;
  if (user.isSuperUser || user.isAdmin) return false;
  const roles = userRoles(user, locationId);
  return roles.includes(ROLE.KITCHEN_STAFF)
    && !roles.includes(ROLE.SUPER_ADMIN)
    && !roles.includes(ROLE.ADMIN)
    && !roles.includes(ROLE.MANAGER);
}
