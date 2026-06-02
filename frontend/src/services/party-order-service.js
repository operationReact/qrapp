import { apiClient } from "./index";

// ── User APIs ────────────────────────────────────────────────────────────────

export const createPartyOrder = (data) =>
  apiClient.post("/party-order/create", data).then((r) => r.data);

export const getMyPartyOrders = () =>
  apiClient.get("/party-order/my-orders").then((r) => r.data);

export const getMyPartyOrder = (id) =>
  apiClient.get(`/party-order/${id}`).then((r) => r.data);

export const acceptPartyOrderEstimate = (id) =>
  apiClient.post(`/party-order/${id}/accept-estimate`).then((r) => r.data);

export const rejectPartyOrderEstimate = (id) =>
  apiClient.post(`/party-order/${id}/reject`).then((r) => r.data);

export const payPartyOrderAdvance = (id) =>
  apiClient.post(`/party-order/${id}/pay-advance`).then((r) => r.data);

export const payPartyOrderBalance = (id) =>
  apiClient.post(`/party-order/${id}/pay-balance`).then((r) => r.data);

export const requestPartyOrderCallback = (id) =>
  apiClient.post(`/party-order/${id}/callback-request`).then((r) => r.data);

export const cancelMyPartyOrder = (id) =>
  apiClient.post(`/party-order/${id}/cancel`).then((r) => r.data);

// ── Admin APIs ───────────────────────────────────────────────────────────────

export const getPartyOrdersAdmin = () =>
  apiClient.get("/admin/party-orders").then((r) => r.data);

export const submitPartyOrderEstimate = (orderId, data) =>
  apiClient.post(`/admin/party-orders/${orderId}/estimate`, data).then((r) => r.data);

export const updatePartyOrderStatus = (orderId, status) =>
  apiClient.patch(`/admin/party-orders/${orderId}/status`, { status }).then((r) => r.data);

export const markPartyOrderDelivered = (orderId) =>
  apiClient.post(`/admin/party-orders/${orderId}/deliver`).then((r) => r.data);

