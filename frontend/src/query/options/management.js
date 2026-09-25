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
export const adminLocationsOptions = (params) => list("/api/admin/locations", "locations", params);
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
export async function updateManagementResource(path, id, payload) { return (await apiClient.patch(`${path}/${id}`, payload)).data; }
export async function updateCustomerCompany(id, payload) { return (await apiClient.put(`/api/admin/customer-companies/${id}`, payload)).data; }
export async function assignCustomerCompany(locationId, companyId) {
  return apiClient.put(`/api/admin/locations/${locationId}/customer-companies/${companyId}`);
}
export async function removeCustomerCompany(locationId, companyId) {
  return apiClient.delete(`/api/admin/locations/${locationId}/customer-companies/${companyId}`);
}
export async function updateUserRole(id, payload) { return (await apiClient.put(`/api/admin/users/${id}/role`, payload)).data; }
export async function grantUserLocation(userId, locationId) {
  return (await apiClient.put(`/api/admin/users/${userId}/locations/${locationId}`, { active: true })).data;
}
export async function revokeUserLocation(userId, locationId) {
  return (await apiClient.delete(`/api/admin/users/${userId}/locations/${locationId}`)).data;
}
