import { apiClient } from "@/services";

const vendorPath = "/api/vendor/bills";
const adminPath = "/api/admin/vendor-bills";

export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"];

const ERROR_MESSAGES = {
  bill_not_editable: "This bill can no longer be edited.",
  invalid_status_transition: "This action is not allowed for the bill's current status.",
  correction_message_required: "Please describe what needs correction.",
  comment_required: "Please enter a comment.",
  invalid_payment_method: "Please choose a valid payment method.",
  items_required: "Add at least one line item before submitting.",
  invoice_number_invalid: "Enter a valid invoice number.",
  invoice_date_required: "Select the invoice date.",
  item_quantity_invalid: "Quantity must be greater than zero.",
  item_price_invalid: "Unit price cannot be negative.",
  item_unit_invalid: "Enter a unit for every line item.",
  message_too_long: "The message is too long.",
  location_access_denied: "You do not have access to this location.",
  vendor_bill_access_denied: "You cannot access this bill.",
  vendor_bill_not_found: "Bill not found.",
  vendor_account_not_found: "Vendor login not found for this location.",
  phone_taken: "That phone number is already registered.",
  invalid_phone_number: "Enter a valid 10-digit mobile number.",
  phone_belongs_to_staff: "This number belongs to a staff account and can't be a vendor login.",
  vendor_login_exists_here: "This vendor already has a login for this location.",
  vendor_already_linked: "This vendor is already added to this location.",
  location_not_found: "Location not found.",
};

export function vendorErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const code = error?.response?.data?.error;
  return ERROR_MESSAGES[code] || fallback;
}

export const listVendorBills = (locationId) =>
  apiClient.get(vendorPath, { params: { locationId } }).then((r) => r.data);

export const listVendorLocations = () =>
  apiClient.get(`${vendorPath}/locations`).then((r) => r.data);

export const createVendorBill = (locationId, payload, submit = false) =>
  apiClient.post(vendorPath, payload, { params: { locationId, submit } }).then((r) => r.data);

export const updateVendorBill = (locationId, billId, payload, submit = false) =>
  apiClient.put(`${vendorPath}/${billId}`, payload, { params: { locationId, submit } }).then((r) => r.data);

export const addVendorBillComment = (locationId, billId, message) =>
  apiClient.post(`${vendorPath}/${billId}/comments`, { message }, { params: { locationId } }).then((r) => r.data);

export const listAdminVendorBills = (locationId, status) =>
  apiClient.get(adminPath, { params: { locationId, status } }).then((r) => r.data);

export const approveVendorBill = (locationId, billId, message) =>
  apiClient.post(`${adminPath}/${billId}/approve`, { message }, { params: { locationId } }).then((r) => r.data);

export const requestVendorBillCorrection = (locationId, billId, message) =>
  apiClient.post(`${adminPath}/${billId}/correction`, { message }, { params: { locationId } }).then((r) => r.data);

export const recordVendorBillPayment = (locationId, billId, paymentMethod, paymentReference) =>
  apiClient.post(`${adminPath}/${billId}/payment`, { paymentMethod, paymentReference }, { params: { locationId } })
    .then((r) => r.data);

export const addAdminVendorBillComment = (locationId, billId, message) =>
  apiClient.post(`${adminPath}/${billId}/comments`, { message }, { params: { locationId } }).then((r) => r.data);

export const listVendorAccounts = (locationId) =>
  apiClient.get(`${adminPath}/accounts`, { params: { locationId } }).then((r) => r.data);

export const onboardVendorAccount = (locationId, payload) =>
  apiClient.post(`${adminPath}/accounts`, { ...payload, role: "VENDOR", locationId }).then((r) => r.data);

export const setVendorAccountActive = (locationId, vendorUserId, active) =>
  apiClient.patch(`${adminPath}/accounts/${vendorUserId}/status`, { active }, { params: { locationId } })
    .then((r) => r.data);

export const resetVendorAccountPassword = (locationId, vendorUserId, newPassword) =>
  apiClient.put(`${adminPath}/accounts/${vendorUserId}/password`, { newPassword }, { params: { locationId } })
    .then((r) => r.data);
