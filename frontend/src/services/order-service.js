import { apiClient } from "./index";

export const getMyOrders = () =>
  apiClient.get("/orders/me").then((r) => r.data);

export const createOrder = (data) =>
  apiClient.post("/orders", data).then((r) => r.data);

export const getOrdersAdmin = ({
  page = 0,
  size = 10,
  status,
  paymentStatus,
  query,
  liveOnly,
} = {}) => {
  const params = { page, size };
  if (status) params.status = status;
  if (paymentStatus) params.paymentStatus = paymentStatus;
  if (query) params.query = query;
  if (typeof liveOnly === "boolean") params.liveOnly = liveOnly;
  return apiClient.get("/admin/orders", { params }).then((r) => r.data);
};

export const getAdminOrderDashboard = ({ liveLimit = 12 } = {}) =>
  apiClient.get("/admin/orders/dashboard", { params: { liveLimit } }).then((r) => r.data);

export const getLiveOrdersAdmin = ({ limit = 12 } = {}) =>
  apiClient.get("/admin/orders/live", { params: { limit } }).then((r) => r.data);

export const getAdminOrder = (id) =>
  apiClient.get(`/admin/orders/${id}`).then((r) => r.data);

export const updateAdminOrder = (id, data) =>
  apiClient.patch(`/admin/orders/${id}`, data).then((r) => r.data);

export const updateOrderStatusAdmin = (id, data) =>
  apiClient.patch(`/admin/orders/${id}/status`, data).then((r) => r.data);
