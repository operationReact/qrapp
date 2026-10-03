package com.broandbro.qrapp.foodcourt.enums;

/**
 * Food Court-specific access role, granted per food court to an opaque user
 * id. Independent of the platform-wide {@code UserRole}; a user may hold
 * different food-court roles at different food courts.
 */
public enum FoodCourtRole {
    FOODCOURT_SUPER_ADMIN,
    FOODCOURT_ADMIN,
    FOODCOURT_MANAGER,
    FOODCOURT_FINANCE,
    FOODCOURT_OPERATIONS,
    FOODCOURT_VIEWER
}
