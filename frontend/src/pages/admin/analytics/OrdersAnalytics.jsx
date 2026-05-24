import AnalyticsPageHeader from "@/components/analytics/AnalyticsPageHeader";
import ChartContainer from "@/components/analytics/ChartContainer";
import MetricCard from "@/components/analytics/MetricCard";
import OrdersBarChart from "@/components/charts/OrdersBarChart";
import RevenueLineChart from "@/components/charts/RevenueLineChart";
import HeatmapGrid from "@/components/charts/HeatmapGrid";
import { EmptyState } from "@/components/analytics/States";
import { useHourlyOrders, usePeakHours } from "@/hooks/useAnalytics";
import { Clock, TrendingUp, XCircle, CheckCircle } from "lucide-react";

export default function OrdersAnalytics() {
  const hourly = useHourlyOrders();
  const peak = usePeakHours();

  const peakData = peak.data ?? {};
  const hourlyRows = hourly.data ?? [];

  const totalOrders = hourlyRows.reduce((s, r) => s + (r.orders ?? 0), 0);
  const cancelled = hourlyRows.reduce((s, r) => s + (r.cancelled ?? 0), 0);
  const completed = hourlyRows.reduce((s, r) => s + (r.completed ?? 0), 0);
  const avgPrepTime = peakData.avgPrepTime ?? null;
  const heatmapData = peakData.heatmap ?? [];
  const prepTimeSeries = hourlyRows.filter((r) => r.avgPrepTime != null);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-screen-2xl mx-auto">
      <AnalyticsPageHeader
        title="Orders Analytics"
        description="Traffic patterns, prep times and completion metrics."
      />

      {/* 2 cols on mobile → 4 on sm */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <MetricCard title="Total Orders" value={totalOrders} icon={<Clock size={14} />} loading={hourly.loading} />
        <MetricCard title="Completed"    value={completed}   icon={<CheckCircle size={14} />} loading={hourly.loading} />
        <MetricCard title="Cancelled"    value={cancelled}   icon={<XCircle size={14} />} loading={hourly.loading} />
        <MetricCard
          title="Avg Prep Time"
          value={avgPrepTime ? `${avgPrepTime} min` : "—"}
          icon={<TrendingUp size={14} />}
          loading={peak.loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartContainer
          title="Hourly Order Volume"
          subtitle="Orders per hour today"
          loading={hourly.loading}
          error={hourly.error}
          onRetry={hourly.refetch}
        >
          {hourlyRows.length ? (
            <OrdersBarChart data={hourlyRows} xKey="hour" dataKey="orders" />
          ) : (
            <EmptyState title="No hourly data" />
          )}
        </ChartContainer>

        <ChartContainer
          title="Prep Time Trend"
          subtitle="Average prep time per hour"
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

