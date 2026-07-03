import { apiClient } from "./index";

export const getCategoryById = (id) =>
  apiClient.get(`/categories/${id}`).then((r) => r.data);

export const getCategoryMenuItems = (id) =>
  apiClient.get("/menu", { params: { categoryId: id } }).then((r) => r.data);

export const getCategories = () =>
  apiClient.get("/categories").then((r) => r.data);

export const createCategory = (payload) =>
  apiClient.post("/categories", payload).then((r) => r.data);

export const updateCategory = (id, payload) =>
  apiClient.put(`/categories/${id}`, payload).then((r) => r.data);

export const deleteCategory = (id) =>
  apiClient.delete(`/categories/${id}`).then((r) => r.data);

export const getDeletedCategories = () =>
  apiClient.get("/admin/categories/deleted").then((r) => r.data);

export const restoreCategory = (id) =>
  apiClient.patch(`/admin/categories/${id}/restore`).then((r) => r.data);

