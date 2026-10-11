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
  return prepareCatalogImage(file).then((preparedFile) => {
    const form = new FormData();
    form.append("file", preparedFile);
    return apiClient.post(`/api/catalog/products/${id}/image`, form, {
      params: { locationId },
    }).then((response) => response.data);
  });
};

const MAX_UPLOAD_BYTES = 900 * 1024;
const MAX_IMAGE_DIMENSION = 1800;

async function prepareCatalogImage(file) {
  if (!file) return file;
  const extension = file.name.match(/\.(png|jpe?g|webp)$/i)?.[1]?.toLowerCase();
  const baseName = file.name.replace(/(\.(?:png|jpe?g|webp))+$/i, "");
  const normalizedName = extension ? `${baseName}.${extension}` : file.name;
  if (file.size <= MAX_UPLOAD_BYTES) {
    return normalizedName === file.name ? file : new File([file], normalizedName, { type: file.type });
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare image");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > MAX_UPLOAD_BYTES && quality > 0.4) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image is too large even after compression");
  }
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Unable to compress image"));
    }, "image/jpeg", quality);
  });
}

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
