import { createFileRoute, Link, Navigate, useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarDays, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { LocationSelector } from "@/components/LocationSelector";
import { SectionLocationSelector } from "@/components/SectionLocationSelector";
import { canUseRootLocationSelector } from "@/lib/sectionLocation";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import {
  dailySalesRangeOptions,
  salesSummaryOptions,
} from "@/query/options/analytics";
import { inventoryAlertsOptions } from "@/query/options/inventory";
import {
  KpiStrip,
  LiveOperations,
  NeedsAttention,
  RevenueOrdersPanel,
} from "@/components/admin/dashboard/DashboardPanels";

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
  const { user } = useAuth();
  const showRootLocationSelector = canUseRootLocationSelector(user);
  const range = getRange(rangeKey);
  const panelRef = useRef(null);
  const mobilePanelRef = useRef(null);
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
      if (open
        && panelRef.current && mobilePanelRef.current
        && !panelRef.current.contains(event.target)
        && !mobilePanelRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const markRead = (ids) => {
    setReadIds(ids);
    window.localStorage.setItem("admin-notification-read", JSON.stringify(ids));
  };

  return (
    <header className="border-b border-[#E8E2DD] bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto w-full max-w-[1200px] lg:hidden">
        <div className="flex h-14 items-center gap-2 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Open admin menu"
            className="size-10 shrink-0 rounded-[10px] text-[#171717]"
          >
            <Menu size={20} />
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#171717] text-[11px] font-black tracking-tight text-white">Q</span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase leading-[14px] tracking-[0.08em] text-[#8A8580]">Operations</p>
              <p className="truncate text-xs font-semibold leading-4 text-[#171717]">Admin Workspace</p>
            </div>
          </div>
          <div ref={mobilePanelRef} className="relative ml-auto">
            <button
              type="button"
              aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="relative grid size-10 place-items-center rounded-[10px] text-[#6B6B6B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2438]/30"
            >
              <Bell size={20} aria-hidden="true" />
              {unreadCount > 0 && <span className="absolute right-0 top-0 grid min-w-4 place-items-center rounded-full bg-[#FF2438] px-1 text-[9px] font-bold leading-4 text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
            {open && <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#E8E2DD] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between border-b border-[#EEE9E5] px-4 py-3">
                <p className="text-sm font-bold text-[#171717]">Notifications</p>
                {notifications.length > 0 && <button type="button" className="text-[11px] font-semibold text-[#FF2438]" onClick={() => markRead(notifications.map((notification) => notification.id))}>Mark all read</button>}
              </div>
              {notifications.length === 0 ? <p className="px-4 py-6 text-center text-xs text-[#8A8580]">No live admin alerts need attention.</p> : (
                <div className="divide-y divide-[#EEE9E5]">
                  {notifications.map((notification) => {
                    const unread = !readIds.includes(notification.id);
                    return <Link key={notification.id} to={notification.to} onClick={() => { markRead([...new Set([...readIds, notification.id])]); setOpen(false); }} className="block px-4 py-3 text-xs text-[#171717]">
                      <span className="font-semibold">{notification.title}</span>
                      <span className="mt-0.5 block text-[11px] text-[#6B6B6B]">{unread ? notification.detail : "Viewed"}</span>
                    </Link>;
                  })}
                </div>
              )}
            </div>}
          </div>
        </div>
        <div className="flex h-12 min-w-0 items-center gap-2 px-4 pb-2 pt-1">
          <div className="min-w-0 flex-1">
            {showRootLocationSelector
              ? <LocationSelector className="w-full max-w-none !min-h-10 !rounded-[10px]" allowAllLocations />
              : <SectionLocationSelector className="w-full max-w-none !h-10 !min-h-10 !rounded-[10px]" />}
          </div>
          <label className="sr-only" htmlFor="dashboard-range-mobile">Dashboard date range</label>
          <div className="relative shrink-0">
            <select
              id="dashboard-range-mobile"
              value={rangeKey}
              onChange={(event) => onRangeChange(event.target.value)}
              className="h-10 w-[108px] appearance-none rounded-[10px] border border-[#E8E2DD] bg-white pl-3 pr-7 text-xs font-semibold text-[#171717] outline-none focus-visible:border-[#FF2438] focus-visible:ring-2 focus-visible:ring-[#FF2438]/20"
            >
              {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8580]" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="mx-auto hidden w-full max-w-[1200px] lg:flex flex-col gap-2 px-4 pb-3 pt-2.5 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:px-8 lg:py-3">
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
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#171717] text-[11px] font-black tracking-tight text-white">
              Q
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-[#817A75]">
                Operations
              </p>
              <p className="truncate text-xs font-semibold text-[#171717]">Admin workspace</p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 lg:flex-1">
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-bold leading-7 tracking-tight text-[#171717]">
              Dashboard
            </h1>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11px] text-[#8A8580] sm:text-[13px]">
              <CalendarDays size={13} aria-hidden="true" />
              <span className="truncate">{dateLabel(range.to)}</span>
              <span className="hidden text-zinc-300 sm:inline">·</span>
              <span className="hidden truncate sm:inline">
                {greeting()}{ownerName ? `, ${ownerName}` : ""}
              </span>
            </p>
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-2">
            {showRootLocationSelector
              ? <LocationSelector header className="max-w-[180px] !min-h-10 !rounded-[10px]" allowAllLocations />
              : <SectionLocationSelector className="max-w-[200px] !h-10 !min-h-10 !rounded-[10px]" />}
            <label className="sr-only" htmlFor="dashboard-range">Dashboard date range</label>
            <div className="relative">
              <select
                id="dashboard-range"
                value={rangeKey}
                onChange={(event) => onRangeChange(event.target.value)}
                className="h-10 w-[116px] appearance-none rounded-[10px] border border-[#E8E2DD] bg-white pl-3 pr-8 text-xs font-semibold text-[#171717] outline-none transition-colors hover:bg-[#FAF8F5] focus-visible:border-[#FF2438] focus-visible:ring-2 focus-visible:ring-[#FF2438]/20 sm:w-[132px]"
              >
                {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8580]"
                aria-hidden="true"
              />
            </div>

            <div ref={panelRef} className="relative">
            <button
              type="button"
              aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="relative grid size-11 place-items-center rounded-[10px] border border-[#E8E2DD] text-[#6B6B6B] transition-colors hover:bg-[#FAF8F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2438]/30"
            >
              <Bell size={17} aria-hidden="true" />
              {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-[#FF2438] px-1 text-[9px] font-bold leading-4 text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
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

function AdminDashboardPage() {
  const { isAdmin, isSuperUser, user } = useAuth();
  const location = useLocation();
  const { activeLocationId, isLoading: locationLoading } = useActiveLocation();
  const canViewAdmin = isAdmin || isSuperUser;
  const {
    dashboard,
    dashboardLoading,
    dashboardUpdatedAt,
    dashboardError,
    refetchDashboard,
  } = useAdminDashboard();
  const [rangeKey, setRangeKey] = useState("today");
  const [metric, setMetric] = useState("revenue");
  const range = useMemo(() => getRange(rangeKey), [rangeKey]);
  const params = useMemo(() => ({ from: range.from, to: range.to }), [range.from, range.to]);
  const previousParams = useMemo(() => ({ from: range.previousFrom, to: range.previousTo }), [range.previousFrom, range.previousTo]);

  const dashboardQueriesEnabled = canViewAdmin && !locationLoading;
  const summaryQuery = useQuery({ ...salesSummaryOptions(params, activeLocationId), enabled: dashboardQueriesEnabled });
  const comparisonQuery = useQuery({ ...salesSummaryOptions(previousParams, activeLocationId), enabled: dashboardQueriesEnabled });
  const dailyQuery = useQuery({ ...dailySalesRangeOptions(params, activeLocationId), enabled: dashboardQueriesEnabled });
  const inventoryQuery = useQuery({ ...inventoryAlertsOptions(6, activeLocationId), enabled: dashboardQueriesEnabled });
  const { data: summaryData, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = summaryQuery;
  const { data: dailyData, refetch: refetchDaily } = dailyQuery;
  const refreshAnalytics = useCallback(async () => {
    await refetchSummary();
    await refetchDaily();
  }, [refetchSummary, refetchDaily]);

  const lastDashboardUpdateRef = useRef(0);
  useEffect(() => {
    if (!dashboardUpdatedAt || lastDashboardUpdateRef.current === 0) {
      lastDashboardUpdateRef.current = dashboardUpdatedAt || 0;
      return;
    }
    if (dashboardUpdatedAt === lastDashboardUpdateRef.current) return;
    lastDashboardUpdateRef.current = dashboardUpdatedAt;

    void refreshAnalytics();
  }, [dashboardUpdatedAt, refreshAnalytics]);

  const ownerName = user?.info?.name?.split(" ")[0] ?? "";
  const live = dashboard ?? {};
  const summary = summaryData ?? {};
  const summaryWithLive = {
    ...summary,
    pendingOrders: (live.placedOrders ?? 0) + (live.preparingOrders ?? 0),
    preparingOrders: live.preparingOrders ?? 0,
    readyOrders: live.readyOrders ?? 0,
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
  ].filter(Boolean), [inventoryQuery.data, live.delayedOrders, live.placedOrders]);

  if (!canViewAdmin) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      <DashboardHeader rangeKey={rangeKey} onRangeChange={setRangeKey} ownerName={ownerName} notifications={notifications} />
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-4 sm:px-6 lg:gap-5 lg:px-8 lg:py-5">
        <div className="order-1"><KpiStrip summary={summaryWithLive} comparison={comparisonQuery.data} periodLabel={selectedLabel} loading={summaryLoading || dashboardLoading} error={summaryError && !summaryData ? summaryError : null} onRetry={refetchSummary} /></div>

        <div className="order-2">
          <LiveOperations dashboard={live} loading={dashboardLoading} error={dashboardError} onRetry={refetchDashboard} />
        </div>

        <div className="order-3">
          <NeedsAttention dashboard={live} inventoryQuery={inventoryQuery} liveLoading={dashboardLoading} />
        </div>

        <div className="order-4">
          <RevenueOrdersPanel
            query={dailyQuery}
            data={dailyData}
            metric={metric}
            setMetric={setMetric}
            rangeLabel={selectedLabel}
          />
        </div>
      </main>
    </div>
  );
}
