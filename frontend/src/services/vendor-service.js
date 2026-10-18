import { apiClient } from "@/services";

const vendorPath = "/api/v1/vendors";

export const getVendors = (locationId) =>
  apiClient.get(vendorPath, { params: { locationId } }).then((r) => r.data);
export const lookupVendorPhone = (locationId, phone) =>
  apiClient.get(`${vendorPath}/lookup`, { params: { locationId, phone } }).then((r) => r.data);
export const createVendor = (payload, locationId) =>
  apiClient.post(vendorPath, payload, { params: { locationId } }).then((r) => r.data);
export const updateVendor = (id, payload, locationId) =>
  apiClient.put(`${vendorPath}/${id}`, payload, { params: { locationId } }).then((r) => r.data);
export const setVendorActive = (id, active, locationId) =>
  apiClient.patch(`${vendorPath}/${id}/status`, { active }, { params: { locationId } }).then((r) => r.data);

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
