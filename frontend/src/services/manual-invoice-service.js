import { apiClient } from "./index";

// Admin Manual Invoice Generation module. Access is restricted to SUPER_ADMIN and
// ADMIN on the server; the service merely mirrors those endpoints.

const BASE = "/api/admin/manual-invoices";

export const listManualInvoices = (params = {}) => {
  const query = {};
  if (params.status) query.status = params.status;
  if (params.sourceType) query.sourceType = params.sourceType;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.search) query.search = params.search;
  query.page = params.page ?? 0;
  query.size = params.size ?? 20;
  return apiClient.get(BASE, { params: query }).then((r) => r.data);
};

export const getManualInvoice = (id) =>
  apiClient.get(`${BASE}/${id}`).then((r) => r.data);

export const createManualInvoice = (payload) =>
  apiClient.post(BASE, payload).then((r) => r.data);

export const updateManualInvoice = (id, payload) =>
  apiClient.put(`${BASE}/${id}`, payload).then((r) => r.data);

export const finalizeManualInvoice = (id) =>
  apiClient.post(`${BASE}/${id}/finalize`).then((r) => r.data);

export const cancelManualInvoice = (id, reason) =>
  apiClient.post(`${BASE}/${id}/cancel`, { reason }).then((r) => r.data);

export const getManualInvoiceAudit = (id) =>
  apiClient.get(`${BASE}/${id}/audit`).then((r) => r.data);

export const getManualInvoicePdfUrl = (id) =>
  apiClient
    .get(`${BASE}/${id}/pdf`, { responseType: "blob" })
    .then((response) => URL.createObjectURL(response.data));
