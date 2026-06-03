import { apiClient } from "./index";

export const getMenu = (opts = {}) => {
  const params = {};
  if (typeof opts.isVeg === "boolean") params.isVeg = opts.isVeg;
  if (opts.category) params.category = opts.category;
  if (typeof opts.recommended === "boolean")
    params.recommended = opts.recommended;
  if (typeof opts.available === "boolean") params.available = opts.available;
  return apiClient.get("/menu", { params }).then((r) => r.data);
};

export const getRecommendedMenu = ({ limit = 6 } = {}) => {
  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(50, Number(limit)))
    : 6;
  return apiClient
    .get("/menu/recommended", { params: { limit: safeLimit } })
    .then((r) => r.data);
};

export const getCategories = () =>
  apiClient.get("/categories").then((r) => r.data);

export const createMenuItem = (data) => {
  if (data instanceof FormData) {
    return apiClient.post("/menu", data).then((r) => r.data);
  }
  return apiClient.post("/menu", data).then((r) => r.data);
};

export const updateMenuItem = (id, data) => {
  if (data instanceof FormData) {
    return apiClient.put(`/menu/${id}`, data).then((r) => r.data);
  }
  return apiClient.put(`/menu/${id}`, data).then((r) => r.data);
};

export const deleteMenuItem = (id) =>
  apiClient.delete(`/menu/${id}`).then((r) => r.data);

export const bulkMenuValidate = (file) => {
  const form = new FormData();
  form.append("file", file);
  return apiClient.post("/admin/menu/bulk-upload/validate", form).then((r) => r.data);
};

export const bulkMenuCommit = (rows, uploadMode = "UPSERT") =>
  apiClient.post("/admin/menu/bulk-upload/commit", { rows, uploadMode }).then((r) => r.data);

export const bulkMenuDownloadTemplate = () =>
  apiClient.get("/admin/menu/bulk-upload/template", { responseType: "blob" }).then((r) => r.data);

// AI image generation
export const generateAiImageOptions = (menuItemId, count = 3, additionalPrompt = null, previousGeneratedUrls = []) =>
  apiClient.post(`/admin/menu-items/${menuItemId}/generate-image-options`, {
    count,
    ...(additionalPrompt?.trim() && { additionalPrompt: additionalPrompt.trim() }),
    ...(previousGeneratedUrls?.length > 0 && { previousGeneratedUrls }),
  }).then((r) => r.data);

export const applyGeneratedImage = (menuItemId, imageUrl, allGeneratedUrls = []) =>
  apiClient.post(`/admin/menu-items/${menuItemId}/apply-generated-image`, { imageUrl, allGeneratedUrls }).then((r) => r.data);


