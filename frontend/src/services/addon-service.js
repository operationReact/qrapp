import { apiClient } from "./index";

export const fetchAddonGroups = (locationId) =>
  apiClient.get("/api/admin/addon-groups", { params: { locationId } }).then((r) => r.data);

export const createAddonGroup = (locationId, body) =>
  apiClient.post("/api/admin/addon-groups", body, { params: { locationId } }).then((r) => r.data);

export const updateAddonGroup = (locationId, groupId, body) =>
  apiClient.put(`/api/admin/addon-groups/${groupId}`, body, { params: { locationId } }).then((r) => r.data);

export const deleteAddonGroup = (locationId, groupId) =>
  apiClient.delete(`/api/admin/addon-groups/${groupId}`, { params: { locationId } });

export const fetchAttachedAddonGroupIds = (locationId, itemId) =>
  apiClient.get(`/api/admin/addon-groups/menu-items/${itemId}`, { params: { locationId } }).then((r) => r.data);

export const attachAddonGroup = (locationId, itemId, addonGroupId) =>
  apiClient.post(`/api/admin/addon-groups/menu-items/${itemId}`, { addonGroupId }, { params: { locationId } });

export const detachAddonGroup = (locationId, itemId, groupId) =>
  apiClient.delete(`/api/admin/addon-groups/menu-items/${itemId}/${groupId}`, { params: { locationId } });

// ── Customer-facing (public) ────────────────────────────────────────────────

export const fetchItemAddons = (locationId, itemId) =>
  apiClient.get(`/api/menu/items/${itemId}/addons`, { params: { locationId } }).then((r) => r.data);

export const fetchItemIdsWithAddons = (locationId) =>
  apiClient.get("/api/menu/items/with-addons", { params: { locationId } }).then((r) => r.data);
