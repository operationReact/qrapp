import { apiClient } from "./index";

export const getHallOfHappiness = ({ page = 0, size = 8, locationId } = {}) =>
  apiClient.get("/api/hall-of-happiness", { params: { page, size, locationId } }).then((r) => r.data);

export const getMyHallOfHappinessPhotos = ({ page = 0, size = 50 } = {}) =>
  apiClient.get("/api/hall-of-happiness/my", { params: { page, size } }).then((r) => r.data);

export const withdrawHallPhoto = (id) =>
  apiClient.delete(`/api/hall-of-happiness/my/${id}`).then((r) => r.data);

export const getMyHallPhotosForOrder = (orderId) =>
  apiClient.get(`/api/hall-of-happiness/my/orders/${orderId}/photos`).then((r) => r.data);

export const uploadHallPhotosForOrder = ({ orderId, photos, consent, termsVersion, onUploadProgress }) => {
  const form = new FormData();
  photos.forEach(({ file, caption }) => {
    form.append("files", file);
    form.append("captions", caption.trim());
  });
  form.append("consent", String(consent));
  form.append("termsVersion", termsVersion);
  return apiClient.post(`/api/hall-of-happiness/my/orders/${orderId}/photos`, form, {
    onUploadProgress,
  }).then((r) => r.data);
};

export const getAdminHallOfHappiness = (params = {}) =>
  apiClient.get("/api/admin/hall-of-happiness", { params }).then((r) => r.data);

export const updateAdminHallPhoto = (id, payload) =>
  apiClient.patch(`/api/admin/hall-of-happiness/photos/${id}`, payload).then((r) => r.data);

export const runHallPhotoAction = (id, action) =>
  (action === "remove"
    ? apiClient.delete(`/api/admin/hall-of-happiness/photos/${id}`)
    : apiClient.post(`/api/admin/hall-of-happiness/photos/${id}/${action}`)).then((r) => r.data);

export const createCuratedHallPhoto = ({ file, caption, eventLabel, description, locationId, global }) => {
  const form = new FormData();
  form.append("file", file);
  if (caption) form.append("caption", caption);
  if (eventLabel) form.append("eventLabel", eventLabel);
  if (description) form.append("description", description);
  if (locationId) form.append("locationId", locationId);
  form.append("global", String(Boolean(global)));
  return apiClient.post("/api/admin/hall-of-happiness/curated", form).then((r) => r.data);
};
