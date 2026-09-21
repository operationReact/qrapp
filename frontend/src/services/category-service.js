import { apiClient } from "./index";

export const getCategoryById = (id, locationId) =>
  apiClient.get(`/categories/${id}`, { params: { locationId } }).then((r) => r.data);

export const getCategoryMenuItems = (id, locationId) =>
  apiClient.get("/menu", { params: { categoryId: id, locationId } }).then((r) => r.data);

export const getCategories = (locationId) =>
  apiClient.get("/categories", { params: { locationId } }).then((r) => r.data);

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
