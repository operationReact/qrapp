import { API } from "./api";

// ── Analytics ──────────────────────────────────────────────────────────────
export const getComboAnalyticsSummary = () =>
  API.get("/api/admin/combos/analytics/summary").then((r) => r.data);

// ── List ───────────────────────────────────────────────────────────────────
export const listCombos = (params = {}) =>
  API.get("/api/admin/combos", { params }).then((r) => r.data);

// ── Single ─────────────────────────────────────────────────────────────────
export const getCombo = (id) =>
  API.get(`/api/admin/combos/${id}`).then((r) => r.data);

// ── Create ─────────────────────────────────────────────────────────────────
export const createCombo = (data) =>
  API.post("/api/admin/combos", data).then((r) => r.data);

// ── Update ─────────────────────────────────────────────────────────────────
export const updateCombo = (id, data) =>
  API.put(`/api/admin/combos/${id}`, data).then((r) => r.data);

// ── Status ─────────────────────────────────────────────────────────────────
export const updateComboStatus = (id, status) =>
  API.patch(`/api/admin/combos/${id}/status`, { status }).then((r) => r.data);

// ── Delete ─────────────────────────────────────────────────────────────────
export const deleteCombo = (id) =>
  API.delete(`/api/admin/combos/${id}`).then((r) => r.data);

