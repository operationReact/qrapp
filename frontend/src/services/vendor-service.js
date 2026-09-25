import { apiClient } from "@/services";

const vendorPath = "/api/v1/vendors";

export const getVendors = () => apiClient.get(vendorPath).then((r) => r.data);
export const createVendor = (payload) => apiClient.post(vendorPath, payload).then((r) => r.data);
export const updateVendor = (id, payload) => apiClient.put(`${vendorPath}/${id}`, payload).then((r) => r.data);
export const setVendorActive = (id, active) =>
  apiClient.patch(`${vendorPath}/${id}/status`, { active }).then((r) => r.data);

export const getVendorCostHistory = (vendorId, menuItemId, locationId) =>
  apiClient.get(`/api/pricing/vendors/${vendorId}/menu-items/${menuItemId}/cost-history`, {
    params: { locationId },
  }).then((r) => r.data);

export const setVendorCost = (vendorId, menuItemId, costPrice, locationId) =>
  apiClient.post("/api/pricing/vendor-costs/set", {
    vendorId,
    menuItemId,
    costPrice,
    effectiveFrom: null,
  }, { params: { locationId } }).then((r) => r.data);
