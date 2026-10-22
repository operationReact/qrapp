import { queryOptions } from "@tanstack/react-query";
import { getEffectiveLocationId } from "@/lib/activeLocationStore";
import {
  fetchOverviewKpis,
  fetchDailySales,
  fetchDailySalesRange,
  fetchSalesSummary,
  fetchRetailGstSummary,
  fetchWeeklySales,
  fetchMonthlySales,
  fetchHourlyOrders,
  fetchOrderHeatmap,
  fetchPeakHours,
  fetchTrendingItems,
  fetchTopSellingItems,
  fetchLeastSellingItems,
  fetchMenuRevenue,
  fetchStallPerformance,
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

const storedLocationId = () => {
  return getEffectiveLocationId();
};

const scopedAnalyticsParams = (params = {}, activeLocationId) => {
  const sourceParams = params ?? {};
  const hasParamLocation = Object.prototype.hasOwnProperty.call(sourceParams, "locationId");
  const locationId = activeLocationId !== undefined
    ? activeLocationId
    : (hasParamLocation ? sourceParams.locationId : storedLocationId());
  const scopedParams = { ...sourceParams };
  if (locationId != null) scopedParams.locationId = locationId;
  else delete scopedParams.locationId;
  return { locationId, params: scopedParams };
};

export const overviewKpisOptions = (activeLocationId) => {
  const scoped = scopedAnalyticsParams({}, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "overview", scoped.locationId],
    queryFn: () => fetchOverviewKpis(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const dailySalesOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "sales", "daily", scoped.locationId, scoped.params],
    queryFn: () => fetchDailySales(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const dailySalesRangeOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "sales", "daily-range", scoped.locationId, scoped.params],
    queryFn: () => fetchDailySalesRange(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const salesSummaryOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "sales", "summary", scoped.locationId, scoped.params],
    queryFn: () => fetchSalesSummary(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const retailGstOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "sales", "retail-gst", scoped.locationId, scoped.params],
    queryFn: () => fetchRetailGstSummary(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const weeklySalesOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "sales", "weekly", scoped.locationId, scoped.params],
    queryFn: () => fetchWeeklySales(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const monthlySalesOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "sales", "monthly", scoped.locationId, scoped.params],
    queryFn: () => fetchMonthlySales(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const hourlyOrdersOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "orders", "hourly", scoped.locationId, scoped.params],
    queryFn: () => fetchHourlyOrders(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const orderHeatmapOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "orders", "heatmap", scoped.locationId, scoped.params],
    queryFn: () => fetchOrderHeatmap(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const peakHoursOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "orders", "peak-hours", scoped.locationId, scoped.params],
    queryFn: () => fetchPeakHours(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const trendingItemsOptions = () =>
  queryOptions({
    queryKey: ["analytics", "trending"],
    queryFn: fetchTrendingItems,
    staleTime: 1000 * 60 * 5,
  });

export const topSellingItemsOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "menu", "top-selling", scoped.locationId, scoped.params],
    queryFn: () => fetchTopSellingItems(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const leastSellingItemsOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "menu", "least-selling", scoped.locationId, scoped.params],
    queryFn: () => fetchLeastSellingItems(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const menuRevenueOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "menu", "revenue", scoped.locationId, scoped.params],
    queryFn: () => fetchMenuRevenue(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const stallPerformanceOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "stalls", "performance", scoped.locationId, scoped.params],
    queryFn: () => fetchStallPerformance(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const userPreferencesOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "users", "preferences", scoped.locationId, scoped.params],
    queryFn: () => fetchUserPreferences(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const repeatCustomersOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "users", "repeat-customers", scoped.locationId, scoped.params],
    queryFn: () => fetchRepeatCustomers(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const repeatRateOptions = (activeLocationId) => {
  const scoped = scopedAnalyticsParams({}, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "users", "repeat-rate", scoped.locationId],
    queryFn: () => fetchRepeatRate(scoped.params),
    staleTime: 1000 * 60 * 5,
  });
};

export const topSpendersOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "users", "top-spenders", scoped.locationId, scoped.params],
    queryFn: () => fetchTopSpenders(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const churnedUsersOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "users", "churned", scoped.locationId, scoped.params],
    queryFn: () => fetchChurnedUsers(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const usersBySegmentOptions = (segment, params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "users", "segment", segment, scoped.locationId, scoped.params],
    queryFn: () => fetchUsersBySegment(segment, scoped.params),
    enabled: !!segment,
    staleTime: 1000 * 60 * 2,
  });
};

export const couponPerformanceOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "coupons", "performance", scoped.locationId, scoped.params],
    queryFn: () => fetchCouponPerformance(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const recommendationsOptions = (userId) =>
  queryOptions({
    queryKey: ["analytics", "recommendations", userId],
    queryFn: () => fetchRecommendations(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

// ── Profitability ──────────────────────────────────────────────────────────

export const profitabilityDashboardOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "profitability", "dashboard", scoped.locationId, scoped.params],
    queryFn: () => fetchProfitabilityDashboard(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const mostProfitableItemsOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "profitability", "items", scoped.locationId, scoped.params],
    queryFn: () => fetchMostProfitableItems(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};

export const highestMarginItemsOptions = (params, activeLocationId) => {
  const scoped = scopedAnalyticsParams(params, activeLocationId);
  return queryOptions({
    queryKey: ["analytics", "profitability", "margin", scoped.locationId, scoped.params],
    queryFn: () => fetchHighestMarginItems(scoped.params),
    staleTime: 1000 * 60 * 2,
  });
};
