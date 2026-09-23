import { useQuery } from '@tanstack/react-query'
import { useLocation as useActiveLocation } from '@/context/LocationContext'
import {
  overviewKpisOptions,
  dailySalesOptions,
  dailySalesRangeOptions,
  salesSummaryOptions,
  weeklySalesOptions,
  monthlySalesOptions,
  hourlyOrdersOptions,
  orderHeatmapOptions,
  peakHoursOptions,
  trendingItemsOptions,
  topSellingItemsOptions,
  leastSellingItemsOptions,
  menuRevenueOptions,
  stallPerformanceOptions,
  userPreferencesOptions,
  repeatCustomersOptions,
  repeatRateOptions,
  topSpendersOptions,
  churnedUsersOptions,
  usersBySegmentOptions,
  couponPerformanceOptions,
  recommendationsOptions,
  profitabilityDashboardOptions,
  mostProfitableItemsOptions,
  highestMarginItemsOptions,
} from '@/query/options/analytics'

function useQueryWrapper(options) {
  const { data, isLoading, error, refetch } = useQuery(options)
  return { data, loading: isLoading, error, refetch }
}

function useScopedAnalyticsQuery(optionsFactory, ...args) {
  const { activeLocationId } = useActiveLocation()
  return useQueryWrapper(optionsFactory(...args, activeLocationId))
}

export const useOverviewKpis = () =>
  useScopedAnalyticsQuery(overviewKpisOptions)

export const useDailySales = (params) =>
  useScopedAnalyticsQuery(dailySalesOptions, params)

export const useDailySalesRange = (params) =>
  useScopedAnalyticsQuery(dailySalesRangeOptions, params)

export const useSalesSummary = (params) =>
  useScopedAnalyticsQuery(salesSummaryOptions, params)

export const useWeeklySales = (params) =>
  useScopedAnalyticsQuery(weeklySalesOptions, params)

export const useMonthlySales = (params) =>
  useScopedAnalyticsQuery(monthlySalesOptions, params)

export const useHourlyOrders = (params) =>
  useScopedAnalyticsQuery(hourlyOrdersOptions, params)

export const useOrderHeatmap = (params) =>
  useScopedAnalyticsQuery(orderHeatmapOptions, params)

export const usePeakHours = (params) =>
  useScopedAnalyticsQuery(peakHoursOptions, params)

export const useTopSellingItems = (params) =>
  useScopedAnalyticsQuery(topSellingItemsOptions, params)

export const useLeastSellingItems = (params) =>
  useScopedAnalyticsQuery(leastSellingItemsOptions, params)

export const useMenuRevenue = (params) =>
  useScopedAnalyticsQuery(menuRevenueOptions, params)

export const useStallPerformance = (params) =>
  useScopedAnalyticsQuery(stallPerformanceOptions, params)

export const useUserPreferences = (params) =>
  useScopedAnalyticsQuery(userPreferencesOptions, params)

export const useRepeatCustomers = (params) =>
  useScopedAnalyticsQuery(repeatCustomersOptions, params)

export const useRepeatRate = () =>
  useScopedAnalyticsQuery(repeatRateOptions)

export const useTopSpenders = (params) =>
  useScopedAnalyticsQuery(topSpendersOptions, params)

export const useChurnedUsers = (params) =>
  useScopedAnalyticsQuery(churnedUsersOptions, params)

export const useUsersBySegment = (segment, params) =>
  useScopedAnalyticsQuery(usersBySegmentOptions, segment, params)

export const useCouponAnalytics = (params) =>
  useScopedAnalyticsQuery(couponPerformanceOptions, params)

export const useTrendingItems = () =>
  useQueryWrapper(trendingItemsOptions())

export const useRecommendations = (userId) =>
  useQueryWrapper(recommendationsOptions(userId))

// ── Profitability ──────────────────────────────────────────────────────────

export const useProfitabilityDashboard = (params) =>
  useScopedAnalyticsQuery(profitabilityDashboardOptions, params)

export const useMostProfitableItems = (params) =>
  useScopedAnalyticsQuery(mostProfitableItemsOptions, params)

export const useHighestMarginItems = (params) =>
  useScopedAnalyticsQuery(highestMarginItemsOptions, params)
