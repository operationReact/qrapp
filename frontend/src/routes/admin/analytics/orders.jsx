import AnalyticsPageHeader from "@/components/analytics/AnalyticsPageHeader";
import ChartContainer from "@/components/analytics/ChartContainer";
import MetricCard from "@/components/analytics/MetricCard";
import OrdersBarChart from "@/components/charts/OrdersBarChart";
import RevenueLineChart from "@/components/charts/RevenueLineChart";
import HeatmapGrid from "@/components/charts/HeatmapGrid";
import { EmptyState } from "@/components/analytics/States";
import { useHourlyOrders, usePeakHours } from "@/hooks/useAnalytics";
import { Clock, TrendingUp, XCircle, CheckCircle, CalendarDays } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/admin/analytics/orders")({
  component: OrdersAnalyticsPage,
});

// ── Preset helpers ────────────────────────────────────────────────────────
const NOW_ISO  = () => new Date().toISOString();
const MINS_AGO = (m) => new Date(Date.now() - m * 60 * 1000).toISOString();
const TODAY    = new Date().toISOString().slice(0, 10);
const THIRTY_DAYS_AGO = new Date(new Date().setDate(new Date().getDate() - 29))
  .toISOString().slice(0, 10);

const PRESETS = [
  { label: "30 min",   id: "30m"    },
  { label: "1 hr",     id: "1h"     },
  { label: "24 hrs",   id: "24h"    },
  { label: "7 days",   id: "7d"     },
  { label: "30 days",  id: "30d"    },
  { label: "Custom",   id: "custom" },
];

function buildParams(preset, customFrom, customTo) {
  const now = NOW_ISO();
  switch (preset) {
    case "30m":    return { from: MINS_AGO(30),       to: now };
    case "1h":     return { from: MINS_AGO(60),       to: now };
    case "24h":    return { from: MINS_AGO(24 * 60),  to: now };
    case "7d":     return { from: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), to: TODAY };
    case "30d":    return { from: THIRTY_DAYS_AGO, to: TODAY };
    case "custom": return { from: customFrom, to: customTo };
    default:       return {};
  }
}

function OrdersAnalyticsPage() {
  const [preset, setPreset]       = useState("24h");
  const [customFrom, setCustomFrom] = useState(THIRTY_DAYS_AGO);
  const [customTo,   setCustomTo]   = useState(TODAY);

  const params = useMemo(
    () => buildParams(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const hourly = useHourlyOrders(params);
  const peak   = usePeakHours(params);

  const peakData    = (peak.data && !Array.isArray(peak.data)) ? peak.data : {};
  const hourlyRows  = Array.isArray(hourly.data) ? hourly.data : [];

  const totalOrders = hourlyRows.reduce((s, r) => s + (r.orders    ?? 0), 0);
  const cancelled   = hourlyRows.reduce((s, r) => s + (r.cancelled ?? 0), 0);
  const completed   = hourlyRows.reduce((s, r) => s + (r.completed ?? 0), 0);
  const avgPrepTime = peakData.avgPrepTime ?? null;
  const heatmapData = peakData.heatmap    ?? [];
  const prepTimeSeries = hourlyRows.filter((r) => r.avgPrepTime != null);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <AnalyticsPageHeader
        title="Orders Analytics"
        description="Traffic patterns, prep times and completion metrics."
      />

      {/* ── Time filter ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              preset === p.id
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-indigo-400"
            }`}
          >
            {p.id === "custom" && <CalendarDays size={11} />}
            {p.label}
          </button>
        ))}

        {/* Custom date-range pickers — only shown when custom is selected */}
        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-2 ml-1">
            <span className="text-xs text-zinc-500">From</span>
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100"
            />
            <span className="text-xs text-zinc-500">To</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={TODAY}
              onChange={(e) => setCustomTo(e.target.value)}
              className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100"
            />
          </div>
        )}
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <MetricCard title="Total Orders"  value={totalOrders}                          icon={<Clock        size={14} />} loading={hourly.loading} />
        <MetricCard title="Completed"     value={completed}                            icon={<CheckCircle  size={14} />} loading={hourly.loading} />
        <MetricCard title="Cancelled"     value={cancelled}                            icon={<XCircle      size={14} />} loading={hourly.loading} />
        <MetricCard title="Avg Prep Time" value={avgPrepTime ? `${avgPrepTime} min` : "—"} icon={<TrendingUp size={14} />} loading={peak.loading} />
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartContainer
          title="Order Volume"
          subtitle="Orders per period"
          loading={hourly.loading}
          error={hourly.error}
          onRetry={hourly.refetch}
        >
          {hourlyRows.length ? (
            <OrdersBarChart data={hourlyRows} xKey="hour" dataKey="orders" />
          ) : (
            <EmptyState title="No order data" />
          )}
        </ChartContainer>

        <ChartContainer
          title="Prep Time Trend"
          subtitle="Average prep time per period"
          loading={hourly.loading}
          error={hourly.error}
          onRetry={hourly.refetch}
        >
          {prepTimeSeries.length ? (
            <RevenueLineChart data={prepTimeSeries} xKey="hour" dataKey="avgPrepTime" color="#f59e0b" />
          ) : (
            <EmptyState title="No prep time data" />
          )}
        </ChartContainer>
      </div>

      <ChartContainer
        title="Weekly Traffic Heatmap"
        subtitle="Order volume by day and hour — scroll horizontally on mobile"
        loading={peak.loading}
        error={peak.error}
        onRetry={peak.refetch}
      >
        {heatmapData.length ? (
          <HeatmapGrid data={heatmapData} />
        ) : (
          <EmptyState title="No heatmap data" />
        )}
      </ChartContainer>
    </div>
  );
}
