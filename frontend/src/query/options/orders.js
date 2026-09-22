import { queryOptions } from "@tanstack/react-query";
import {
  getMyOrders,
  getOrdersAdmin,
  getAdminOrderDashboard,
  getLiveOrdersAdmin,
  getAdminOrder,
  getAdminPreOrders,
  getAdminPreOrderDashboard,
  getPreOrderItems,
  getAdminPreOrderItems,
  getPaymentConfig,
  getAdminSettings,
} from "../../services/order-service";

export const myOrdersOptions = queryOptions({
  queryKey: ["orders", "my"],
  queryFn: getMyOrders,
  staleTime: 1000 * 30,
});

export const adminOrdersOptions = (params = {}) =>
  queryOptions({
    queryKey: ["orders", "admin", params],
    queryFn: () => getOrdersAdmin(params),
    staleTime: 1000 * 15,
  });

export const adminOrderDashboardOptions = (liveLimit = 12, locationId = null) =>
  queryOptions({
    queryKey: ["orders", "admin", "dashboard", { liveLimit, locationId }],
    queryFn: () => getAdminOrderDashboard({ liveLimit, locationId }),
    staleTime: 1000 * 15,
    refetchInterval: 15000,
  });

export const liveOrdersAdminOptions = (limit = 12, locationId = null) =>
  queryOptions({
    queryKey: ["orders", "admin", "live", { limit, locationId }],
    queryFn: () => getLiveOrdersAdmin({ limit, locationId }),
    staleTime: 1000 * 15,
  });

export const adminOrderOptions = (id) =>
  queryOptions({
    queryKey: ["orders", "admin", id],
    queryFn: () => getAdminOrder(id),
    enabled: !!id,
    staleTime: 1000 * 30,
  });

export const adminPreOrdersOptions = (params = {}) =>
  queryOptions({
    queryKey: ["pre-orders", "admin", params],
    queryFn: () => getAdminPreOrders(params),
    staleTime: 1000 * 15,
  });

export const adminPreOrderDashboardOptions = (upcomingLimit = 12, locationId = null) =>
  queryOptions({
    queryKey: ["pre-orders", "admin", "dashboard", { upcomingLimit, locationId }],
    queryFn: () => getAdminPreOrderDashboard({ upcomingLimit, locationId }),
    staleTime: 1000 * 15,
  });

export const preOrderItemsOptions = queryOptions({
  queryKey: ["pre-orders", "items"],
  queryFn: getPreOrderItems,
  staleTime: 1000 * 60 * 5, // 5 min — public, no auth needed
});

export const adminPreOrderItemsOptions = queryOptions({
  queryKey: ["pre-orders", "items", "admin"],
  queryFn: getAdminPreOrderItems,
  staleTime: 1000 * 60 * 5,
});

/** Public — no auth needed. Used in cart to show Pay at Stall option. */
export const paymentConfigOptions = queryOptions({
  queryKey: ["payment", "config"],
  queryFn: getPaymentConfig,
  staleTime: 1000 * 60,   // 1 min
  retry: 2,
});

/** Admin — payment + feature flag settings. */
export const adminSettingsOptions = queryOptions({
  queryKey: ["admin", "settings"],
  queryFn: getAdminSettings,
  staleTime: 1000 * 30,
});
