import { apiClient } from "./index";

export const getCatalogProducts = (locationId, admin = false, params = {}) =>
  apiClient.get(admin ? "/api/catalog/admin/products" : "/api/catalog/products", {
    params: { ...(locationId ? { locationId } : {}), ...params },
  }).then((response) => response.data);

export const getCatalogSummary = (locationId) =>
  apiClient.get("/api/catalog/admin/summary", { params: { locationId } }).then((response) => response.data);

export const createCatalogProduct = (payload) =>
  apiClient.post("/api/catalog/products", payload).then((response) => response.data);

export const updateCatalogProduct = (id, payload) =>
  apiClient.put(`/api/catalog/products/${id}`, payload).then((response) => response.data);

export const updateCatalogAssignment = (id, locationId, payload) =>
  apiClient.put(`/api/catalog/products/${id}/assignments/${locationId}`, {
    ...payload,
    locationId,
  }).then((response) => response.data);

export const assignCatalogProduct = (id, payload) =>
  apiClient.post(`/api/catalog/products/${id}/assignments`, payload).then((response) => response.data);

export const assignCatalogProductBulk = (id, payload) =>
  apiClient.post(`/api/catalog/products/${id}/assignments/bulk`, payload).then((response) => response.data);

export const setCatalogProductActive = (id, active, locationId) =>
  apiClient.patch(`/api/catalog/products/${id}/status`, null, { params: { active, locationId } })
    .then((response) => response.data);

export const recordCatalogMovement = (id, payload) =>
  apiClient.post(`/api/catalog/products/${id}/inventory/movements`, payload).then((response) => response.data);

export const getCatalogHistory = (id, locationId) =>
  apiClient.get(`/api/catalog/products/${id}/inventory/history`, {
    params: { locationId, size: 50, sort: "createdAt,desc" },
  }).then((response) => response.data);

export const uploadCatalogImage = (id, locationId, file) => {
  const form = new FormData();
  form.append("file", file);
  return apiClient.post(`/api/catalog/products/${id}/image`, form, {
    params: { locationId },
  }).then((response) => response.data);
};

export const generateProductAiImage = (id, file) => {
  const form = new FormData();
  form.append("source", file);
  return apiClient.post(`/api/catalog/products/${id}/ai-image/generate`, form)
    .then((response) => response.data);
};

export const approveProductAiImage = (id, sessionId) =>
  apiClient.post(`/api/catalog/products/${id}/ai-image/sessions/${sessionId}/approve`)
    .then((response) => response.data);

export const regenerateProductAiImage = (id, sessionId) =>
  apiClient.post(`/api/catalog/products/${id}/ai-image/sessions/${sessionId}/regenerate`)
    .then((response) => response.data);

export const discardProductAiImage = (id, sessionId) =>
  apiClient.delete(`/api/catalog/products/${id}/ai-image/sessions/${sessionId}`)
    .then((response) => response.data);
