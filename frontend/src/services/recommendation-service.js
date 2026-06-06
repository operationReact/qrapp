import { apiClient } from "./index";

// ── Public cart recommendations ───────────────────────────────────────────────

/**
 * Get cart-based recommendations using the 6-level priority engine.
 * @param {{ itemIds: number[], categoryIds: number[], cartTotal: number, maxResults?: number }} payload
 */
export const getCartRecommendations = (payload) =>
  apiClient.post("/api/recommendations/cart", payload).then((r) => r.data);

// ── Admin: L1 Manual Recommendations ─────────────────────────────────────────

export const fetchAllRecommendations = () =>
  apiClient.get("/api/admin/growth/recommendations").then((r) => r.data);

export const fetchRecommendationsForItem = (itemId) =>
  apiClient.get(`/api/admin/growth/recommendations/source/${itemId}`).then((r) => r.data);

export const addRecommendation = (data) =>
  apiClient.post("/api/admin/growth/recommendations", data).then((r) => r.data);

export const updateRecommendationOrder = (id, displayOrder) =>
  apiClient.patch(`/api/admin/growth/recommendations/${id}/order`, { displayOrder }).then((r) => r.data);

export const toggleRecommendation = (id) =>
  apiClient.patch(`/api/admin/growth/recommendations/${id}/toggle`).then((r) => r.data);

export const deleteRecommendation = (id) =>
  apiClient.delete(`/api/admin/growth/recommendations/${id}`).then((r) => r.data);

// ── Admin: L2 Auto Suggestions ────────────────────────────────────────────────

export const fetchAllSuggestions = () =>
  apiClient.get("/api/admin/growth/suggestions").then((r) => r.data);

export const fetchPendingSuggestions = () =>
  apiClient.get("/api/admin/growth/suggestions/pending").then((r) => r.data);

export const fetchPendingCount = () =>
  apiClient.get("/api/admin/growth/suggestions/count").then((r) => r.data);

export const reviewSuggestion = (id, action) =>
  apiClient.post(`/api/admin/growth/suggestions/${id}/review`, { action }).then((r) => r.data);

export const bulkReviewSuggestions = (ids, action) =>
  apiClient.post("/api/admin/growth/suggestions/bulk-review", { ids, action }).then((r) => r.data);

export const triggerCoOccurrenceScheduler = () =>
  apiClient.post("/api/admin/growth/suggestions/run-scheduler").then((r) => r.data);

// ── Admin: L4 Upsell Rules ────────────────────────────────────────────────────

export const fetchAllUpsellRules = () =>
  apiClient.get("/api/admin/growth/upsell-rules").then((r) => r.data);

export const createUpsellRule = (data) =>
  apiClient.post("/api/admin/growth/upsell-rules", data).then((r) => r.data);

export const updateUpsellRule = (id, data) =>
  apiClient.put(`/api/admin/growth/upsell-rules/${id}`, data).then((r) => r.data);

export const toggleUpsellRule = (id) =>
  apiClient.patch(`/api/admin/growth/upsell-rules/${id}/toggle`).then((r) => r.data);

export const deleteUpsellRule = (id) =>
  apiClient.delete(`/api/admin/growth/upsell-rules/${id}`).then((r) => r.data);

// ── Admin: L5 Category Pairings ───────────────────────────────────────────────

export const fetchAllCategoryPairings = () =>
  apiClient.get("/api/admin/growth/category-pairings").then((r) => r.data);

export const createCategoryPairing = (data) =>
  apiClient.post("/api/admin/growth/category-pairings", data).then((r) => r.data);

export const toggleCategoryPairing = (id) =>
  apiClient.patch(`/api/admin/growth/category-pairings/${id}/toggle`).then((r) => r.data);

export const deleteCategoryPairing = (id) =>
  apiClient.delete(`/api/admin/growth/category-pairings/${id}`).then((r) => r.data);

