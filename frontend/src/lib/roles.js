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

export function canAccessAdmin(user) {
  return Boolean(user?.isAdmin || user?.isSuperUser || hasRole(user, CAN_ACCESS_ADMIN));
}
