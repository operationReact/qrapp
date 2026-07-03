import { queryOptions } from "@tanstack/react-query";
import {
  fetchOverviewKpis,
  fetchDailySales,
  fetchWeeklySales,
  fetchMonthlySales,
  fetchHourlyOrders,
  fetchPeakHours,
  fetchTrendingItems,
  fetchTopSellingItems,
  fetchLeastSellingItems,
  fetchMenuRevenue,
  fetchUserPreferences,
  fetchRepeatCustomers,
  fetchRepeatRate,
  fetchTopSpenders,
  fetchChurnedUsers,
  fetchUsersBySegment,
  fetchCouponPerformance,
  fetchRecommendations,
  fetchProfitabilityDashboard,
  fetchMostProfitableItems,
  fetchHighestMarginItems,
} from "../../services/analyticsService";

export const overviewKpisOptions = queryOptions({
  queryKey: ["analytics", "overview"],
  queryFn: fetchOverviewKpis,
  staleTime: 1000 * 60 * 2,
});

export const dailySalesOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "sales", "daily", params],
    queryFn: () => fetchDailySales(params),
    staleTime: 1000 * 60 * 2,
  });

export const weeklySalesOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "sales", "weekly", params],
    queryFn: () => fetchWeeklySales(params),
    staleTime: 1000 * 60 * 2,
  });

export const monthlySalesOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "sales", "monthly", params],
    queryFn: () => fetchMonthlySales(params),
    staleTime: 1000 * 60 * 2,
  });

export const hourlyOrdersOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "orders", "hourly", params],
    queryFn: () => fetchHourlyOrders(params),
    staleTime: 1000 * 60 * 2,
  });

export const peakHoursOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "orders", "peak-hours", params],
    queryFn: () => fetchPeakHours(params),
    staleTime: 1000 * 60 * 2,
  });

export const trendingItemsOptions = queryOptions({
  queryKey: ["analytics", "trending"],
  queryFn: fetchTrendingItems,
  staleTime: 1000 * 60 * 5,
});

export const topSellingItemsOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "menu", "top-selling", params],
    queryFn: () => fetchTopSellingItems(params),
    staleTime: 1000 * 60 * 2,
  });

export const leastSellingItemsOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "menu", "least-selling", params],
    queryFn: () => fetchLeastSellingItems(params),
    staleTime: 1000 * 60 * 2,
  });

export const menuRevenueOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "menu", "revenue", params],
    queryFn: () => fetchMenuRevenue(params),
    staleTime: 1000 * 60 * 2,
  });

export const userPreferencesOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "users", "preferences", params],
    queryFn: () => fetchUserPreferences(params),
    staleTime: 1000 * 60 * 2,
  });

export const repeatCustomersOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "users", "repeat-customers", params],
    queryFn: () => fetchRepeatCustomers(params),
    staleTime: 1000 * 60 * 2,
  });

export const repeatRateOptions = queryOptions({
  queryKey: ["analytics", "users", "repeat-rate"],
  queryFn: fetchRepeatRate,
  staleTime: 1000 * 60 * 5,
});

export const topSpendersOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "users", "top-spenders", params],
    queryFn: () => fetchTopSpenders(params),
    staleTime: 1000 * 60 * 2,
  });

export const churnedUsersOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "users", "churned", params],
    queryFn: () => fetchChurnedUsers(params),
    staleTime: 1000 * 60 * 2,
  });

export const usersBySegmentOptions = (segment, params) =>
  queryOptions({
    queryKey: ["analytics", "users", "segment", segment, params],
    queryFn: () => fetchUsersBySegment(segment, params),
    enabled: !!segment,
    staleTime: 1000 * 60 * 2,
  });

export const couponPerformanceOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "coupons", "performance", params],
    queryFn: () => fetchCouponPerformance(params),
    staleTime: 1000 * 60 * 2,
  });

export const recommendationsOptions = (userId) =>
  queryOptions({
    queryKey: ["analytics", "recommendations", userId],
    queryFn: () => fetchRecommendations(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

// ── Profitability ──────────────────────────────────────────────────────────

export const profitabilityDashboardOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "profitability", "dashboard", params],
    queryFn: () => fetchProfitabilityDashboard(params),
    staleTime: 1000 * 60 * 2,
  });

export const mostProfitableItemsOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "profitability", "items", params],
    queryFn: () => fetchMostProfitableItems(params),
    staleTime: 1000 * 60 * 2,
  });

export const highestMarginItemsOptions = (params) =>
  queryOptions({
    queryKey: ["analytics", "profitability", "margin", params],
    queryFn: () => fetchHighestMarginItems(params),
    staleTime: 1000 * 60 * 2,
  });

