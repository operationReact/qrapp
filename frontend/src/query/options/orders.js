import { queryOptions } from "@tanstack/react-query";
import {
  getMyOrders,
  getOrdersAdmin,
  getAdminOrderDashboard,
  getLiveOrdersAdmin,
  getAdminOrder,
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

export const adminOrderDashboardOptions = (liveLimit = 12) =>
  queryOptions({
    queryKey: ["orders", "admin", "dashboard", { liveLimit }],
    queryFn: () => getAdminOrderDashboard({ liveLimit }),
    staleTime: 1000 * 15,
  });

export const liveOrdersAdminOptions = (limit = 12) =>
  queryOptions({
    queryKey: ["orders", "admin", "live", { limit }],
    queryFn: () => getLiveOrdersAdmin({ limit }),
    staleTime: 1000 * 15,
  });

export const adminOrderOptions = (id) =>
  queryOptions({
    queryKey: ["orders", "admin", id],
    queryFn: () => getAdminOrder(id),
    enabled: !!id,
    staleTime: 1000 * 30,
  });
