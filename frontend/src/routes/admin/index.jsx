import { createFileRoute, Link, Navigate, useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarDays, Menu, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
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

function DashboardHeader({ rangeKey, onRangeChange, ownerName, alertCount }) {
  const { toggleSidebar } = useSidebar();
  const range = getRange(rangeKey);
  return (
    <header className="border-b border-zinc-200/80 bg-white">
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Open admin menu" className="lg:hidden">
          <Menu size={19} />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
              {greeting()}{ownerName ? `, ${ownerName}` : ""}
            </h1>
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 sm:inline-flex">
              <Radio size={11} className="animate-pulse" aria-hidden="true" />
              Live
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-400">
            <CalendarDays size={12} aria-hidden="true" />
            {dateLabel(range.to)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="dashboard-range">Dashboard date range</label>
          <select
            id="dashboard-range"
            value={rangeKey}
            onChange={(event) => onRangeChange(event.target.value)}
            className="h-9 max-w-[132px] rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <Link
            to="/admin/ops-center"
            aria-label={alertCount > 0 ? `${alertCount} unresolved operations alerts` : "Notifications"}
            className="relative grid size-9 place-items-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <Bell size={17} aria-hidden="true" />
            {alertCount > 0 && <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-4 text-white">{alertCount > 9 ? "9+" : alertCount}</span>}
          </Link>
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

  const summaryQuery = useQuery({ ...salesSummaryOptions(params), enabled: canViewAdmin });
  const comparisonQuery = useQuery({ ...salesSummaryOptions(previousParams), enabled: canViewAdmin });
  const dailyQuery = useQuery({ ...dailySalesRangeOptions(params), enabled: canViewAdmin });
  const topItemsQuery = useQuery({ ...topSellingItemsOptions({ ...params, limit: 5 }), enabled: canViewAdmin });
  const stallQuery = useQuery({ ...stallPerformanceOptions(params), enabled: canViewAdmin });
  const activityQuery = useQuery({ ...orderHeatmapOptions(params), enabled: canViewAdmin });
  const customerQuery = useQuery({ ...userPreferencesOptions({}), enabled: canViewAdmin });
  const repeatQuery = useQuery({ ...repeatRateOptions, enabled: canViewAdmin });
  const inventoryQuery = useQuery({ ...inventoryAlertsOptions(6), enabled: canViewAdmin });

  if (!canViewAdmin) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const ownerName = user?.info?.name?.split(" ")[0] ?? "";
  const live = dashboard ?? {};
  const summary = summaryQuery.data ?? {};
  const summaryWithLive = {
    ...summary,
    pendingOrders: (live.placedOrders ?? 0) + (live.preparingOrders ?? 0),
    delayedOrders: live.delayedOrders ?? 0,
  };
  const alertCount = (live.delayedOrders ?? 0) + (live.placedOrders ?? 0);
  const selectedLabel = rangeKey === "today" ? "Today" : RANGE_OPTIONS.find((item) => item.value === rangeKey)?.label;
  const activityRangeLabel = rangeKey === "today" ? "Today" : selectedLabel;

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <DashboardHeader rangeKey={rangeKey} onRangeChange={setRangeKey} ownerName={ownerName} alertCount={alertCount} />
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
          Revenue uses completed orders and their recorded grand totals. Profit is intentionally not shown: the current cost and expense data is not sufficient for a reliable business profit figure.
        </p>
      </main>
    </div>
  );
}
