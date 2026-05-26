import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminOrdersOptions, adminOrderDashboardOptions, adminOrderOptions } from "@/query/options/orders";
import { updateAdminOrder } from "@/services/order-service";
import { useAuth } from "./AuthContext";

const AdminDashboardContext = createContext(null);

export const AdminDashboardProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser: setAdmin } = useAuth();
  const queryClient = useQueryClient();


  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [filters, setFilters] = useState({
    query: "",
    status: "",
    paymentStatus: "",
    priority: "",
    liveOnly: false,
  });

  const ordersParams = useMemo(() => {
    const params = { page, size };
    if (filters.status) params.status = filters.status;
    if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
    if (filters.priority) params.priority = filters.priority;
    if (filters.query) params.query = filters.query;
    if (typeof filters.liveOnly === "boolean") params.liveOnly = filters.liveOnly;
    return params;
  }, [page, size, filters]);

  const {
    data: ordersPage,
    isLoading: loading,
    isRefetching: refreshing,
    error: queryError,
  } = useQuery(adminOrdersOptions(ordersParams));

  const { data: dashboard } = useQuery(adminOrderDashboardOptions());

  useEffect(() => {
    if (queryError && (queryError?.response?.status === 401 || queryError?.response?.status === 403)) {
      setAdmin(null);
      navigate({ to: "/login", replace: true, state: { from: location.pathname } });
    }
  }, [queryError, navigate, setAdmin]);

  const error = useMemo(() => {
    if (!queryError) return null;
    return queryError?.response?.data || "Failed to load admin dashboard data";
  }, [queryError]);

  const orderUpdateMutation = useMutation({
    mutationFn: ({ orderId, payload }) => updateAdminOrder(orderId, payload),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin', String(orderId)] });
    },
    onError: (err) => {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setAdmin(null);
        navigate({ to: "/login", replace: true, state: { from: location.pathname } });
      }
    },
  });

  const loadData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] });
  }, [queryClient]);

  const handleOrderUpdate = useCallback(async (orderId, payload) => {
    try {
      await orderUpdateMutation.mutateAsync({ orderId, payload });
    } catch (err) {
      console.error(err);
    }
  }, [orderUpdateMutation]);

  const ordersPageOrDefault = ordersPage || { content: [], totalPages: 0, totalElements: 0, number: 0 };
  const dashboardOrDefault = dashboard || {
    totalOrders: 0, liveOrders: 0, placedOrders: 0, preparingOrders: 0,
    readyOrders: 0, completedToday: 0, delayedOrders: 0, paidOrders: 0,
    averageFulfillmentMinutes: 0, liveOrdersQueue: [],
  };

  const value = useMemo(
    () => ({
      ordersPage: ordersPageOrDefault,
      dashboard: dashboardOrDefault,
      page, setPage, size, setSize,
      filters, setFilters,
      loading: loading && !ordersPage,
      refreshing, error,
      actionLoading: orderUpdateMutation.isPending,
      loadData, handleOrderUpdate,
    }),
    [
      ordersPageOrDefault, dashboardOrDefault,
      page, size, filters, loading, refreshing, error,
      orderUpdateMutation.isPending,
      loadData, handleOrderUpdate,
    ],
  );

  return (
    <AdminDashboardContext.Provider value={value}>
      {children}
    </AdminDashboardContext.Provider>
  );
};

export const useAdminDashboard = (selectedOrderId) => {
  const context = useContext(AdminDashboardContext);
  if (!context) {
    throw new Error(
      "useAdminDashboard must be used within an AdminDashboardProvider",
    );
  }

  const { ordersPage } = context;

  const orderFromPage = useMemo(() => {
    if (!selectedOrderId || !ordersPage?.content) return null;
    return ordersPage.content.find((o) => String(o.id) === String(selectedOrderId)) || null;
  }, [selectedOrderId, ordersPage]);

  const { data: fetchedOrder } = useQuery({
    ...adminOrderOptions(selectedOrderId),
    enabled: !!selectedOrderId && !orderFromPage,
  });

  const selectedOrder = orderFromPage || fetchedOrder || null;

  return {
    ...context,
    selectedOrder,
  };
};
