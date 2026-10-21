import { apiClient } from "./index";
import { prepareImageForUpload } from "./image-upload-utils";

export const getCatalogProducts = (locationId, admin = false, params = {}) =>
  apiClient.get(admin ? "/api/mrp-product/admin/products" : "/api/mrp-product/products", {
    params: { ...(locationId ? { locationId } : {}), ...params },
  }).then((response) => response.data);

export const getCatalogSummary = (locationId) =>
  apiClient.get("/api/mrp-product/admin/summary", { params: { locationId } }).then((response) => response.data);

export const createCatalogProduct = (payload) =>
  apiClient.post("/api/mrp-product/products", payload).then((response) => response.data);

export const updateCatalogProduct = (id, payload) =>
  apiClient.put(`/api/mrp-product/products/${id}`, payload).then((response) => response.data);

export const updateCatalogAssignment = (id, locationId, payload) =>
  apiClient.put(`/api/mrp-product/products/${id}/assignments/${locationId}`, {
    ...payload,
    locationId,
  }).then((response) => response.data);

export const assignCatalogProduct = (id, payload) =>
  apiClient.post(`/api/mrp-product/products/${id}/assignments`, payload).then((response) => response.data);

export const assignCatalogProductBulk = (id, payload) =>
  apiClient.post(`/api/mrp-product/products/${id}/assignments/bulk`, payload).then((response) => response.data);

export const setCatalogProductActive = (id, active, locationId) =>
  apiClient.patch(`/api/mrp-product/products/${id}/status`, null, { params: { active, locationId } })
    .then((response) => response.data);

export const recordCatalogMovement = (id, payload) =>
  apiClient.post(`/api/mrp-product/products/${id}/inventory/movements`, payload).then((response) => response.data);

export const getCatalogHistory = (id, locationId) =>
  apiClient.get(`/api/mrp-product/products/${id}/inventory/history`, {
    params: { locationId, size: 50, sort: "createdAt,desc" },
  }).then((response) => response.data);

export const uploadCatalogImage = (id, locationId, file) => {
  return prepareImageForUpload(file).then((preparedFile) => {
    const form = new FormData();
    form.append("file", preparedFile);
    return apiClient.post(`/api/mrp-product/products/${id}/image`, form, {
      params: { locationId },
    }).then((response) => response.data);
  });
};

export const getSimilarCatalogProducts = (locationId, name) =>
  apiClient.get("/api/mrp-product/admin/products/similar", {
    params: { locationId, name },
  }).then((response) => response.data);

export const getGlobalCatalogProducts = (locationId, { search, brand, veg, hasImage, inLocation, sort, sourceLocationId, page = 0, size = 24 } = {}) =>
  apiClient.get("/api/mrp-product/admin/global-products", {
    params: { locationId, search, brand, veg, hasImage, inLocation, sort, sourceLocationId, page, size },
  }).then((response) => response.data);

export const copyCatalogAssignments = (payload) =>
  apiClient.post("/api/mrp-product/admin/copy-assignments", payload).then((response) => response.data);

export const getGlobalCatalogBrands = (locationId) =>
  apiClient.get("/api/mrp-product/admin/global-products/brands", {
    params: { locationId },
  }).then((response) => response.data);

export const reuseCatalogProductImage = (id, locationId, sourceProductId) =>
  apiClient.post(`/api/mrp-product/products/${id}/image/reuse`, null, {
    params: { locationId, sourceProductId },
  }).then((response) => response.data);


export const generateProductAiImage = (id, file) => {
  const form = new FormData();
  form.append("source", file);
  return apiClient.post(`/api/mrp-product/products/${id}/ai-image/generate`, form)
    .then((response) => response.data);
};

export const approveProductAiImage = (id, sessionId) =>
  apiClient.post(`/api/mrp-product/products/${id}/ai-image/sessions/${sessionId}/approve`)
    .then((response) => response.data);

export const regenerateProductAiImage = (id, sessionId) =>
  apiClient.post(`/api/mrp-product/products/${id}/ai-image/sessions/${sessionId}/regenerate`)
    .then((response) => response.data);

export const discardProductAiImage = (id, sessionId) =>
  apiClient.delete(`/api/mrp-product/products/${id}/ai-image/sessions/${sessionId}`)
    .then((response) => response.data);
