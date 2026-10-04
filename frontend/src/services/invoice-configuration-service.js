import { apiClient } from "./index";

export const getInvoiceConfiguration = (locationId) =>
  apiClient.get(`/admin/invoice-configurations/${locationId}`).then((response) => response.data);

export const saveInvoiceConfiguration = (locationId, payload) =>
  apiClient.put(`/admin/invoice-configurations/${locationId}`, payload).then((response) => response.data);

export const uploadInvoiceAsset = (locationId, assetType, file) => {
  const form = new FormData();
  form.append("file", file);
  return apiClient.post(`/admin/invoice-configurations/${locationId}/assets/${assetType}`, form)
    .then((response) => response.data);
};
