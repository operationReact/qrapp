import { apiClient } from "./index";

// ── Public ─────────────────────────────────────────────────────────────────

/** Returns all currently active BYOC campaigns */
export const getActiveComboCampaigns = () =>
  apiClient.get("/api/combo-campaigns").then((r) => r.data);

/**
 * Evaluates the current cart against all active campaigns.
 * @param {CartContext} cartPayload  - same shape as useCheckoutPromotions payload
 */
export const evaluateComboCart = (cartPayload) =>
  apiClient.post("/api/combo-campaigns/evaluate", cartPayload).then((r) => r.data);

// ── Admin ───────────────────────────────────────────────────────────────────

export const listComboCampaigns = () =>
  apiClient.get("/api/admin/combo-campaigns").then((r) => r.data);

export const getComboCampaign = (id) =>
  apiClient.get(`/api/admin/combo-campaigns/${id}`).then((r) => r.data);

export const createComboCampaign = (data) =>
  apiClient.post("/api/admin/combo-campaigns", data).then((r) => r.data);

export const updateComboCampaign = (id, data) =>
  apiClient.put(`/api/admin/combo-campaigns/${id}`, data).then((r) => r.data);

export const updateComboCampaignStatus = (id, status) =>
  apiClient
    .patch(`/api/admin/combo-campaigns/${id}/status`, { status })
    .then((r) => r.data);

export const deleteComboCampaign = (id) =>
  apiClient.delete(`/api/admin/combo-campaigns/${id}`).then((r) => r.data);

