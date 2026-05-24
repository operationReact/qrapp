import { API } from "./api";

// ── Sales ──────────────────────────────────────────────────────────────────
export const fetchDailySales = (params) =>
  API.get("/analytics/sales/daily", { params }).then((r) => r.data);

export const fetchWeeklySales = (params) =>
  API.get("/analytics/sales/weekly", { params }).then((r) => r.data);

export const fetchMonthlySales = (params) =>
  API.get("/analytics/sales/monthly", { params }).then((r) => r.data);

// ── Orders ─────────────────────────────────────────────────────────────────
export const fetchHourlyOrders = (params) =>
  API.get("/analytics/orders/hourly", { params }).then((r) => r.data);

export const fetchPeakHours = (params) =>
  API.get("/analytics/orders/peak-hours", { params }).then((r) => r.data);

// ── Menu ───────────────────────────────────────────────────────────────────
export const fetchTopSellingItems = (params) =>
  API.get("/analytics/menu/top-selling", { params }).then((r) => r.data);

export const fetchLeastSellingItems = (params) =>
  API.get("/analytics/menu/least-selling", { params }).then((r) => r.data);

export const fetchMenuRevenue = (params) =>
  API.get("/analytics/menu/revenue", { params }).then((r) => r.data);

// ── Users ──────────────────────────────────────────────────────────────────
export const fetchUserPreferences = (params) =>
  API.get("/analytics/users/preferences", { params }).then((r) => r.data);

export const fetchRepeatCustomers = (params) =>
  API.get("/analytics/users/repeat-customers", { params }).then((r) => r.data);

// ── Coupons ────────────────────────────────────────────────────────────────
export const fetchCouponPerformance = (params) =>
  API.get("/analytics/coupons/performance", { params }).then((r) => r.data);

// ── Overview ───────────────────────────────────────────────────────────────
export const fetchOverviewKpis = () =>
  API.get("/analytics/overview").then((r) => r.data);

// ── Recommendations ────────────────────────────────────────────────────────
export const fetchRecommendations = (userId) =>
  API.get(`/recommendations/${userId}`).then((r) => r.data);

export const fetchTrendingItems = () =>
  API.get("/recommendations/trending").then((r) => r.data);

