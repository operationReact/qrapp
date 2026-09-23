import { apiClient } from "./index";

/**
 * Fetch eligible and ineligible promotions for the current cart.
 * @param {Object} cartPayload - { restaurantId, subtotal, deliveryFee, items }
 */
export const getCheckoutPromotions = (cartPayload) =>
  apiClient.post("/api/promotions/checkout-eligible", cartPayload).then((r) => r.data);

/**
 * Validate a manually entered promotion code against the current cart.
 * @param {Object} payload - { promotionCode, restaurantId, subtotal, deliveryFee, items }
 */
export const validatePromotion = (payload) =>
  apiClient.post("/api/promotions/validate", payload).then((r) => r.data);

// ── Admin ─────────────────────────────────────────────────────────────────────

export const fetchAllPromotions = (locationId) =>
  apiClient
    .get("/api/admin/promotions", { params: locationId != null ? { locationId } : {} })
    .then((r) => r.data);

export const fetchPromotion = (id) =>
  apiClient.get(`/api/admin/promotions/${id}`).then((r) => r.data);

export const createPromotion = (data) =>
  apiClient.post("/api/admin/promotions", data).then((r) => r.data);

export const togglePromotionStatus = (id) =>
  apiClient.patch(`/api/admin/promotions/${id}/toggle`).then((r) => r.data);

export const updatePromotion = (id, data) =>
  apiClient.put(`/api/admin/promotions/${id}`, data).then((r) => r.data);

export const deletePromotion = (id) =>
  apiClient.delete(`/api/admin/promotions/${id}`).then((r) => r.data);

