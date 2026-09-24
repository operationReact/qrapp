import { apiClient } from "./index";

export const getHallOfHappiness = ({ page = 0, size = 8 } = {}) =>
  apiClient.get("/api/hall-of-happiness", { params: { page, size } }).then((r) => r.data);

export const getMyHallOfHappinessPhotos = ({ page = 0, size = 50 } = {}) =>
  apiClient.get("/api/hall-of-happiness/my", { params: { page, size } }).then((r) => r.data);

export const setHallOfHappinessConsent = (id, granted) =>
  apiClient.post(`/api/hall-of-happiness/my/${id}/consent`, null, {
    params: { granted },
  }).then((r) => r.data);

export const getMyHallPhotosForOrder = (orderId) =>
  apiClient.get(`/api/hall-of-happiness/my/orders/${orderId}/photos`).then((r) => r.data);

export const uploadHallPhotosForOrder = ({ orderId, files, caption, consent, onUploadProgress }) => {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  if (caption?.trim()) form.append("caption", caption.trim());
  form.append("consent", String(consent));
  return apiClient.post(`/api/hall-of-happiness/my/orders/${orderId}/photos`, form, {
    onUploadProgress,
  }).then((r) => r.data);
};

export const getAdminHallOfHappiness = (params = {}) =>
  apiClient.get("/api/admin/hall-of-happiness", { params }).then((r) => r.data);

export const uploadAdminHallPhoto = ({ orderId, file, caption }) => {
  const form = new FormData();
  form.append("orderId", orderId);
  form.append("file", file);
  if (caption) form.append("caption", caption);
  return apiClient.post("/api/admin/hall-of-happiness/photos", form).then((r) => r.data);
};

export const updateAdminHallPhoto = (id, payload) =>
  apiClient.patch(`/api/admin/hall-of-happiness/photos/${id}`, payload).then((r) => r.data);

export const runHallPhotoAction = (id, action) =>
  (action === "remove"
    ? apiClient.delete(`/api/admin/hall-of-happiness/photos/${id}`)
    : apiClient.post(`/api/admin/hall-of-happiness/photos/${id}/${action}`)).then((r) => r.data);
