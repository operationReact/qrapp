import { apiClient } from "./index";
import { getEffectiveLocationId } from "@/lib/activeLocationStore";

const getActiveLocationId = () =>
  getEffectiveLocationId();

// ── Public (customer-facing) ───────────────────────────────────────────────
export const getPublicCombos = (locationId = getActiveLocationId()) =>
  apiClient
    .get("/api/combos", { params: locationId != null ? { locationId } : {} })
    .then((r) => r.data);

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
