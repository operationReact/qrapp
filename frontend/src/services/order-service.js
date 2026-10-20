import { apiClient } from "./index";

export const getMyOrders = () =>
  apiClient.get("/orders/me").then((r) => r.data);

export const cancelMyOrder = (orderId) =>
  apiClient.post(`/orders/${orderId}/cancel`).then((r) => r.data);

export const raiseOrderSupportRequest = (orderId, message) =>
  apiClient.post(`/orders/${orderId}/support-request`, { message }).then((r) => r.data);

export const downloadInvoice = (orderId) =>
  apiClient.get(`/orders/${orderId}/invoice`, { responseType: "blob" }).then((r) => r.data);

export const createOrder = (data, locationId) => {
  const payload = locationId ? { ...data, locationId } : data;
  return apiClient.post("/orders", payload).then((r) => r.data);
};

export const getOrdersAdmin = ({
  page = 0,
  size = 10,
  status,
  paymentStatus,
  refundStatus,
  query,
  liveOnly,
  locationId,
  from,
  to,
} = {}) => {
  const params = { page, size };
  if (status) params.status = status;
  if (paymentStatus) params.paymentStatus = paymentStatus;
  if (refundStatus) params.refundStatus = refundStatus;
  if (query) params.query = query;
  if (typeof liveOnly === "boolean") params.liveOnly = liveOnly;
  if (locationId != null) params.locationId = locationId;
  if (from) params.from = from;
  if (to) params.to = to;
  return apiClient.get("/admin/orders", { params }).then((r) => r.data);
};

export const getAdminOrderDashboard = ({ liveLimit = 12, locationId } = {}) => {
  const params = { liveLimit };
  if (locationId != null) params.locationId = locationId;
  return apiClient.get("/admin/orders/dashboard", { params }).then((r) => r.data);
};

export const getLiveOrdersAdmin = ({ limit = 12, locationId } = {}) => {
  const params = { limit };
  if (locationId != null) params.locationId = locationId;
  return apiClient.get("/admin/orders/live", { params }).then((r) => r.data);
};

export const getAdminOrder = (id, locationId) => {
  const params = locationId != null ? { locationId } : undefined;
  return apiClient.get(`/admin/orders/${id}`, params ? { params } : undefined).then((r) => r.data);
};

export const getOrderSupportRequests = (orderId, locationId) => {
  const params = locationId != null ? { locationId } : undefined;
  return apiClient
    .get(`/admin/orders/${orderId}/support-requests`, params ? { params } : undefined)
    .then((r) => r.data);
};

export const resolveOrderSupportRequest = (orderId, requestId, locationId) => {
  const params = locationId != null ? { locationId } : undefined;
  return apiClient
    .post(
      `/admin/orders/${orderId}/support-requests/${requestId}/resolve`,
      undefined,
      params ? { params } : undefined
    )
    .then((r) => r.data);
};

export const completeManualRefund = (orderId, reference, locationId) => {
  const params = locationId != null ? { locationId } : undefined;
  return apiClient
    .post(
      `/admin/orders/${orderId}/refund/manual-complete`,
      { reference },
      params ? { params } : undefined
    )
    .then((r) => r.data);
};

export const downloadAdminInvoice = (orderId) =>
  apiClient.get(`/admin/orders/${orderId}/invoice`, { responseType: "blob" }).then((r) => r.data);

export const updateAdminOrder = (id, data, locationId) => {
  const config = locationId != null ? { params: { locationId } } : undefined;
  return apiClient.patch(`/admin/orders/${id}`, data, config).then((r) => r.data);
};

export const updateOrderStatusAdmin = (id, data, locationId) => {
  const config = locationId != null ? { params: { locationId } } : undefined;
  return apiClient.patch(`/admin/orders/${id}/status`, data, config).then((r) => r.data);
};

// ── Pre-Order Services ────────────────────────────────────────────────────────

export const getAdminPreOrders = ({
  page = 0,
  size = 20,
  status,
  query,
  scheduledFrom,
  scheduledTo,
  locationId,
} = {}) => {
  const params = { page, size };
  if (status) params.status = status;
  if (query) params.query = query;
  if (scheduledFrom) params.scheduledFrom = scheduledFrom;
  if (scheduledTo) params.scheduledTo = scheduledTo;
  if (locationId != null) params.locationId = locationId;
  return apiClient.get("/admin/pre-orders", { params }).then((r) => r.data);
};

export const getAdminPreOrderDashboard = ({ upcomingLimit = 12, locationId } = {}) => {
  const params = { upcomingLimit };
  if (locationId != null) params.locationId = locationId;
  return apiClient
    .get("/admin/pre-orders/dashboard", { params })
    .then((r) => r.data);
};

export const acceptPreOrder = (id, note, locationId) => {
  const config = locationId != null ? { params: { locationId } } : undefined;
  return apiClient
    .post(`/admin/pre-orders/${id}/accept`, note ? { note } : undefined, config)
    .then((r) => r.data);
};

export const updatePreOrder = (id, data, locationId) => {
  const config = locationId != null ? { params: { locationId } } : undefined;
  return apiClient.patch(`/admin/pre-orders/${id}`, data, config).then((r) => r.data);
};

export const createAdminPreOrder = (data) =>
  apiClient.post("/admin/pre-orders", data).then((r) => r.data);

export const createPreOrder = (data) =>
  apiClient.post("/orders/pre-order", data).then((r) => r.data);

// Public — no auth required (used on customer-facing menu)
export const getPreOrderItems = () =>
  apiClient.get("/orders/pre-order/items").then((r) => r.data);

// Admin — requires ROLE_ADMIN
export const getAdminPreOrderItems = () =>
  apiClient.get("/admin/pre-orders/available-items").then((r) => r.data);

// ── Payment Config ────────────────────────────────────────────────────────────

/** Public — returns { razorpayEnabled, walletEnabled, payAtStallEnabled } */
export const getPaymentConfig = (locationId) =>
  apiClient.get("/api/payment/config", { params: locationId ? { locationId } : undefined }).then((r) => r.data);

/** Admin — returns { payAtStallEnabled, razorpayEnabled } */
export const getAdminSettings = (locationId) =>
  apiClient.get("/admin/settings", { params: { locationId } }).then((r) => r.data);

/** Admin — toggle Pay at Stall on/off */
export const adminSetPayAtStall = (enabled, locationId) =>
  apiClient.patch("/admin/settings/pay-at-stall", { enabled }, {
    params: locationId ? { locationId } : undefined,
  }).then((r) => r.data);

export const adminSetPaymentMethod = (method, locationId, enabled) =>
  apiClient.patch(`/admin/settings/${method}`, { enabled }, { params: { locationId } }).then((r) => r.data);
