import { apiClient } from "@/services";

// All Food Court endpoints are namespaced under this base. The frontend talks
// to the shared generic API client (auth + 401 handling live there), so these
// helpers only describe the REST surface.
const base = "/api/v1/food-courts";

const unwrap = (response) => response.data;

export const getFoodCourts = () => apiClient.get(base).then(unwrap);

export const getFoodCourtSummary = (foodCourtId, month) =>
  apiClient
    .get(`${base}/${foodCourtId}/dashboard`, {
      params: month ? { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) } : {},
    })
    .then(unwrap);

export const getStalls = (foodCourtId) =>
  apiClient.get(`${base}/${foodCourtId}/stalls`).then(unwrap);

export const getTenants = (foodCourtId) =>
  apiClient.get(`${base}/${foodCourtId}/tenants`).then(unwrap);

export const getLeases = (foodCourtId) =>
  apiClient.get(`${base}/${foodCourtId}/stall-leases`).then(unwrap);

export const getRents = (foodCourtId, month) =>
  apiClient
    .get(`${base}/${foodCourtId}/rent/invoices`, {
      params: month ? { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) } : {},
    })
    .then(unwrap);

export const getDeposits = (foodCourtId) =>
  apiClient.get(`${base}/${foodCourtId}/deposits`).then(unwrap);

export const getExpenses = (foodCourtId, month) =>
  apiClient
    .get(`${base}/${foodCourtId}/expenses`, {
      params: month
        ? {
            from: `${month}-01`,
            to: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)
              .toISOString()
              .slice(0, 10),
          }
        : {},
    })
    .then(unwrap);

export const getActionItems = (foodCourtId) =>
  apiClient.get(`${base}/${foodCourtId}/action-items`).then(unwrap);

export const recordRentPayment = (foodCourtId, rentId, payload) =>
  apiClient
    .post(`${base}/${foodCourtId}/rent/invoices/${rentId}/payments`, payload)
    .then(unwrap);

export const createExpense = (foodCourtId, payload) =>
  apiClient.post(`${base}/${foodCourtId}/expenses`, payload).then(unwrap);

export const createActionItem = (foodCourtId, payload) =>
  apiClient.post(`${base}/${foodCourtId}/action-items`, payload).then(unwrap);

export const updateActionItemStatus = (foodCourtId, actionItemId, status) =>
  apiClient
    .patch(`${base}/${foodCourtId}/action-items/${actionItemId}/status`, {
      status,
    })
    .then(unwrap);
