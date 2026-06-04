import { apiClient } from "./index";

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

