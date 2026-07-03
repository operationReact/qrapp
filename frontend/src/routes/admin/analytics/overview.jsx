import {
  DollarSign,
  ShoppingBag,
  Clock,
  Zap,
  Package,
  Tag,
  TrendingUp,
} from "lucide-react";
import MetricCard from "@/components/analytics/MetricCard";
import ChartContainer from "@/components/analytics/ChartContainer";
import AnalyticsPageHeader from "@/components/analytics/AnalyticsPageHeader";
import RevenueLineChart from "@/components/charts/RevenueLineChart";
import OrdersBarChart from "@/components/charts/OrdersBarChart";
import PieAnalyticsChart from "@/components/charts/PieAnalyticsChart";
import { EmptyState } from "@/components/analytics/States";
import {
  useOverviewKpis,
  useDailySales,
  useHourlyOrders,
  useTopSellingItems,
  useProfitabilityDashboard,
} from "@/hooks/useAnalytics";
import { createFileRoute } from "@tanstack/react-router";

const fmt = (n) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n)
    : (n ?? "—");

export const Route = createFileRoute("/admin/analytics/overview")({
  component: AnalyticsOverviewPage,
});

function AnalyticsOverviewPage() {
  const kpis = useOverviewKpis();
  const daily = useDailySales();
  const hourly = useHourlyOrders();
  const topItems = useTopSellingItems({ limit: 6 });
  const today = new Date().toISOString().slice(0, 10);
  const profitData = useProfitabilityDashboard({ from: today, to: today });

  const k = (kpis.data && typeof kpis.data === "object" && !Array.isArray(kpis.data))
    ? kpis.data
    : {};

  const pd = profitData.data ?? {};

  const fmtProfitMargin = (v) =>
    v != null && !isNaN(Number(v)) ? `${Number(v).toFixed(1)}%` : "—";

  const kpiCards = [
    {
      title: "Revenue Today",
      value: fmt(k.revenueToday),
      icon: <DollarSign size={14} />,
      trend: k.revenueTrend,
      trendLabel: "vs yesterday",
    },
    {
      title: "Orders Today",
      value: k.ordersToday,
      icon: <ShoppingBag size={14} />,
      trend: k.ordersTrend,
      trendLabel: "vs yesterday",
    },
    {
      title: "Avg Order Value",
      value: fmt(k.avgOrderValue),
      icon: <Zap size={14} />,
      trend: k.aovTrend,
      trendLabel: "vs yesterday",
    },
    { title: "Peak Hour", value: k.peakHour ?? "—", icon: <Clock size={14} /> },
    {
      title: "Top Selling Item",
      value: k.topSellingItem ?? "—",
      icon: <Package size={14} />,
    },
    {
      title: "Active Coupons",
      value: k.activeCoupons,
      icon: <Tag size={14} />,
    },
  ];

  const profitKpiCards = [
    {
      title: "Est. Profit Today",
      value: fmt(pd.totalEstimatedProfit),
      icon: <TrendingUp size={14} />,
      subtitle: "revenue – estimated cost",
    },
    {
      title: "Profit Margin Today",
      value: fmtProfitMargin(pd.avgProfitMargin),
      icon: <TrendingUp size={14} />,
      subtitle: "estimated margin %",
    },
  ];

  const dailyRows  = Array.isArray(daily.data)    ? daily.data    : [];
  const hourlyRows = Array.isArray(hourly.data)   ? hourly.data   : [];
  const topRows    = Array.isArray(topItems.data) ? topItems.data : [];

  // Map backend field names → chart-expected field names
  const topChartData = topRows.slice(0, 6).map((r) => ({
    name:     r.menuItemName ?? r.name,
    quantity: r.totalQtySold ?? r.quantity ?? 0,
  }));

  const statusData = k.statusDistribution
    ? Object.entries(k.statusDistribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    // max-w prevents content from stretching too wide on ultra-wide monitors
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <AnalyticsPageHeader
        title="Overview"
        description="A quick snapshot of today's food court operations."
      />

      {/* KPI Cards – 2 cols on mobile, 3 on sm, 6 on xl */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
        {kpiCards.map((c) => (
          <MetricCard key={c.title} {...c} loading={kpis.loading} />
        ))}
      </div>

      {/* Profitability KPI strip */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
        {profitKpiCards.map((c) => (
          <MetricCard key={c.title} {...c} loading={profitData.loading} className="border-emerald-100 dark:border-emerald-900/40" />
        ))}
      </div>

      {/* Charts row 1 — stacked on mobile, side-by-side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartContainer
          title="Daily Revenue Trend"
          subtitle="Last 14 days"
          loading={daily.loading}
          error={daily.error}
          onRetry={daily.refetch}
        >
          {dailyRows.length ? (
            <RevenueLineChart data={dailyRows} xKey="date" dataKey="revenue" />
          ) : (
            <EmptyState title="No revenue data" />
          )}
        </ChartContainer>

        <ChartContainer
          title="Hourly Orders"
          subtitle="Today's order traffic"
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
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartContainer
          title="Top Selling Items"
          subtitle="By quantity sold today"
          loading={topItems.loading}
          error={topItems.error}
          onRetry={topItems.refetch}
        >
          {topChartData.length ? (
            <OrdersBarChart
              data={topChartData}
              xKey="name"
              dataKey="quantity"
              color="#8b5cf6"
              label="Quantity"
            />
          ) : (
            <EmptyState title="No item data" />
          )}
        </ChartContainer>

        <ChartContainer
          title="Order Status Distribution"
          subtitle="Today's breakdown"
          loading={kpis.loading}
          error={kpis.error}
          onRetry={kpis.refetch}
        >
          {statusData.length ? (
            <PieAnalyticsChart
              data={statusData}
              nameKey="name"
              valueKey="value"
            />
          ) : (
            <EmptyState title="No status data" />
          )}
        </ChartContainer>
      </div>
    </div>
  );
}
