import { apiClient } from "./index";

// ── Public (customer-facing) ───────────────────────────────────────────────
export const getPublicCombos = () =>
  apiClient.get("/api/combos").then((r) => r.data);

// ── Analytics ──────────────────────────────────────────────────────────────
export const getComboAnalyticsSummary = () =>
  apiClient.get("/api/admin/combos/analytics/summary").then((r) => r.data);

// ── Signature Products (combo-attachable) ──────────────────────────────────
export const listSignatureProducts = (params = {}) =>
  apiClient
    .get("/api/admin/signature-products", { params })
    .then((r) => r.data);

// ── List ───────────────────────────────────────────────────────────────────
export const listCombos = (params = {}) =>
  apiClient.get("/api/admin/combos", { params }).then((r) => r.data);

// ── Single ─────────────────────────────────────────────────────────────────
export const getCombo = (id) =>
  apiClient.get(`/api/admin/combos/${id}`).then((r) => r.data);

// ── Create ─────────────────────────────────────────────────────────────────
export const createCombo = (data) =>
  apiClient.post("/api/admin/combos", data).then((r) => r.data);

// ── Update ─────────────────────────────────────────────────────────────────
export const updateCombo = (id, data) =>
  apiClient.put(`/api/admin/combos/${id}`, data).then((r) => r.data);

// ── Status ─────────────────────────────────────────────────────────────────
export const updateComboStatus = (id, status) =>
  apiClient.patch(`/api/admin/combos/${id}/status`, { status }).then((r) => r.data);

// ── Delete ─────────────────────────────────────────────────────────────────
export const deleteCombo = (id) =>
  apiClient.delete(`/api/admin/combos/${id}`).then((r) => r.data);

// ── AI Combo Opportunities ─────────────────────────────────────────────────

/** List AI-generated combo opportunities, optionally filtered by status. */
export const listComboOpportunities = (params = {}) =>
  apiClient.get("/api/admin/growth/combo-opportunities", { params }).then((r) => r.data);

/**
 * Approve or reject an opportunity.
 * @param {number} id
 * @param {"APPROVE"|"REJECT"} action
 */
export const reviewComboOpportunity = (id, action) =>
  apiClient
    .post(`/api/admin/growth/combo-opportunities/${id}/review`, { action })
    .then((r) => r.data);

/** Persist edits to an AI suggestion (name, price, items). */
export const updateComboOpportunity = (id, data) =>
  apiClient.put(`/api/admin/growth/combo-opportunities/${id}`, data).then((r) => r.data);

/** Trigger the AI analysis that generates new combo opportunities. */
export const triggerComboAnalysis = () =>
  apiClient.post("/api/admin/growth/combo-opportunities/analyze").then((r) => r.data);

/** Fetch pairs frequently bought together that have no combo yet. */
export const listMissedOpportunities = () =>
  apiClient.get("/api/admin/growth/combo-opportunities/missed").then((r) => r.data);

