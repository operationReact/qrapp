import { apiClient } from "./index";
import { prepareImageForUpload } from "./image-upload-utils";

export const getCategoryById = (id, locationId) =>
  apiClient.get(`/categories/${id}`, { params: { locationId } }).then((r) => r.data);

export const getCategoryMenuItems = (id, locationId) =>
  apiClient.get("/menu", { params: { categoryId: id, locationId } }).then((r) => r.data);

export const getCategories = (locationId) =>
  apiClient.get("/categories", { params: { locationId } }).then((r) => r.data);

export const getProductCategoryImages = (locationId) =>
  apiClient.get("/categories/product-images", { params: { locationId } }).then((r) => r.data);

export const getMrpProductCategories = (locationId) =>
  apiClient.get("/api/mrp-product/admin/categories", { params: { locationId } }).then((r) => r.data);

export const createMrpProductCategory = (payload, locationId) =>
  apiClient.post("/api/mrp-product/admin/categories", payload, { params: { locationId } }).then((r) => r.data);

export const createCategory = (payload, locationId) =>
  apiClient.post("/categories", payload, { params: { locationId } }).then((r) => r.data);

export const updateCategory = (id, payload, locationId) =>
  apiClient.put(`/categories/${id}`, payload, { params: { locationId } }).then((r) => r.data);

export const deleteCategory = (id, locationId) =>
  apiClient.delete(`/categories/${id}`, { params: { locationId } }).then((r) => r.data);

export const getDeletedCategories = (locationId) =>
  apiClient.get("/admin/categories/deleted", { params: { locationId } }).then((r) => r.data);

export const restoreCategory = (id, locationId) =>
  apiClient.patch(`/admin/categories/${id}/restore`, null, { params: { locationId } }).then((r) => r.data);

export const reorderCategory = (id, displayOrder, locationId) =>
  apiClient.patch(`/categories/${id}/order`, { displayOrder }, { params: { locationId } }).then((r) => r.data);

export const uploadCategoryImage = (id, file, locationId) => {
  return prepareImageForUpload(file).then((preparedFile) => {
    const fd = new FormData();
    fd.append("image", preparedFile);
    return apiClient
      .post(`/categories/${id}/image`, fd, { params: { locationId } })
      .then((r) => r.data);
  });
};

export const removeCategoryImage = (id, locationId) =>
  apiClient.delete(`/categories/${id}/image`, { params: { locationId } }).then((r) => r.data);

/** Same-named MRP categories in other locations that already have a shared image. */
export const getCategoryImageSources = (id, locationId) =>
  apiClient.get(`/categories/${id}/image-sources`, { params: { locationId } }).then((r) => r.data);

/** Points this category at the shared image of another category (no duplicate file is stored). */
export const reuseCategoryImage = (id, locationId, sourceCategoryId) =>
  apiClient
    .post(`/categories/${id}/image/reuse`, null, { params: { locationId, sourceCategoryId } })
    .then((r) => r.data);

/** Synchronously generates ONE AI image option for admin preview. Nothing is persisted yet. */
export const generateCategoryImage = (id, locationId, additionalPrompt) =>
  apiClient
    .post(`/categories/${id}/generate-image`, additionalPrompt ? { additionalPrompt } : {}, { params: { locationId } })
    .then((r) => r.data);

/** Persists a previously generated preview image as the category's image. */
export const applyGeneratedCategoryImage = (id, locationId, imageUrl, previousGeneratedUrl) =>
  apiClient
    .post(
      `/categories/${id}/apply-generated-image`,
      { imageUrl, previousGeneratedUrl },
      { params: { locationId } },
    )
    .then((r) => r.data);
