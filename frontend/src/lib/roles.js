export const ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  KITCHEN_STAFF: "KITCHEN_STAFF",
  CUSTOMER: "CUSTOMER",
};

export const CAN_ACCESS_ADMIN = [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER, ROLE.KITCHEN_STAFF];

export function userRoles(user) {
  const roles = user?.roles || user?.info?.roles || user?.authorities || user?.role || user?.info?.role || [];
  return (Array.isArray(roles) ? roles : [roles])
    .map((role) => String(role?.authority || role?.name || role).replace(/^ROLE_/, "").toUpperCase())
    .map((role) => role === "SUPERUSER" ? ROLE.SUPER_ADMIN : role)
    .filter((role) => Object.values(ROLE).includes(role));
}

export function hasRole(user, roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return Boolean(user?.isSuperUser || allowed.some((role) => userRoles(user).includes(String(role).replace(/^ROLE_/, "").toUpperCase())));
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
export function isKitchenStaffOnly(user) {
  if (!user) return false;
  if (user.isSuperUser || user.isAdmin) return false;
  const roles = userRoles(user);
  return roles.includes(ROLE.KITCHEN_STAFF)
    && !roles.includes(ROLE.SUPER_ADMIN)
    && !roles.includes(ROLE.ADMIN)
    && !roles.includes(ROLE.MANAGER);
}
