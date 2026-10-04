import { apiClient } from "./index";

export const getInvoiceConfiguration = () =>
  apiClient.get("/admin/invoice-configurations").then((response) => response.data);

export const saveInvoiceConfiguration = (payload) =>
  apiClient.put("/admin/invoice-configurations", payload).then((response) => response.data);

export const uploadInvoiceAsset = (assetType, file) => {
  const form = new FormData();
  form.append("file", file);
  return apiClient.post(`/admin/invoice-configurations/assets/${assetType}`, form)
    .then((response) => response.data);
};
