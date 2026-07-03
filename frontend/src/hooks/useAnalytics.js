import { useQuery } from '@tanstack/react-query'
import {
  overviewKpisOptions,
  dailySalesOptions,
  weeklySalesOptions,
  monthlySalesOptions,
  hourlyOrdersOptions,
  peakHoursOptions,
  trendingItemsOptions,
  topSellingItemsOptions,
  leastSellingItemsOptions,
  menuRevenueOptions,
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

export const useOverviewKpis = () =>
  useQueryWrapper(overviewKpisOptions)

export const useDailySales = (params) =>
  useQueryWrapper(dailySalesOptions(params))

export const useWeeklySales = (params) =>
  useQueryWrapper(weeklySalesOptions(params))

export const useMonthlySales = (params) =>
  useQueryWrapper(monthlySalesOptions(params))

export const useHourlyOrders = (params) =>
  useQueryWrapper(hourlyOrdersOptions(params))

export const usePeakHours = (params) =>
  useQueryWrapper(peakHoursOptions(params))

export const useTopSellingItems = (params) =>
  useQueryWrapper(topSellingItemsOptions(params))

export const useLeastSellingItems = (params) =>
  useQueryWrapper(leastSellingItemsOptions(params))

export const useMenuRevenue = (params) =>
  useQueryWrapper(menuRevenueOptions(params))

export const useUserPreferences = (params) =>
  useQueryWrapper(userPreferencesOptions(params))

export const useRepeatCustomers = (params) =>
  useQueryWrapper(repeatCustomersOptions(params))

export const useRepeatRate = () =>
  useQueryWrapper(repeatRateOptions)

export const useTopSpenders = (params) =>
  useQueryWrapper(topSpendersOptions(params))

export const useChurnedUsers = (params) =>
  useQueryWrapper(churnedUsersOptions(params))

export const useUsersBySegment = (segment, params) =>
  useQueryWrapper(usersBySegmentOptions(segment, params))

export const useCouponAnalytics = (params) =>
  useQueryWrapper(couponPerformanceOptions(params))

export const useTrendingItems = () =>
  useQueryWrapper(trendingItemsOptions)

export const useRecommendations = (userId) =>
  useQueryWrapper(recommendationsOptions(userId))

// ── Profitability ──────────────────────────────────────────────────────────

export const useProfitabilityDashboard = (params) =>
  useQueryWrapper(profitabilityDashboardOptions(params))

export const useMostProfitableItems = (params) =>
  useQueryWrapper(mostProfitableItemsOptions(params))

export const useHighestMarginItems = (params) =>
  useQueryWrapper(highestMarginItemsOptions(params))

