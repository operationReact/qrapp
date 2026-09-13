import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminOrderDashboard, updateAdminOrder } from "@/services/order-service";
import { useAuth } from "@/context/AuthContext";
import { formatAge } from "@/lib/utils";

const STATUS_META = {
  PLACED: {
    label: "Placed",
    tone: "bg-amber-100 text-amber-800 border-amber-200",
  },
  PREPARING: {
    label: "Preparing",
    tone: "bg-sky-100 text-sky-800 border-sky-200",
  },
  READY: {
    label: "Ready",
    tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  COMPLETED: {
    label: "Completed",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

const PRIORITY_META = {
  NORMAL: {
    label: "Normal",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
  },
  HIGH: {
    label: "High",
    tone: "bg-orange-100 text-orange-700 border-orange-200",
  },
  URGENT: {
    label: "Urgent",
    tone: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

const LIVE_STAGES = ["PLACED", "PREPARING", "READY"];

function formatCurrency(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function toneForStatus(status) {
  return STATUS_META[status] || STATUS_META.ORDER_PLACED;
}

function toneForPriority(priority) {
  return PRIORITY_META[priority] || PRIORITY_META.NORMAL;
}

function summarizeItems(order) {
  const items = order?.items || [];
  if (!items.length) return "No items attached";
  return items
    .slice(0, 3)
    .map((item) => `${item.name || "Item"} ×${item.quantity}`)
    .join(", ");
}

export default function AdminOrderOperations({ embedded = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser: setAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [page] = useState(0);
  const [size] = useState(10);
  const [filters] = useState({
    query: "",
    status: "",
    paymentStatus: "",
    priority: "",
    liveOnly: false,
  });

  const orderUpdateMutation = useMutation({
    mutationFn: ({ orderId, payload }) => updateAdminOrder(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] });
    },
    onError: (err) => {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setAdmin(null);
        navigate({ to: "/login", replace: true, state: { from: location.pathname } });
      }
    },
  });

  async function loadData({ quiet = false } = {}) {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const nextDashboard = await getAdminOrderDashboard({ liveLimit: 12 });
      setDashboard(nextDashboard || {});
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setAdmin(null);
        navigate({ to: "/login", 
          replace: true,
          state: { from: location.pathname },
        });
        return;
      }
      console.error(err);
      setError(err?.response?.data || "Failed to load admin orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);
    return () => window.clearTimeout(timer);
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
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => {
      loadData({ quiet: true });
    }, 15000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoRefresh,
    page,
    size,
    filters.status,
    filters.paymentStatus,
    filters.priority,
    filters.query,
    filters.liveOnly,
  ]);

  async function handleOrderUpdate(orderId, payload) {
    try {
      await orderUpdateMutation.mutateAsync({ orderId, payload });
      await loadData({ quiet: true });
    } catch (err) {
      console.error(err);
      setError(err?.response?.data || "Failed to update order");
    }
  }

  const groupedLiveOrders = LIVE_STAGES.reduce((acc, stage) => {
    acc[stage] = (dashboard?.liveOrdersQueue || []).filter(
      (order) => order.status === stage,
    );
    return acc;
  }, {});

  const stats = [
    {
      label: "Live orders",
      value: dashboard?.liveOrders ?? 0,
      subtext: "Orders needing action right now",
    },
    {
      label: "Placed",
      value: dashboard?.placedOrders ?? 0,
      subtext: "Freshly created and waiting",
    },
    {
      label: "Preparing",
      value: dashboard?.preparingOrders ?? 0,
      subtext: "Kitchen currently working",
    },
    {
      label: "Ready",
      value: dashboard?.readyOrders ?? 0,
      subtext: "Ready for pickup / handoff",
    },
    {
      label: "Delayed",
      value: dashboard?.delayedOrders ?? 0,
      subtext: "Orders outside expected SLA",
    },
    {
      label: "Completed today",
      value: dashboard?.completedToday ?? 0,
      subtext: `${dashboard?.averageFulfillmentMinutes ?? 0} min avg fulfillment`,
    },
  ];

  return (
    <section className="space-y-6">
      {!embedded && (
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between sm:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Admin Operations
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Order command center
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Manage live orders, push them through each stage, spot delays
              early, and keep the team aligned from one professional workspace.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              onClick={() => navigate({ to: "/admin" })}
              className="touch-button rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Dashboard
            </button>
            <button
              onClick={() => loadData({ quiet: true })}
              className="touch-button rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Refresh now
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-sm font-medium text-slate-500">
              {stat.label}
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">
              {stat.value}
            </div>
            <div className="mt-2 text-xs text-slate-500">{stat.subtext}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Live service board
          </h2>
          <p className="text-sm text-slate-500">
            The oldest orders float to the top so nothing gets missed during
            rush hour.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:items-center">
          <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Auto refresh every 15s
          </label>
          <div className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">
            {refreshing ? "Refreshing…" : "Realtime polling active"}
          </div>
        </div>
      </div>

      {dashboard?.attentionOrders?.length > 0 && (
        <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-orange-900">
                Attention needed
              </h3>
              <p className="text-sm text-orange-700">
                These orders are either delayed, urgent, or waiting to be handed
                over.
              </p>
            </div>
            <div className="text-sm font-medium text-orange-800">
              {dashboard.attentionOrders.length} flagged orders
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.attentionOrders.map((order) => (
              <button
                key={`attention-${order.id}`}
                type="button"
                className="rounded-2xl border border-orange-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Order #{order.id}
                    </div>
                    <div className="text-xs text-slate-500">{order.phone}</div>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneForStatus(order.status).tone}`}
                  >
                    {toneForStatus(order.status).label}
                  </span>
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  {summarizeItems(order)}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {order.delayed && (
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-700">
                      Delayed
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2.5 py-1 font-semibold ${toneForPriority(order.priority).tone}`}
                  >
                    {toneForPriority(order.priority).label}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                    {formatAge(order.stageAgeMinutes)} in stage
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {LIVE_STAGES.map((stage) => (
            <div
              key={stage}
              className="h-48 animate-pulse rounded-3xl bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {LIVE_STAGES.map((stage) => (
            <div
              key={stage}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {toneForStatus(stage).label}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {groupedLiveOrders[stage]?.length || 0} live orders
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneForStatus(stage).tone}`}
                >
                  {groupedLiveOrders[stage]?.length || 0}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {(groupedLiveOrders[stage] || []).length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No orders in this stage.
                  </div>
                )}
                {(groupedLiveOrders[stage] || []).map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        className="text-left"
                      >
                        <div className="text-base font-semibold text-slate-900">
                          Order #{order.id}
                        </div>
                        <div className="text-sm text-slate-500">
                          {order.phone}
                        </div>
                      </button>
                      <div className="text-right text-xs text-slate-500">
                        <div>{formatDateTime(order.createdAt)}</div>
                        <div className="mt-1 font-semibold text-slate-700">
                          {formatAge(order.ageMinutes)} old
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      {summarizeItems(order)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span
                        className={`rounded-full border px-2.5 py-1 font-semibold ${toneForPriority(order.priority).tone}`}
                      >
                        {toneForPriority(order.priority).label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        {formatCurrency(order.total)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        {order.totalItems} items
                      </span>
                      {order.delayed && (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-700">
                          Delayed
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(order.availableTransitions || [])
                        .slice(0, 3)
                        .map((nextStatus) => (
                          <button
                            key={`${order.id}-${nextStatus}`}
                            onClick={() =>
                              handleOrderUpdate(order.id, {
                                status: nextStatus,
                              })
                            }
                            disabled={orderUpdateMutation.isPending}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Move to {toneForStatus(nextStatus).label}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

    </section>
  );
}

AdminOrderOperations.propTypes = {
  embedded: PropTypes.bool,
};
