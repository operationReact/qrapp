import { createFileRoute, Link, Navigate, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarDays, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { LocationSelector } from "@/components/LocationSelector";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import {
  dailySalesRangeOptions,
  orderHeatmapOptions,
  repeatRateOptions,
  salesSummaryOptions,
  stallPerformanceOptions,
  topSellingItemsOptions,
  userPreferencesOptions,
} from "@/query/options/analytics";
import { inventoryAlertsOptions } from "@/query/options/inventory";
import {
  KpiStrip,
  LiveOperations,
  NeedsAttention,
  OrderActivity,
  PaymentMix,
  QuickActions,
  RevenueOrdersPanel,
  StallPerformance,
  TopSellingItems,
  CustomerInsights,
} from "@/components/admin/dashboard/DashboardPanels";
import { formatNumber, formatPercent, Panel, PanelHeader } from "@/components/admin/dashboard/DashboardPrimitives";

export const Route = createFileRoute("/admin/")({ component: AdminDashboardPage });

const RANGE_OPTIONS = [
  { value: "today", label: "Today", days: 0 },
  { value: "yesterday", label: "Yesterday", days: 0 },
  { value: "7d", label: "Last 7 days", days: 6 },
  { value: "30d", label: "Last 30 days", days: 29 },
];

const BUSINESS_TIME_ZONE = "Asia/Kolkata";

function businessDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(dateValue, days) {
  const shifted = new Date(`${dateValue}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() - days);
  return shifted.toISOString().slice(0, 10);
}

function getRange(value) {
  const today = businessDate();
  const selected = RANGE_OPTIONS.find((item) => item.value === value) ?? RANGE_OPTIONS[0];
  const toDate = shiftDate(today, selected.value === "yesterday" ? 1 : 0);
  const fromDate = shiftDate(toDate, selected.days);
  const previousToDate = shiftDate(fromDate, 1);
  const previousFromDate = shiftDate(previousToDate, selected.days);
  return {
    ...selected,
    from: fromDate,
    to: toDate,
    previousFrom: previousFromDate,
    previousTo: previousToDate,
  };
}

function dateLabel(value) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: BUSINESS_TIME_ZONE,
  });
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "numeric",
    hour12: false,
  }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function DashboardHeader({ rangeKey, onRangeChange, ownerName, notifications }) {
  const { toggleSidebar } = useSidebar();
  const range = getRange(rangeKey);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem("admin-notification-read") || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const unreadCount = notifications.filter((notification) => !readIds.includes(notification.id)).length;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (open && panelRef.current && !panelRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const markRead = (ids) => {
    setReadIds(ids);
    window.localStorage.setItem("admin-notification-read", JSON.stringify(ids));
  };

  return (
    <header className="border-b border-zinc-200/50 bg-white/95 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 pb-3 pt-2.5 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:px-8 lg:py-3">
        <div className="flex min-w-0 items-center justify-between gap-3 lg:contents">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={toggleSidebar}
            aria-label="Open admin menu"
            className="size-11 rounded-xl text-zinc-600 lg:hidden"
          >
            <Menu size={19} />
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-950 text-[11px] font-black tracking-tight text-white">
              Q
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                Operations
              </p>
              <p className="truncate text-xs font-semibold text-zinc-700">Admin workspace</p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 lg:flex-1">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold leading-tight tracking-tight text-zinc-950 sm:text-2xl">
              Dashboard
            </h1>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-zinc-400 sm:text-sm">
              <CalendarDays size={13} aria-hidden="true" />
              <span className="truncate">{dateLabel(range.to)}</span>
              <span className="hidden text-zinc-300 sm:inline">·</span>
              <span className="hidden truncate sm:inline">
                {greeting()}{ownerName ? `, ${ownerName}` : ""}
              </span>
            </p>
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <LocationSelector className="max-w-[180px]" />
            <label className="sr-only" htmlFor="dashboard-range">Dashboard date range</label>
            <div className="relative">
              <select
                id="dashboard-range"
                value={rangeKey}
                onChange={(event) => onRangeChange(event.target.value)}
                className="h-11 w-[116px] appearance-none rounded-xl border border-zinc-200 bg-zinc-50 pl-3 pr-8 text-xs font-bold text-zinc-700 outline-none transition-colors hover:bg-white focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 sm:w-[132px]"
              >
                {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
            </div>

            <div ref={panelRef} className="relative">
            <button
              type="button"
              aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="relative grid size-11 place-items-center rounded-xl border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <Bell size={17} aria-hidden="true" />
              {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-4 text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
            {open && (
              <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-zinc-950">Notifications</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">Live operational signals</p>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      onClick={() => markRead(notifications.map((notification) => notification.id))}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="mx-auto mb-2 size-5 text-zinc-300" aria-hidden="true" />
                    <p className="text-sm font-semibold text-zinc-700">You’re all caught up</p>
                    <p className="mt-1 text-xs text-zinc-400">No live admin alerts need attention.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {notifications.map((notification) => {
                      const unread = !readIds.includes(notification.id);
                      return (
                        <Link
                          key={notification.id}
                          to={notification.to}
                          onClick={() => {
                            markRead([...new Set([...readIds, notification.id])]);
                            setOpen(false);
                          }}
                          className={cn(
                            "block px-4 py-3 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30",
                            unread && "bg-primary/[0.03]",
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", unread ? notification.tone : "bg-zinc-300")} />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 text-xs font-bold text-zinc-800">
                                {notification.title}
                                <span className={cn("text-[9px] font-bold uppercase tracking-wide", unread ? "text-primary" : "text-zinc-400")}>{unread ? "New" : "Viewed"}</span>
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-500">{notification.detail}</span>
                              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{notification.time}</span>
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function OrderOutcomes({ summary }) {
  const total = Number(summary?.totalOrders ?? 0);
  const cancelled = Number(summary?.cancelledOrders ?? 0);
  return (
    <Panel>
      <PanelHeader>Order outcomes</PanelHeader>
      <div className="grid grid-cols-2 divide-x divide-zinc-100">
        <div className="px-4 py-4 sm:px-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">Cancelled</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-zinc-900">{formatNumber(cancelled)}</p>
          <p className="mt-1 text-xs text-zinc-400">{total ? formatPercent((cancelled / total) * 100) : "—"} of orders</p>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">Refunds</p>
          <p className="mt-1.5 text-lg font-bold text-zinc-500">Not tracked</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">No reliable refund aggregate is available in the current API.</p>
        </div>
      </div>
    </Panel>
  );
}

function AdminDashboardPage() {
  const { isAdmin, isSuperUser, user } = useAuth();
  const location = useLocation();
  const { activeLocationId } = useActiveLocation();
  const canViewAdmin = isAdmin || isSuperUser;
  const {
    dashboard,
    dashboardLoading,
    dashboardError,
    refetchDashboard,
  } = useAdminDashboard();
  const [rangeKey, setRangeKey] = useState("today");
  const [metric, setMetric] = useState("revenue");
  const range = useMemo(() => getRange(rangeKey), [rangeKey]);
  const params = useMemo(() => ({ from: range.from, to: range.to }), [range.from, range.to]);
  const previousParams = useMemo(() => ({ from: range.previousFrom, to: range.previousTo }), [range.previousFrom, range.previousTo]);

  const summaryQuery = useQuery({ ...salesSummaryOptions(params, activeLocationId), enabled: canViewAdmin });
  const comparisonQuery = useQuery({ ...salesSummaryOptions(previousParams, activeLocationId), enabled: canViewAdmin });
  const dailyQuery = useQuery({ ...dailySalesRangeOptions(params, activeLocationId), enabled: canViewAdmin });
  const topItemsQuery = useQuery({ ...topSellingItemsOptions({ ...params, limit: 5 }, activeLocationId), enabled: canViewAdmin });
  const stallQuery = useQuery({ ...stallPerformanceOptions(params, activeLocationId), enabled: canViewAdmin });
  const activityQuery = useQuery({ ...orderHeatmapOptions(params, activeLocationId), enabled: canViewAdmin });
  const customerQuery = useQuery({ ...userPreferencesOptions({}, activeLocationId), enabled: canViewAdmin });
  const repeatQuery = useQuery({ ...repeatRateOptions(activeLocationId), enabled: canViewAdmin });
  const inventoryQuery = useQuery({ ...inventoryAlertsOptions(6), enabled: canViewAdmin });

  const ownerName = user?.info?.name?.split(" ")[0] ?? "";
  const live = dashboard ?? {};
  const summary = summaryQuery.data ?? {};
  const summaryWithLive = {
    ...summary,
    pendingOrders: (live.placedOrders ?? 0) + (live.preparingOrders ?? 0),
    delayedOrders: live.delayedOrders ?? 0,
  };
  const selectedLabel = rangeKey === "today" ? "Today" : RANGE_OPTIONS.find((item) => item.value === rangeKey)?.label;
  const notifications = useMemo(() => [
    live.delayedOrders > 0 && {
      id: `delayed-orders-${live.delayedOrders}`,
      title: `${live.delayedOrders} delayed order${live.delayedOrders === 1 ? "" : "s"}`,
      detail: "Review the kitchen queue before wait times grow.",
      time: "Live now",
      tone: "bg-red-500",
      to: "/admin/kitchen-queue",
    },
    live.placedOrders > 0 && {
      id: `new-orders-${live.placedOrders}`,
      title: `${live.placedOrders} new order${live.placedOrders === 1 ? "" : "s"} waiting`,
      detail: "Acknowledge incoming orders in the kitchen queue.",
      time: "Live now",
      tone: "bg-amber-500",
      to: "/admin/kitchen-queue",
    },
    (inventoryQuery.data?.totalElements ?? inventoryQuery.data?.content?.length ?? 0) > 0 && {
      id: `inventory-alerts-${inventoryQuery.data?.totalElements ?? inventoryQuery.data?.content?.length}`,
      title: "Inventory needs attention",
      detail: `${inventoryQuery.data?.totalElements ?? inventoryQuery.data?.content?.length} item${(inventoryQuery.data?.totalElements ?? inventoryQuery.data?.content?.length) === 1 ? "" : "s"} running low.`,
      time: "Current stock",
      tone: "bg-orange-500",
      to: "/admin/menu",
    },
    summary.cancelledOrders > 0 && {
      id: `cancelled-orders-${rangeKey}-${summary.cancelledOrders}`,
      title: `${summary.cancelledOrders} cancelled order${summary.cancelledOrders === 1 ? "" : "s"}`,
      detail: "Review cancellation activity for the selected period.",
      time: selectedLabel,
      tone: "bg-zinc-400",
      to: "/admin/analytics/orders",
    },
  ].filter(Boolean), [inventoryQuery.data, live.delayedOrders, live.placedOrders, rangeKey, selectedLabel, summary.cancelledOrders]);
  const activityRangeLabel = rangeKey === "today" ? "Today" : selectedLabel;

  if (!canViewAdmin) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <DashboardHeader rangeKey={rangeKey} onRangeChange={setRangeKey} ownerName={ownerName} notifications={notifications} />
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:gap-5 lg:px-8 lg:py-5">
        <div className="order-1"><KpiStrip summary={summaryWithLive} comparison={comparisonQuery.data} loading={summaryQuery.isLoading || dashboardLoading} /></div>

        <div className="order-2 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <RevenueOrdersPanel
            query={dailyQuery}
            data={dailyQuery.data}
            metric={metric}
            setMetric={setMetric}
            rangeLabel={selectedLabel}
          />
          <LiveOperations dashboard={live} loading={dashboardLoading} error={dashboardError} onRetry={refetchDashboard} />
        </div>

        <div className="order-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">Business insights</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-950">What is moving the business</h2>
            </div>
            <span className="hidden text-xs text-zinc-400 sm:block">{selectedLabel} · completed orders</span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <TopSellingItems query={topItemsQuery} to={range.to} />
            <StallPerformance query={stallQuery} />
          </div>
        </div>

        <div className="order-5 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="lg:col-span-7"><OrderActivity query={activityQuery} rangeLabel={activityRangeLabel} /></div>
          <div className="lg:col-span-5"><CustomerInsights query={customerQuery} repeatQuery={repeatQuery} /></div>
        </div>

        <div className="order-3">
          <div className="mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">Exceptions &amp; settlement</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-950">Needs attention</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
            <div className="lg:col-span-6"><NeedsAttention dashboard={live} inventoryQuery={inventoryQuery} summary={summary} liveLoading={dashboardLoading} /></div>
            <div className="lg:col-span-3"><PaymentMix summary={summary} /></div>
            <div className="lg:col-span-3"><OrderOutcomes summary={summary} /></div>
          </div>
        </div>

        <div className="order-6"><QuickActions /></div>
        <p className="order-7 pb-2 text-[11px] text-zinc-400">
          Estimated profit uses recorded menu-item costs against completed-order revenue. It is an operational estimate, not finalized accounting profit.
        </p>
      </main>
    </div>
  );
}
