import { apiClient } from "./index";

// ── Catalogue (dropdown data) ──────────────────────────────────────────────────

/**
 * Returns all three classification catalogues in one call.
 * Use this to seed admin UI dropdowns on page load.
 * @returns {{ comboRoles, mealTypes, cuisineTypes }}
 */
export const fetchClassificationCatalogue = () =>
  apiClient.get("/classification/catalogue").then((r) => r.data);

/** All active combo roles (Primary, Accompaniment, Drink, Dessert, Addon). */
export const fetchComboRoles = () =>
  apiClient.get("/classification/combo-roles").then((r) => r.data);

/** All active meal types (Breakfast, Lunch, Dinner, Snack, Anytime). */
export const fetchMealTypes = () =>
  apiClient.get("/classification/meal-types").then((r) => r.data);

/** All active cuisine types (SouthIndian, NorthIndian, Chinese, Italian, …). */
export const fetchCuisineTypes = () =>
  apiClient.get("/classification/cuisine-types").then((r) => r.data);

// ── Per-item classification ────────────────────────────────────────────────────

/**
 * Get the full 3-dimension classification for a specific menu item.
 * @param {number} itemId
 * @returns {{ itemId, itemName, comboRole, mealTypes, cuisineTypes }}
 */
export const fetchItemClassification = (itemId) =>
  apiClient.get(`/classification/items/${itemId}`).then((r) => r.data);

/**
 * Update the classification dimensions for a menu item.
 * @param {number} itemId
 * @param {{ comboRoleId?: number|null, mealTypeIds?: number[], cuisineTypeIds?: number[] }} data
 */
export const updateItemClassification = (itemId, data) =>
  apiClient.patch(`/classification/items/${itemId}`, data).then((r) => r.data);

