import { useState } from "react";
import AnalyticsPageHeader from "@/components/analytics/AnalyticsPageHeader";
import ChartContainer from "@/components/analytics/ChartContainer";
import AnalyticsTable from "@/components/analytics/AnalyticsTable";
import RevenueLineChart from "@/components/charts/RevenueLineChart";
import OrdersBarChart from "@/components/charts/OrdersBarChart";
import MetricCard from "@/components/analytics/MetricCard";
import { EmptyState } from "@/components/analytics/States";
import {
  useDailySales,
  useWeeklySales,
  useMonthlySales,
} from "@/hooks/useAnalytics";
import { DollarSign, TrendingUp, BarChart2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

const fmt = (n) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n)
    : "—";

const TABS = ["daily", "weekly", "monthly"];

export const Route = createFileRoute("/admin/analytics/sales")({
  component: SalesAnalyticsPage,
});

function SalesAnalyticsPage() {
  const [tab, setTab] = useState("daily");

  const daily = useDailySales();
  const weekly = useWeeklySales();
  const monthly = useMonthlySales();

  const current = { daily, weekly, monthly }[tab];
  // Daily:          array of { salesDate, totalRevenue, totalOrders, ... }
  // Weekly/Monthly: { totalRevenue, dailySeries: [...], ... } summary object
  const responseData = current.data;
  const isArray = Array.isArray(responseData);
  const rows = isArray ? responseData : (responseData?.dailySeries ?? []);

  const totalRevenue = isArray
    ? rows.reduce((s, r) => s + (r.totalRevenue ?? 0), 0)
    : (responseData?.totalRevenue ?? 0);
  const totalOrders = isArray
    ? rows.reduce((s, r) => s + (r.totalOrders ?? 0), 0)
    : (responseData?.totalOrders ?? 0);
  const aov = isArray
    ? (totalOrders ? totalRevenue / totalOrders : 0)
    : (responseData?.averageOrderValue ?? 0);

  const columns = [
    { key: "salesDate", header: "Date" },
    { key: "totalOrders", header: "Orders", align: "right" },
    {
      key: "totalRevenue",
      header: "Revenue",
      align: "right",
      render: (v) => fmt(v),
    },
    {
      key: "averageOrderValue",
      header: "AOV",
      align: "right",
      render: (v) => fmt(v),
    },
    {
      key: "growth",
      header: "Growth",
      align: "right",
      render: (v) =>
        v != null ? (
          <span className={v >= 0 ? "text-emerald-500" : "text-red-500"}>
            {v >= 0 ? "+" : ""}
            {v}%
          </span>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <AnalyticsPageHeader
        title="Sales Analytics"
        description="Revenue trends and growth analysis."
      />

      {/* Summary KPIs – stacked on mobile, 3 cols on sm */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <MetricCard
          title="Total Revenue"
          value={fmt(totalRevenue)}
          icon={<DollarSign size={14} />}
          loading={current.loading}
        />
        <MetricCard
          title="Total Orders"
          value={totalOrders}
          icon={<BarChart2 size={14} />}
          loading={current.loading}
        />
        <MetricCard
          title="Avg Order Value"
          value={fmt(aov)}
          icon={<TrendingUp size={14} />}
          loading={current.loading}
        />
      </div>

      {/* Period Tabs – full-width on mobile, auto on wider */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            // min-h-[44px] = 44px touch target; flex-shrink-0 prevents squeezing
            className={`flex-shrink-0 min-h-[44px] px-5 rounded-full text-sm font-medium transition-colors capitalize ${
              tab === t
                ? "bg-primary text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ChartContainer
        title={`${tab.charAt(0).toUpperCase() + tab.slice(1)} Revenue`}
        loading={current.loading}
        error={current.error}
        onRetry={current.refetch}
      >
        {rows.length ? (
          tab === "daily" ? (
            <RevenueLineChart data={rows} xKey="salesDate" dataKey="totalRevenue" />
          ) : (
            <OrdersBarChart
              data={rows}
              xKey="salesDate"
              dataKey="totalRevenue"
              label="Revenue"
              color="#10b981"
            />
          )
        ) : (
          <EmptyState title="No data for this period" />
        )}
      </ChartContainer>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-3 sm:mb-4">
          {tab.charAt(0).toUpperCase() + tab.slice(1)} Sales Table
        </h3>
        <AnalyticsTable columns={columns} rows={rows} />
      </div>
    </div>
  );
}
