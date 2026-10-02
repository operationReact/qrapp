import { apiClient } from "./index";

// ── Public (customer Home feed) ─────────────────────────────────────────────

/** Returns { hero, discovery, promotions } — active, in-schedule, location-scoped campaigns. */
export const getHomeCampaignFeed = (locationId) =>
  apiClient
    .get("/api/home/campaigns", { params: locationId ? { locationId } : {} })
    .then((r) => r.data);

// ── Admin ────────────────────────────────────────────────────────────────────

export const listHomeCampaigns = (locationId) =>
  apiClient
    .get("/api/admin/home-campaigns", { params: locationId ? { locationId } : {} })
    .then((r) => r.data);

export const getHomeCampaign = (id, locationId) =>
  apiClient
    .get(`/api/admin/home-campaigns/${id}`, { params: locationId ? { locationId } : {} })
    .then((r) => r.data);

export const createHomeCampaign = (data) =>
  apiClient.post("/api/admin/home-campaigns", data).then((r) => r.data);

export const updateHomeCampaign = (id, data, locationId) =>
  apiClient
    .put(`/api/admin/home-campaigns/${id}`, data, { params: locationId ? { locationId } : {} })
    .then((r) => r.data);

export const setHomeCampaignActive = (id, isActive, locationId) =>
  apiClient
    .patch(`/api/admin/home-campaigns/${id}/status`, { isActive }, { params: locationId ? { locationId } : {} })
    .then((r) => r.data);

export const reorderHomeCampaign = (id, displayOrder, locationId) =>
  apiClient
    .patch(`/api/admin/home-campaigns/${id}/order`, { displayOrder }, { params: locationId ? { locationId } : {} })
    .then((r) => r.data);

export const duplicateHomeCampaign = (id, locationId) =>
  apiClient
    .post(`/api/admin/home-campaigns/${id}/duplicate`, null, { params: locationId ? { locationId } : {} })
    .then((r) => r.data);

export const deleteHomeCampaign = (id, locationId) =>
  apiClient
    .delete(`/api/admin/home-campaigns/${id}`, { params: locationId ? { locationId } : {} })
    .then((r) => r.data);

export const uploadHomeCampaignImage = (id, file, { mobile = false, locationId } = {}) => {
  const fd = new FormData();
  fd.append("image", file);
  return apiClient
    .post(`/api/admin/home-campaigns/${id}/image`, fd, {
      params: { mobile, ...(locationId ? { locationId } : {}) },
    })
    .then((r) => r.data);
};

export const removeHomeCampaignImage = (id, { mobile = false, locationId } = {}) =>
  apiClient
    .delete(`/api/admin/home-campaigns/${id}/image`, {
      params: { mobile, ...(locationId ? { locationId } : {}) },
    })
    .then((r) => r.data);
