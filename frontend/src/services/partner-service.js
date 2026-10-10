import { apiClient } from "@/services";
import { getPartnerLogoUrl } from "@/lib/partnerBranding";

const path = "/api/v1/partners";

const withBranding = (partner) => ({ ...partner, logoUrl: getPartnerLogoUrl(partner) });
export const getPartners = () => apiClient.get(path).then((response) => response.data.map(withBranding));
export const getPartner = (id) => apiClient.get(`${path}/${id}`).then((response) => withBranding(response.data));
export const createPartner = (payload) => apiClient.post(path, payload).then((response) => response.data);
export const updatePartner = (id, payload) => apiClient.put(`${path}/${id}`, payload).then((response) => response.data);
export const setPartnerStatus = (id, status) => apiClient.patch(`${path}/${id}/status`, { status }).then((response) => response.data);
export const getPartnerLocations = (id) => apiClient.get(`${path}/${id}/locations`).then((response) => response.data);
export const assignPartnerLocation = (id, payload) => apiClient.post(`${path}/${id}/locations`, payload).then((response) => response.data);
export const updatePartnerLocation = (id, assignmentId, payload) => apiClient.patch(`${path}/${id}/locations/${assignmentId}`, payload).then((response) => response.data);
export const removePartnerLocation = (id, assignmentId) => apiClient.delete(`${path}/${id}/locations/${assignmentId}`);
export const getPartnerUsers = (id) => apiClient.get(`${path}/${id}/users`).then((response) => response.data);
export const addPartnerUser = (id, userId) => apiClient.post(`${path}/${id}/users`, { userId }).then((response) => response.data);
export const createPartnerUser = (id, payload) => apiClient.post(`${path}/${id}/users/create`, payload).then((response) => response.data);
export const invitePartnerUser = (id, userId) => apiClient.post(`${path}/${id}/users/${userId}/invite`).then((response) => response.data);
export const removePartnerUser = (id, userId) => apiClient.delete(`${path}/${id}/users/${userId}`);
export const updatePartnerUser = (id, userId, payload) => apiClient.patch(`${path}/${id}/users/${userId}`, payload).then((response) => response.data);
