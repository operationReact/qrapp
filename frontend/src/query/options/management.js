import { apiClient } from "@/services";

const list = (path, key, params) => ({
  queryKey: ["admin", key, params || {}],
  queryFn: async () => {
    const response = await apiClient.get(path, { params });
    const body = response.data;
    return Array.isArray(body) ? body : (body?.content || body?.data || body?.items || []);
  },
});

export const adminUsersOptions = (params) => list("/api/admin/users", "users", params);
export const adminCreateUserOptions = () => ({
  queryKey: ["admin", "users", "create-options"],
  queryFn: async () => (await apiClient.get("/api/admin/users/create-options")).data,
});
export const adminLocationsOptions = (params) => list("/api/admin/locations", "locations", params);
export const adminLocationsPageOptions = (params) => ({
  queryKey: ["admin", "locations-page", params || {}],
  queryFn: async () => (await apiClient.get("/api/admin/locations", { params })).data,
});
export const adminCustomerCompaniesOptions = (params) => list("/api/admin/customer-companies", "customer-companies", params);
export const adminVendorsOptions = () => list("/api/v1/vendors", "vendors");
export const locationCustomerCompaniesOptions = (locationId, enabled = true) => ({
  queryKey: ["admin", "locations", locationId, "customer-companies"],
  enabled: Boolean(locationId) && enabled,
  queryFn: async () => (await apiClient.get(`/api/admin/locations/${locationId}/customer-companies`)).data,
});
export const userLocationsOptions = (userId, enabled = true) => ({
  queryKey: ["admin", "users", userId, "locations"],
  enabled: Boolean(userId) && enabled,
  queryFn: async () => {
    const response = await apiClient.get(`/api/admin/users/${userId}/locations`);
    const body = response.data;
    return Array.isArray(body) ? body : (body?.content || body?.data || body?.locations || []);
  },
});

export async function createManagementResource(path, payload) { return (await apiClient.post(path, payload)).data; }
export async function resetAdminUserPassword(userId, newPassword) {
  return (await apiClient.put(`/api/admin/users/${userId}/password`, { newPassword })).data;
}
export async function updateManagementResource(path, id, payload) { return (await apiClient.patch(`${path}/${id}`, payload)).data; }
function locationFormData(payload, photo) {
  const locationPayload = { ...payload };
  const removePhoto = locationPayload.removePhoto;
  delete locationPayload.removePhoto;
  delete locationPayload.photo;
  const formData = new FormData();
  formData.append("location", new Blob([JSON.stringify(locationPayload)], { type: "application/json" }));
  if (photo) formData.append("photo", photo);
  if (removePhoto) formData.append("removePhoto", "true");
  return formData;
}
export async function createAdminLocation(payload, photo) {
  if (!photo) {
    const locationPayload = { ...payload };
    delete locationPayload.removePhoto;
    delete locationPayload.photo;
    return (await apiClient.post("/api/admin/locations", locationPayload)).data;
  }
  return (await apiClient.post("/api/admin/locations", locationFormData(payload, photo))).data;
}
export async function updateAdminLocation(id, payload, photo) {
  return (await apiClient.put(`/api/admin/locations/${id}`, locationFormData(payload, photo))).data;
}
export async function setAdminLocationActive(id, active) {
  return (await apiClient.patch(`/api/admin/locations/${id}/active`, null, { params: { active } })).data;
}
export async function removeAdminLocationPhoto(id) {
  return (await apiClient.delete(`/api/admin/locations/${id}/photo`)).data;
}
export async function updateCustomerCompany(id, payload) { return (await apiClient.put(`/api/admin/customer-companies/${id}`, payload)).data; }
export async function assignCustomerCompany(locationId, companyId) {
  return apiClient.put(`/api/admin/locations/${locationId}/customer-companies/${companyId}`);
}
export async function removeCustomerCompany(locationId, companyId) {
  return apiClient.delete(`/api/admin/locations/${locationId}/customer-companies/${companyId}`);
}
export async function updateUserRole(id, payload) { return (await apiClient.put(`/api/admin/users/${id}/role`, payload)).data; }
export async function createAdminUser(payload) { return (await apiClient.post("/api/admin/users", payload)).data; }
export async function grantUserLocation(userId, locationId, role) {
  return (await apiClient.put(`/api/admin/users/${userId}/locations/${locationId}`, { active: true, role })).data;
}
export async function revokeUserLocation(userId, locationId) {
  return (await apiClient.delete(`/api/admin/users/${userId}/locations/${locationId}`)).data;
}
export async function deleteAdminLocation(id) {
  return (await apiClient.delete(`/api/admin/locations/${id}`)).data;
}
