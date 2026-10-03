import { apiClient } from "@/services";

// Food Court REST surface. Everything lives under /api/v1/food-courts and is
// independent from the ordering APIs; only the shared auth-aware client is reused.
const base = "/api/v1/food-courts";
const unwrap = (response) => response.data;
const fc = (id) => `${base}/${id}`;

const periodParams = (month) =>
  month ? { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) } : {};

// Food courts
export const getFoodCourts = () => apiClient.get(base).then(unwrap);
export const createFoodCourt = (payload) => apiClient.post(base, payload).then(unwrap);
export const updateFoodCourt = (id, payload) => apiClient.put(fc(id), payload).then(unwrap);
export const getDashboard = (id, month) =>
  apiClient.get(`${fc(id)}/dashboard`, { params: periodParams(month) }).then(unwrap);

// Stalls
export const getStalls = (id) => apiClient.get(`${fc(id)}/stalls`).then(unwrap);
export const createStall = (id, payload) => apiClient.post(`${fc(id)}/stalls`, payload).then(unwrap);
export const updateStall = (id, stallId, payload) =>
  apiClient.put(`${fc(id)}/stalls/${stallId}`, payload).then(unwrap);
export const deleteStall = (id, stallId) => apiClient.delete(`${fc(id)}/stalls/${stallId}`).then(unwrap);

// Tenants
export const getTenants = (id) => apiClient.get(`${fc(id)}/tenants`).then(unwrap);
export const createTenant = (id, payload) => apiClient.post(`${fc(id)}/tenants`, payload).then(unwrap);
export const updateTenant = (id, tenantId, payload) =>
  apiClient.put(`${fc(id)}/tenants/${tenantId}`, payload).then(unwrap);

// Stall leases
export const getLeases = (id) => apiClient.get(`${fc(id)}/stall-leases`).then(unwrap);
export const createLease = (id, payload) => apiClient.post(`${fc(id)}/stall-leases`, payload).then(unwrap);
export const updateLease = (id, leaseId, payload) =>
  apiClient.put(`${fc(id)}/stall-leases/${leaseId}`, payload).then(unwrap);
export const terminateLease = (id, leaseId, endDate) =>
  apiClient
    .post(`${fc(id)}/stall-leases/${leaseId}/terminate`, null, { params: endDate ? { endDate } : {} })
    .then(unwrap);

// Rent
export const getRents = (id, month) =>
  apiClient.get(`${fc(id)}/rent/invoices`, { params: periodParams(month) }).then(unwrap);
export const generateRent = (id, month) =>
  apiClient.post(`${fc(id)}/rent/generate`, periodParams(month)).then(unwrap);
export const getRentPayments = (id, invoiceId) =>
  apiClient.get(`${fc(id)}/rent/invoices/${invoiceId}/payments`).then(unwrap);
export const recordRentPayment = (id, invoiceId, payload) =>
  apiClient.post(`${fc(id)}/rent/invoices/${invoiceId}/payments`, payload).then(unwrap);
export const getRentAdjustments = (id, invoiceId) =>
  apiClient.get(`${fc(id)}/rent/invoices/${invoiceId}/adjustments`).then(unwrap);
export const applyRentAdjustment = (id, invoiceId, payload) =>
  apiClient.post(`${fc(id)}/rent/invoices/${invoiceId}/adjustments`, payload).then(unwrap);

// Deposits
export const getDeposits = (id) => apiClient.get(`${fc(id)}/deposits`).then(unwrap);
export const createDeposit = (id, payload) => apiClient.post(`${fc(id)}/deposits`, payload).then(unwrap);
export const settleDeposit = (id, depositId, payload) =>
  apiClient.post(`${fc(id)}/deposits/${depositId}/settle`, payload).then(unwrap);

// Expenses
export const getExpenses = (id, month) => {
  let params = {};
  if (month) {
    const year = Number(month.slice(0, 4));
    const monthIndex = Number(month.slice(5, 7));
    const lastDay = new Date(year, monthIndex, 0).getDate();
    params = { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
  }
  return apiClient.get(`${fc(id)}/expenses`, { params }).then(unwrap);
};
export const createExpense = (id, payload) => apiClient.post(`${fc(id)}/expenses`, payload).then(unwrap);
export const updateExpense = (id, expenseId, payload) =>
  apiClient.put(`${fc(id)}/expenses/${expenseId}`, payload).then(unwrap);
export const deleteExpense = (id, expenseId) => apiClient.delete(`${fc(id)}/expenses/${expenseId}`).then(unwrap);

// Action items
export const getActionItems = (id) => apiClient.get(`${fc(id)}/action-items`).then(unwrap);
export const createActionItem = (id, payload) =>
  apiClient.post(`${fc(id)}/action-items`, payload).then(unwrap);
export const updateActionItem = (id, itemId, payload) =>
  apiClient.put(`${fc(id)}/action-items/${itemId}`, payload).then(unwrap);
export const deleteActionItem = (id, itemId) =>
  apiClient.delete(`${fc(id)}/action-items/${itemId}`).then(unwrap);

// Property (landlord side)
export const getLandlords = (id) => apiClient.get(`${fc(id)}/landlords`).then(unwrap);
export const createLandlord = (id, payload) => apiClient.post(`${fc(id)}/landlords`, payload).then(unwrap);
export const updateLandlord = (id, landlordId, payload) =>
  apiClient.put(`${fc(id)}/landlords/${landlordId}`, payload).then(unwrap);
export const getPropertyLeases = (id) => apiClient.get(`${fc(id)}/property-leases`).then(unwrap);
export const createPropertyLease = (id, payload) =>
  apiClient.post(`${fc(id)}/property-leases`, payload).then(unwrap);
export const updatePropertyLease = (id, leaseId, payload) =>
  apiClient.put(`${fc(id)}/property-leases/${leaseId}`, payload).then(unwrap);
export const getLandlordRent = (id, month) =>
  apiClient.get(`${fc(id)}/landlord-rent`, { params: periodParams(month) }).then(unwrap);
