import { apiClient } from "./index";
import { getEffectiveLocationId } from "@/lib/activeLocationStore";

const getActiveLocationId = () =>
  getEffectiveLocationId();

// ── Public (customer-facing) ───────────────────────────────────────────────
export const getPublicCombos = (locationId = getActiveLocationId()) =>
  apiClient
    .get("/api/combos", { params: locationId != null ? { locationId } : {} })
    .then((r) => r.data);

// ── Analytics ──────────────────────────────────────────────────────────────
export const getComboAnalyticsSummary = (locationId = getActiveLocationId()) =>
  apiClient
    .get("/api/admin/combos/analytics/summary", {
      params: locationId != null ? { locationId } : {},
    })
    .then((r) => r.data);

// ── Signature Products (combo-attachable) ──────────────────────────────────
export const listSignatureProducts = (params = {}) =>
  apiClient
    .get("/api/admin/signature-products", { params })
    .then((r) => r.data);

// ── List ───────────────────────────────────────────────────────────────────
export const listCombos = (params = {}) =>
  apiClient.get("/api/admin/combos", {
    params: { ...params, locationId: params.locationId || getActiveLocationId() },
  }).then((r) => r.data);

// ── Single ─────────────────────────────────────────────────────────────────
export const getCombo = (id, locationId = getActiveLocationId()) =>
  apiClient.get(`/api/admin/combos/${id}`, { params: { locationId } }).then((r) => r.data);

// ── Create ─────────────────────────────────────────────────────────────────
export const createCombo = (data, locationId = getActiveLocationId()) =>
  apiClient.post("/api/admin/combos", data, { params: { locationId } }).then((r) => r.data);

// ── Update ─────────────────────────────────────────────────────────────────
export const updateCombo = (id, data, locationId = getActiveLocationId()) =>
  apiClient.put(`/api/admin/combos/${id}`, data, { params: { locationId } }).then((r) => r.data);

// ── Status ─────────────────────────────────────────────────────────────────
export const updateComboStatus = (id, status, locationId = getActiveLocationId()) =>
  apiClient.patch(`/api/admin/combos/${id}/status`, { status }, { params: { locationId } }).then((r) => r.data);

// ── Delete ─────────────────────────────────────────────────────────────────
export const deleteCombo = (id, locationId = getActiveLocationId()) =>
  apiClient.delete(`/api/admin/combos/${id}`, { params: { locationId } }).then((r) => r.data);

// ── AI Combo Opportunities ─────────────────────────────────────────────────

/** List AI-generated combo opportunities, optionally filtered by status. */
export const listComboOpportunities = (params = {}) =>
  apiClient
    .get("/api/admin/growth/combo-opportunities", {
      params: { ...params, locationId: params.locationId || getActiveLocationId() },
    })
    .then((r) => r.data);

/**
 * Approve or reject an opportunity.
 * @param {number} id
 * @param {"APPROVE"|"REJECT"} action
 */
export const reviewComboOpportunity = (id, action, locationId = getActiveLocationId()) =>
  apiClient
    .post(`/api/admin/growth/combo-opportunities/${id}/review`, { action }, { params: { locationId } })
    .then((r) => r.data);

/** Persist edits to an AI suggestion (name, price, items). */
export const updateComboOpportunity = (id, data, locationId = getActiveLocationId()) =>
  apiClient.put(`/api/admin/growth/combo-opportunities/${id}`, data, { params: { locationId } }).then((r) => r.data);

/** Trigger the AI analysis that generates new combo opportunities. */
export const triggerComboAnalysis = () =>
  apiClient.post("/api/admin/growth/combo-opportunities/analyze").then((r) => r.data);

/** Fetch pairs frequently bought together that have no combo yet. */
export const listMissedOpportunities = (locationId) =>
  apiClient.get("/api/admin/growth/combo-opportunities/missed", { params: { locationId } }).then((r) => r.data);
