import { apiClient } from "./index";

export const getCategoryById = (id) =>
  apiClient.get(`/categories/${id}`).then((r) => r.data);

export const getCategoryMenuItems = (id) =>
  apiClient.get("/menu", { params: { categoryId: id } }).then((r) => r.data);
