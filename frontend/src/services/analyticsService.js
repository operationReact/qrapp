import { apiClient } from "./index";

// ── Sales ──────────────────────────────────────────────────────────────────
export const fetchDailySales = (params) =>
  apiClient.get("/api/v1/analytics/sales/daily/previous", { params }).then((r) => r.data?.data);

export const fetchDailySalesRange = (params) =>
  apiClient.get("/api/v1/analytics/sales/daily", { params }).then((r) => r.data?.data ?? []);

export const fetchSalesSummary = (params) =>
  apiClient.get("/api/v1/analytics/sales/summary", { params }).then((r) => r.data?.data);

export const fetchWeeklySales = (params) =>
  apiClient.get("/api/v1/analytics/sales/weekly", { params }).then((r) => r.data?.data);

export const fetchMonthlySales = (params) =>
  apiClient.get("/api/v1/analytics/sales/monthly", { params }).then((r) => r.data?.data);

// ── Orders ─────────────────────────────────────────────────────────────────
export const fetchHourlyOrders = (params) =>
  apiClient.get("/api/v1/analytics/orders/hourly", { params }).then((r) => {
    const rows = r.data?.data ?? [];
    return rows.map((row) => ({
      ...row,
      hour:        row.hourOfDay,
      orders:      row.orderCount      ?? 0,
      completed:   row.completedCount  ?? 0,
      cancelled:   (row.orderCount ?? 0) - (row.completedCount ?? 0),
      avgPrepTime: row.avgFulfilmentMinutes != null
        ? Math.round(row.avgFulfilmentMinutes * 10) / 10
        : null,
    }));
  });

export const fetchOrderHeatmap = (params) =>
  apiClient.get("/api/v1/analytics/orders/heatmap", { params }).then((r) => r.data?.data ?? []);

export const fetchPeakHours = (params) =>
  apiClient.get("/api/v1/analytics/orders/peak-hours", { params }).then((r) => r.data?.data);

// ── Menu ───────────────────────────────────────────────────────────────────
export const fetchTopSellingItems = (params) =>
  apiClient.get("/api/v1/analytics/menu/top-selling", { params }).then((r) => r.data?.data);

export const fetchLeastSellingItems = (params) =>
  apiClient.get("/api/v1/analytics/menu/least-selling", { params }).then((r) => r.data?.data);

export const fetchMenuRevenue = (params) =>
  apiClient.get("/api/v1/analytics/menu/revenue", { params }).then((r) => r.data?.data);

export const fetchStallPerformance = (params) =>
  apiClient.get("/api/v1/analytics/stalls/performance", { params }).then((r) => r.data?.data ?? []);

// ── Users ──────────────────────────────────────────────────────────────────
export const fetchUserPreferences = (params) =>
  apiClient.get("/api/v1/analytics/users/preferences", { params }).then((r) => r.data?.data);

export const fetchRepeatCustomers = (params) =>
  apiClient.get("/api/v1/analytics/users/repeat-customers", { params }).then((r) => r.data?.data);

export const fetchRepeatRate = () =>
  apiClient.get("/api/v1/analytics/users/repeat-rate").then((r) => r.data?.data);

export const fetchTopSpenders = (params) =>
  apiClient.get("/api/v1/analytics/users/top-spenders", { params }).then((r) => r.data?.data);

export const fetchChurnedUsers = (params) =>
  apiClient.get("/api/v1/analytics/users/churned", { params }).then((r) => r.data?.data);

export const fetchUsersBySegment = (segment, params) =>
  apiClient.get(`/api/v1/analytics/users/segment/${segment}`, { params }).then((r) => r.data?.data);

// ── Coupons ────────────────────────────────────────────────────────────────
export const fetchCouponPerformance = (params) =>
  apiClient.get("/api/v1/analytics/coupons/performance", { params }).then((r) => r.data?.data);

// ── Overview ───────────────────────────────────────────────────────────────
export const fetchOverviewKpis = () =>
  apiClient.get("/api/v1/analytics/overview").then((r) => r.data?.data);

// ── Recommendations ────────────────────────────────────────────────────────
export const fetchRecommendations = (userId) =>
  apiClient.get(`/api/v1/recommendations/${userId}`).then((r) => r.data?.data);

export const fetchTrendingItems = () =>
  apiClient.get("/api/v1/recommendations/trending").then((r) => r.data?.data);

// ── Profitability ──────────────────────────────────────────────────────────
export const fetchProfitabilityDashboard = (params) =>
  apiClient.get("/api/v1/analytics/profitability/dashboard", { params }).then((r) => r.data?.data);

export const fetchMostProfitableItems = (params) =>
  apiClient.get("/api/v1/analytics/profitability/items", { params }).then((r) => r.data?.data);

export const fetchHighestMarginItems = (params) =>
  apiClient.get("/api/v1/analytics/profitability/margin", { params }).then((r) => r.data?.data);

export const updateItemEstimatedCost = (itemId, estimatedCost) =>
  apiClient.patch(`/menu/${itemId}/estimated-cost`, { estimatedCost }).then((r) => r.data);

export const updateItemSellingPrice = (menuItemId, sellingPrice, locationId) =>
  apiClient.post("/api/pricing/menu-items/set-price", {
    menuItemId,
    sellingPrice,
    effectiveFrom: null,
    reason: "Updated via Profitability Dashboard",
  }, { params: { locationId } }).then((r) => r.data);
