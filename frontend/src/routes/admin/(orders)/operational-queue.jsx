import {
  createFileRoute,
  Navigate,
  Outlet,
  useParams,
  Link,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import OrderItem from "@/components/admin/OrderItem";
import OrderDetailPanel from "@/components/admin/OrderDetailPanel";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import React, { useEffect, useState } from "react";
import {
  ArrowCounterClockwiseIcon,
  MagnifyingGlassIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────────────────────────
// Static config
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CHIPS = [
  { value: "", label: "All" },
  { value: "ORDER_PLACED", label: "New" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY", label: "Ready" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_ACTIVE = {
  "": "bg-gray-900 border-gray-900 text-white",
  ORDER_PLACED: "bg-violet-600 border-violet-600 text-white",
  PREPARING: "bg-orange-500 border-orange-500 text-white",
  READY: "bg-green-600 border-green-600 text-white",
  COMPLETED: "bg-blue-600 border-blue-600 text-white",
  CANCELLED: "bg-red-600 border-red-600 text-white",
};

const STATS_CONFIG = [
  {
    key: "ORDER_PLACED",
    label: "New",
    dashKey: "placedOrders",
    bg: "bg-violet-50",
    numCls: "text-violet-700",
    lblCls: "text-violet-600",
  },
  {
    key: "PREPARING",
    label: "Cooking",
    dashKey: "preparingOrders",
    bg: "bg-orange-50",
    numCls: "text-orange-700",
    lblCls: "text-orange-600",
  },
  {
    key: "READY",
    label: "Ready",
    dashKey: "readyOrders",
    bg: "bg-green-50",
    numCls: "text-green-700",
    lblCls: "text-green-600",
  },
  {
    key: "DELAYED",
    label: "Delayed",
    dashKey: "delayedOrders",
    bg: null, // computed
    numCls: null,
    lblCls: null,
  },
];

export const Route = createFileRoute("/admin/(orders)/operational-queue")({
  component: OperationalQueuePage,
});

function OperationalQueuePage() {
  const {
    ordersPage,
    dashboard,
    page,
    setPage,
    size,
    setSize,
    filters,
    setFilters,
    handleOrderUpdate,
    refreshing,
    loading,
  } = useAdminDashboard();

  const params = useParams({ strict: false });
  const selectedId = params?.orderId ? Number(params.orderId) : undefined;
  const { isAdmin, isSuperUser } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [mobileOrderId, setMobileOrderId] = useState(null);

  const { selectedOrder: mobileOrder, actionLoading: mobileActionLoading } =
    useAdminDashboard(mobileOrderId ? String(mobileOrderId) : undefined);

  // Close mobile drawer when viewport expands to desktop
  useEffect(() => {
    if (!isMobile) setTimeout(() => setMobileOrderId(null), 0);
  }, [isMobile]);

  if (!isAdmin && !isSuperUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const orders = ordersPage?.content ?? [];
  const totalPages = ordersPage?.totalPages ?? 1;
  const totalElements = ordersPage?.totalElements ?? 0;
  const isActive = refreshing || loading;

  // ── Filter setters ──
  const setStatus = (value) => {
    setPage(0);
    setFilters((p) => ({ ...p, status: value, liveOnly: false }));
  };
  const setPayment = (paymentStatus) => {
    setPage(0);
    setFilters((p) => ({ ...p, paymentStatus }));
  };
  const toggleLive = () => {
    setPage(0);
    setFilters((p) => ({ ...p, liveOnly: !p.liveOnly, status: "" }));
  };
  const handleSearch = (e) => {
    setPage(0);
    setFilters((p) => ({ ...p, query: e.target.value }));
  };
  const clearSearch = () => {
    setPage(0);
    setFilters((p) => ({ ...p, query: "" }));
  };

  const handleCardClick = (order, e) => {
    if (isMobile) {
      e.preventDefault();
      setMobileOrderId(order.id);
    }
  };

  // ── Dynamic stat chip styling (delayed turns red when > 0) ──
  const delayedCount = dashboard?.delayedOrders ?? 0;
  const STATS = STATS_CONFIG.map((s) => {
    if (s.key !== "DELAYED")
      return { ...s, count: dashboard?.[s.dashKey] ?? 0 };
    return {
      ...s,
      count: delayedCount,
      bg: delayedCount > 0 ? "bg-red-50" : "bg-gray-50",
      numCls: delayedCount > 0 ? "text-red-700" : "text-gray-300",
      lblCls: delayedCount > 0 ? "text-red-400" : "text-gray-300",
    };
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ══════════════════════════════════════════════════
          Sticky header
          ══════════════════════════════════════════════════ */}
      <div className="border-b bg-white sticky top-0 z-20 px-4 pt-3 pb-3 space-y-3">
        {/* Title + Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Kitchen Queue
            </h1>
            {isActive && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["orders", "admin"] })
            }
            disabled={isActive}
          >
            <ArrowCounterClockwiseIcon
              weight="bold"
              className={cn(isActive && "animate-spin")}
            />
            Refresh
          </Button>
        </div>

        {/* Compact stats chips — tap to quick-filter */}
        <div className="grid grid-cols-4 gap-3">
          {STATS.map((s) => {
            const isStatActive =
              s.key === "DELAYED" ? filters.liveOnly : filters.status === s.key;
            return (
              <button
                key={s.key}
                onClick={() => {
                  if (s.key === "DELAYED") toggleLive();
                  else setStatus(filters.status === s.key ? "" : s.key);
                }}
                className={cn(
                  "flex flex-col gap-1 items-center justify-center rounded-sm py-2 px-1 transition-all active:scale-95",
                  s.bg,
                  isStatActive && "ring-1 ring-foreground",
                )}
              >
                <span
                  className={cn(
                    "text-lg font-bold leading-none tabular-nums",
                    s.numCls,
                  )}
                >
                  {s.count}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium mt-0.5 leading-none",
                    s.lblCls,
                  )}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <InputGroup className="h-10">
          <InputGroupAddon>
            <MagnifyingGlassIcon weight="bold" />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            value={filters.query}
            onChange={handleSearch}
            placeholder="Search by order ID or phone…"
          />
          {filters.query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[16px] leading-none text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </InputGroup>

        {/* Inline filter chips */}
        <div
          className="flex gap-2 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {/* Status */}
          {STATUS_CHIPS.map((c) => {
            const active =
              (filters.status || "") === c.value && !filters.liveOnly;
            return (
              <button
                key={`s-${c.value}`}
                onClick={() => setStatus(c.value)}
                className={cn(
                  "shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold border transition-all whitespace-nowrap",
                  active
                    ? STATUS_ACTIVE[c.value]
                    : "bg-white border-gray-200 text-gray-600",
                )}
              >
                {c.label}
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px bg-gray-200 shrink-0 my-0.5" />

          {/* Payment */}
          {[
            { value: "", label: "All Payments" },
            { value: "PAID", label: "Paid" },
            { value: "PENDING", label: "Unpaid" },
          ].map((c) => {
            const active = (filters.paymentStatus || "") === c.value;
            return (
              <button
                key={`p-${c.value}`}
                onClick={() => setPayment(c.value)}
                className={cn(
                  "shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold border transition-all whitespace-nowrap",
                  active
                    ? c.value === "PAID"
                      ? "bg-green-600 border-green-600 text-white"
                      : c.value === "PENDING"
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-gray-900 border-gray-900 text-white"
                    : "bg-white border-gray-200 text-gray-600",
                )}
              >
                {c.label}
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px bg-gray-200 shrink-0 my-0.5" />

          {/* Live only */}
          <button
            onClick={toggleLive}
            className={cn(
              "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold border transition-all whitespace-nowrap",
              filters.liveOnly
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-white border-gray-200 text-gray-600",
            )}
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              {filters.liveOnly ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </>
              ) : (
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gray-400" />
              )}
            </span>
            Live Only
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          Split content — list left, detail right (desktop)
          ══════════════════════════════════════════════════ */}
      <div className="flex max-h-[calc(100vh-212.4px-48.8px)] flex-1 min-h-0 overflow-hidden">
        {/* ── Order list pane ── */}
        <div
          className={cn(
            "flex flex-col",
            "flex-1 lg:flex-none lg:w-[460px] lg:border-r",
          )}
        >
          {/* List */}
          <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar px-3 pt-2 pb-2">
            {loading && orders.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-2xl bg-gray-200"
                  />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CheckCircleIcon
                  weight="thin"
                  className="size-14 text-gray-300"
                />
                <span className="text-[13px] font-semibold text-gray-400">
                  No orders found
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/admin/operational-queue/${order.id}`}
                    onClick={(e) => handleCardClick(order, e)}
                    className={cn(
                      "block border bg-transparent pl-0 rounded-r-lg transition-all",
                      order.id === selectedId || order.id === mobileOrderId
                        ? "border-gray-200 bg-white"
                        : "bg-white md:bg-transparent border-gray-100 hover:border-gray-200",
                    )}
                  >
                    <OrderItem
                      order={order}
                      onAction={(orderId, status) =>
                        handleOrderUpdate(orderId, { status })
                      }
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="shrink-0 border-t bg-white px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-medium">
                {totalElements} orders
              </span>
              {/* Page size select — desktop only */}
              <select
                value={size}
                onChange={(e) => {
                  setPage(0);
                  setSize(Number(e.target.value));
                }}
                className="hidden lg:block text-[11px] text-gray-500 border border-gray-200 rounded-lg px-1.5 py-1 bg-white outline-none"
              >
                {[10, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n}/page
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-gray-600 disabled:opacity-40 active:bg-gray-100 transition-colors"
              >
                <CaretLeftIcon weight="bold" className="size-3" />
                Prev
              </button>
              <span className="text-[11px] text-gray-400 font-medium px-1 tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-gray-600 disabled:opacity-40 active:bg-gray-100 transition-colors"
              >
                Next
                <CaretRightIcon weight="bold" className="size-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Desktop detail pane ── */}
        <div className="hidden lg:flex flex-col flex-1 min-h-0 bg-white overflow-y-auto">
          <div className="p-4">
            <Outlet />
          </div>
        </div>
      </div>

      {/* ── Mobile bottom drawer ── */}
      <Drawer
        open={!!mobileOrderId}
        onOpenChange={(open) => {
          if (!open) setMobileOrderId(null);
        }}
      >
        <DrawerContent className="max-h-[92dvh]">
          <DrawerHeader className="pb-1 border-b">
            <DrawerTitle className="text-[16px] font-bold">
              {mobileOrder
                ? (mobileOrder.orderNumber ?? `#${mobileOrder.id}`)
                : "Order Details"}
            </DrawerTitle>
          </DrawerHeader>
          <div
            className="overflow-y-auto px-4 pb-8 pt-3"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <OrderDetailPanel
              order={mobileOrder}
              actionLoading={mobileActionLoading}
              onUpdate={(payload) => handleOrderUpdate(mobileOrderId, payload)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
