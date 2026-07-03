import { apiClient } from "./index";

export const fetchCoupons = () =>
  apiClient.get("/api/coupons/admin/all").then((r) => r.data);

export const createCoupon = (data) =>
  apiClient.post("/api/coupons", data).then((r) => r.data);

export const updateCoupon = (id, data) =>
  apiClient.put(`/api/coupons/admin/${id}`, data).then((r) => r.data);

export const deleteCoupon = (id) =>
  apiClient.delete(`/api/coupons/admin/${id}`).then((r) => r.data);

export const getCouponAnalytics = (id) =>
  apiClient.get(`/api/coupons/admin/${id}/analytics`).then((r) => r.data);

export const toggleCouponStatus = (id) =>
  apiClient.patch(`/api/coupons/admin/${id}/toggle`).then((r) => r.data);
