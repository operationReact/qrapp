import { useState, useEffect, useRef } from "react";
import * as svc from "@/services/analyticsService";

function useFetch(fetcher, depsKey = "") {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcherRef.current()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, tick]);

  return { data, loading, error, refetch: () => setTick((t) => t + 1) };
}

export const useOverviewKpis = () =>
  useFetch(() => svc.fetchOverviewKpis());

export const useDailySales = (params) =>
  useFetch(() => svc.fetchDailySales(params), JSON.stringify(params));

export const useWeeklySales = (params) =>
  useFetch(() => svc.fetchWeeklySales(params), JSON.stringify(params));

export const useMonthlySales = (params) =>
  useFetch(() => svc.fetchMonthlySales(params), JSON.stringify(params));

export const useHourlyOrders = (params) =>
  useFetch(() => svc.fetchHourlyOrders(params), JSON.stringify(params));

export const usePeakHours = (params) =>
  useFetch(() => svc.fetchPeakHours(params), JSON.stringify(params));

export const useTopSellingItems = (params) =>
  useFetch(() => svc.fetchTopSellingItems(params), JSON.stringify(params));

export const useLeastSellingItems = (params) =>
  useFetch(() => svc.fetchLeastSellingItems(params), JSON.stringify(params));

export const useMenuRevenue = (params) =>
  useFetch(() => svc.fetchMenuRevenue(params), JSON.stringify(params));

export const useUserPreferences = (params) =>
  useFetch(() => svc.fetchUserPreferences(params), JSON.stringify(params));

export const useRepeatCustomers = (params) =>
  useFetch(() => svc.fetchRepeatCustomers(params), JSON.stringify(params));

export const useCouponAnalytics = (params) =>
  useFetch(() => svc.fetchCouponPerformance(params), JSON.stringify(params));

export const useTrendingItems = () =>
  useFetch(() => svc.fetchTrendingItems());

export const useRecommendations = (userId) =>
  useFetch(() => svc.fetchRecommendations(userId), String(userId));

