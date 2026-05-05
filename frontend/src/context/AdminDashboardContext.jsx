import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import {
  getOrdersAdmin,
  updateAdminOrder,
  getAdminOrder,
  getAdminOrderDashboard,
} from "../services/api";

const AdminDashboardContext = createContext(null);

export const AdminDashboardProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAdmin } = useAdminAuth();

  const [ordersPage, setOrdersPage] = useState({
    content: [],
    totalPages: 0,
    totalElements: 0,
    number: 0,
  });
  const [dashboard, setDashboard] = useState({
    totalOrders: 0,
    liveOrders: 0,
    placedOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    completedToday: 0,
    delayedOrders: 0,
    paidOrders: 0,
    averageFulfillmentMinutes: 0.0,
    liveOrdersQueue: [],
  });

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [filters, setFilters] = useState({
    query: "",
    status: "",
    paymentStatus: "",
    priority: "",
    liveOnly: false,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const [singleOrderCache, setSingleOrderCache] = useState({});

  const loadData = useCallback(
    async ({ quiet = false } = {}) => {
      if (quiet) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const ordersRes = await getOrdersAdmin({
          page,
          size,
          status: filters.status || undefined,
          paymentStatus: filters.paymentStatus || undefined,
          priority: filters.priority || undefined,
          query: filters.query || undefined,
          liveOnly: filters.liveOnly || undefined,
        });
        const dashboardRes = await getAdminOrderDashboard({ liveLimit: 12 });

        setDashboard(dashboardRes?.data);

        setOrdersPage(
          ordersRes.data || {
            content: [],
            totalPages: 0,
            totalElements: 0,
            number: 0,
          },
        );
      } catch (err) {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          setAdmin(null);
          navigate("/login", {
            replace: true,
            state: { from: location.pathname },
          });
          return;
        }
        console.error(err);
        setError(err?.response?.data || "Failed to load admin dashboard data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, size, filters, navigate, location.pathname, setAdmin],
  );

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    size,
    filters.status,
    filters.paymentStatus,
    filters.priority,
    filters.query,
    filters.liveOnly,
  ]);

  useEffect(() => {
    const timer = setInterval(() => loadData({ quiet: true }), 15000);
    return () => clearInterval(timer);
  }, [loadData]);

  const fetchOrder = useCallback(async (orderId) => {
    try {
      const res = await getAdminOrder(orderId);
      setSingleOrderCache((prev) => ({ ...prev, [orderId]: res.data }));
      return res.data;
    } catch (err) {
      console.error("Failed to fetch individual order", err);
      return null;
    }
  }, []);

  const handleOrderUpdate = useCallback(
    async (orderId, payload) => {
      setActionLoading(true);
      setError(null);
      try {
        await updateAdminOrder(orderId, payload);
        await loadData({ quiet: true });

        if (singleOrderCache[orderId]) {
          await fetchOrder(orderId);
        }
      } catch (err) {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          setAdmin(null);
          navigate("/login", {
            replace: true,
            state: { from: location.pathname },
          });
          return;
        }
        console.error(err);
        setError(err?.response?.data || "Failed to update order");
      } finally {
        setActionLoading(false);
      }
    },
    [
      loadData,
      singleOrderCache,
      fetchOrder,
      navigate,
      location.pathname,
      setAdmin,
    ],
  );

  const value = useMemo(
    () => ({
      ordersPage,
      dashboard,
      page,
      setPage,
      size,
      setSize,
      filters,
      setFilters,
      loading,
      refreshing,
      error,
      actionLoading,
      loadData,
      handleOrderUpdate,
      fetchOrder,
      singleOrderCache,
    }),
    [
      ordersPage,
      dashboard,
      page,
      size,
      filters,
      loading,
      refreshing,
      error,
      actionLoading,
      loadData,
      handleOrderUpdate,
      fetchOrder,
      singleOrderCache,
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

  const [selectedOrder, setSelectedOrder] = useState(null);
  const { ordersPage, singleOrderCache, fetchOrder } = context;

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrder(null);
      return;
    }

    const idStr = String(selectedOrderId);
    const found = ordersPage?.content?.find((o) => String(o.id) === idStr);

    if (found) {
      setSelectedOrder(found);
    } else if (singleOrderCache[idStr]) {
      setSelectedOrder(singleOrderCache[idStr]);
    } else {
      fetchOrder(idStr).then((order) => {
        if (order) setSelectedOrder(order);
      });
    }
  }, [selectedOrderId, ordersPage, singleOrderCache, fetchOrder]);

  return {
    ...context,
    selectedOrder,
  };
};
