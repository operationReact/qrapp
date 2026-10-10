import { apiClient } from "./index";

export const getMenu = (opts = {}) => {
  const params = {};
  if (typeof opts.isVeg === "boolean") params.isVeg = opts.isVeg;
  if (opts.category) params.category = opts.category;
  if (typeof opts.recommended === "boolean")
    params.recommended = opts.recommended;
  if (typeof opts.available === "boolean") params.available = opts.available;
  params.locationId = opts.locationId;
  return apiClient.get("/menu", { params }).then((r) => r.data);
};

export const getRetailMenu = ({ locationId, size = 200 } = {}) =>
  apiClient.get("/menu/retail", { params: { locationId, size } }).then((r) => r.data);

export const getRecommendedMenu = ({ locationId, limit = 6 } = {}) => {
  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(50, Number(limit)))
    : 6;
  return apiClient
    .get("/menu/recommended", { params: { locationId, limit: safeLimit } })
    .then((r) => r.data);
};

export const getCategories = (locationId) =>
  apiClient.get("/categories", { params: { locationId } }).then((r) => r.data);

export const createMenuItem = (data, locationId) => {
  const params = { locationId };
  if (data instanceof FormData) {
    return apiClient.post("/menu", data, { params }).then((r) => r.data);
  }
  return apiClient.post("/menu", data, { params }).then((r) => r.data);
};

export const updateMenuItem = (id, data, locationId) => {
  const params = { locationId };
  if (data instanceof FormData) {
    return apiClient.put(`/menu/${id}`, data, { params }).then((r) => r.data);
  }
  return apiClient.put(`/menu/${id}`, data, { params }).then((r) => r.data);
};

export const deleteMenuItem = (id, locationId) =>
  apiClient.delete(`/menu/${id}`, { params: { locationId } }).then((r) => r.data);

export const getDeletedMenuItems = (locationId) =>
  apiClient.get("/admin/menu/deleted", { params: { locationId } }).then((r) => r.data);

export const restoreMenuItem = (id, locationId) =>
  apiClient.patch(`/admin/menu/${id}/restore`, null, { params: { locationId } }).then((r) => r.data);

export const bulkMenuValidate = (file, locationId) => {
  const form = new FormData();
  form.append("file", file);
  return apiClient.post("/admin/menu/bulk-upload/validate", form, { params: { locationId } }).then((r) => r.data);
};

export const bulkMenuCommit = (rows, uploadMode = "UPSERT", locationId) =>
  apiClient.post("/admin/menu/bulk-upload/commit", { rows, uploadMode, locationId }).then((r) => r.data);

export const bulkMenuDownloadTemplate = () =>
  apiClient.get("/admin/menu/bulk-upload/template", { responseType: "blob" });

// AI image generation
export const generateAiImageOptions = (menuItemId, count = 3, additionalPrompt = null, previousGeneratedUrls = [], locationId) =>
  apiClient.post(`/admin/menu-items/${menuItemId}/generate-image-options`, {
    count,
    ...(additionalPrompt?.trim() && { additionalPrompt: additionalPrompt.trim() }),
    ...(previousGeneratedUrls?.length > 0 && { previousGeneratedUrls }),
  }, { params: { locationId } }).then((r) => r.data);

export const applyGeneratedImage = (menuItemId, imageUrl, allGeneratedUrls = [], locationId) =>
  apiClient.post(`/admin/menu-items/${menuItemId}/apply-generated-image`, { imageUrl, allGeneratedUrls }, { params: { locationId } }).then((r) => r.data);

export const generateMissingMenuImages = (locationId, limit = 3) =>
  apiClient.post("/admin/menu-items/generate-missing-images", null, {
    params: { locationId, limit },
  }).then((r) => r.data);

export const getMenuImageGenerationSummary = (locationId) =>
  apiClient.get("/admin/menu-items/image-generation-summary", {
    params: { locationId },
  }).then((r) => r.data);

/**
 * Bulk-update estimated costs for multiple menu items.
 * @param {Array<{id: number, estimatedCost: number|null}>} updates
 */
export const bulkUpdateEstimatedCosts = (updates, locationId) =>
  apiClient.post("/admin/menu/bulk-estimated-cost", updates, { params: { locationId } }).then((r) => r.data);

/**
 * Quick partial update for a menu item (available / recommended / isVeg).
 * Sends only the changed fields as a JSON PUT body.
 * @param {number|string} id
 * @param {Partial<{available: boolean, recommended: boolean, isVeg: boolean}>} patch
 */
export const patchMenuItemQuick = (id, patch, locationId) =>
  apiClient.put(`/menu/${id}`, patch, { params: { locationId }, headers: { "Content-Type": "application/json" } }).then((r) => r.data);

/**
 * Set or clear the estimated cost for a menu item.
 * Uses the dedicated PATCH endpoint that also backfills profitability analytics.
 * @param {number|string} id
 * @param {number|null} estimatedCost  – pass null to clear
 */
export const setItemCost = (id, estimatedCost, locationId) =>
  apiClient.patch(`/menu/${id}/estimated-cost`, { estimatedCost }, { params: { locationId } }).then((r) => r.data);
