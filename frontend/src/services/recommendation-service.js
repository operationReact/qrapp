import { apiClient } from "./index";
import { getEffectiveLocationId } from "@/lib/activeLocationStore";

const getActiveLocationId = () =>
  getEffectiveLocationId();

// ── Public cart recommendations ───────────────────────────────────────────────

/**
 * Get cart-based recommendations using the 6-level priority engine.
 * @param {{ itemIds: number[], categoryIds: number[], cartTotal: number, maxResults?: number }} payload
 */
export const getCartRecommendations = (payload) =>
  apiClient.post("/api/recommendations/cart", payload).then((r) => r.data);

/**
 * V1 Recommended Bundle — builds a simple "Frequently Bought Together" bundle
 * from the recommendation engine and returns pre-calculated pricing.
 *
 * Returns null (HTTP 204) when no bundle is available for the current cart.
 *
 * @param {{ cartItemIds: number[], cartTotal?: number }} payload
 * @returns {Promise<{bundleItems,originalPrice,savings,finalPrice}|null>}
 */
export const getRecommendedBundle = (payload) =>
  apiClient
    .post("/api/cart/recommended-bundle", payload)
    .then((r) => (r.status === 204 ? null : r.data))
    .catch(() => null); // treat any error as "no bundle available"

/**
 * "Complete Your Meal" — Side + Drink + optional Dessert recommendation
 * with pre-calculated 10% pricing applied server-side.
 *
 * Returns null when no meal is available (HTTP 204 or network error).
 * @param {{ cartItemIds: number[], cartTotal?: number }} payload
 */
export const getMealRecommendation = (payload) =>
  apiClient
    .post("/api/cart/meal-recommendation", payload)
    .then((r) => (r.status === 204 ? null : r.data))
    .catch(() => null);

/**
 * Records a VIEWED or ACCEPTED event for a cart suggestion. Fire-and-forget:
 * callers should not await it or block the ordering flow on failure.
 * @param {{ restaurantId: number, sourceItemId: number, recommendedItemId: number, ruleId: number, interactionType: "VIEWED"|"ACCEPTED" }} payload
 */
export const trackRecommendationInteraction = (payload) =>
  apiClient.post("/api/recommendations/interactions", payload).then((r) => r.data);

// ── Admin: L2 Auto Suggestions ────────────────────────────────────────────────

export const fetchAllSuggestions = (locationId) =>
  apiClient.get("/api/admin/growth/suggestions", { params: { locationId } }).then((r) => r.data);

export const fetchPendingSuggestions = (locationId) =>
  apiClient.get("/api/admin/growth/suggestions/pending", { params: { locationId } }).then((r) => r.data);

export const fetchPendingCount = (locationId) =>
  apiClient.get("/api/admin/growth/suggestions/count", { params: { locationId } }).then((r) => r.data);

export const reviewSuggestion = (id, action, locationId = getActiveLocationId()) =>
  apiClient.post(`/api/admin/growth/suggestions/${id}/review`, { action }, { params: { locationId } }).then((r) => r.data);

export const bulkReviewSuggestions = (ids, action, locationId = getActiveLocationId()) =>
  apiClient.post("/api/admin/growth/suggestions/bulk-review", { ids, action }, { params: { locationId } }).then((r) => r.data);

export const triggerCoOccurrenceScheduler = () =>
  apiClient.post("/api/admin/growth/suggestions/run-scheduler").then((r) => r.data);

// ── Admin: Cart Recommendation Rules ─────────────────────────────────────────

export const fetchRecommendationRules = (locationId) =>
  apiClient.get("/api/admin/recommendation-rules", { params: { locationId } }).then((r) => r.data);

export const createRecommendationRule = (data, locationId = getActiveLocationId()) =>
  apiClient.post("/api/admin/recommendation-rules", data, { params: { locationId } }).then((r) => r.data);

export const updateRecommendationRule = (id, data, locationId = getActiveLocationId()) =>
  apiClient.put(`/api/admin/recommendation-rules/${id}`, data, { params: { locationId } }).then((r) => r.data);

export const toggleRecommendationRule = (id, locationId = getActiveLocationId()) =>
  apiClient.patch(`/api/admin/recommendation-rules/${id}/toggle`, null, { params: { locationId } }).then((r) => r.data);

export const deleteRecommendationRule = (id, locationId = getActiveLocationId()) =>
  apiClient.delete(`/api/admin/recommendation-rules/${id}`, { params: { locationId } }).then((r) => r.data);

export const fetchRuleStats = (locationId) =>
  apiClient.get("/api/admin/recommendation-rules/stats", { params: { locationId } }).then((r) => r.data);

