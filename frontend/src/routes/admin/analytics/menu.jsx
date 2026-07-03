import AnalyticsPageHeader from "@/components/analytics/AnalyticsPageHeader";
import ChartContainer from "@/components/analytics/ChartContainer";
import AnalyticsTable from "@/components/analytics/AnalyticsTable";
import OrdersBarChart from "@/components/charts/OrdersBarChart";
import PieAnalyticsChart from "@/components/charts/PieAnalyticsChart";
import { EmptyState } from "@/components/analytics/States";
import {
  useTopSellingItems,
  useLeastSellingItems,
  useMenuRevenue,
} from "@/hooks/useAnalytics";
import { Medal } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

const fmt = (n) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n)
    : "—";

const rankBadge = (i) => {
  const colors = ["text-yellow-500", "text-zinc-400", "text-amber-600"];
  return (
    <span className={`font-bold ${colors[i] ?? "text-zinc-500"}`}>
      #{i + 1}
    </span>
  );
};

const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_DAYS_AGO = new Date(new Date().setDate(new Date().getDate() - 29))
  .toISOString()
  .slice(0, 10);

export const Route = createFileRoute("/admin/analytics/menu")({
  component: MenuAnalyticsPage,
});

function MenuAnalyticsPage() {
  const [from, setFrom] = useState(THIRTY_DAYS_AGO);
  const [to, setTo] = useState(TODAY);

  const params = { from, to };
  const topItems = useTopSellingItems(params);
  const leastItems = useLeastSellingItems(params);
  const menuRev = useMenuRevenue(params);

  const topRows = Array.isArray(topItems.data) ? topItems.data : [];
  const leastRows = Array.isArray(leastItems.data) ? leastItems.data : [];
  const revenueRows = Array.isArray(menuRev.data) ? menuRev.data : [];

  const chartData = topRows.slice(0, 8).map((r) => ({
    name: r.menuItemName,
    quantity: r.totalQtySold,
    revenue: r.totalRevenue,
  }));

  const revenueChartData = revenueRows.slice(0, 6).map((r) => ({
    name: r.menuItemName,
    revenue: r.totalRevenue,
  }));

  const columns = [
    { key: "rank", header: "#", render: (_, __, i) => rankBadge(i) },
    { key: "menuItemName", header: "Item" },
    { key: "totalQtySold", header: "Qty", align: "right" },
    {
      key: "totalRevenue",
      header: "Revenue",
      align: "right",
      render: (v) => fmt(v),
    },
    {
      key: "categoryName",
      header: "Category",
      align: "right",
    },
  ];

  const leastColumns = [
    { key: "menuItemName", header: "Item" },
    { key: "totalQtySold", header: "Qty", align: "right" },
    {
      key: "totalRevenue",
      header: "Revenue",
      align: "right",
      render: (v) => fmt(v),
    },
  ];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <AnalyticsPageHeader
        title="Menu Analytics"
        description="Item performance, revenue contribution and rankings."
        action={<Medal className="text-primary" size={18} />}
      />

      {/* Date range filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          From
        </label>
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100"
        />
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          To
        </label>
        <input
          type="date"
          value={to}
          min={from}
          max={TODAY}
          onChange={(e) => setTo(e.target.value)}
          className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartContainer
          title="Top Selling Items"
          subtitle="By quantity sold"
          loading={topItems.loading}
          error={topItems.error}
          onRetry={topItems.refetch}
        >
          {topRows.length ? (
            <OrdersBarChart
              data={chartData}
              xKey="name"
              dataKey="quantity"
              label="Qty"
            />
          ) : (
            <EmptyState title="No data" />
          )}
        </ChartContainer>

        <ChartContainer
          title="Revenue Contribution"
          subtitle="By item"
          loading={menuRev.loading}
          error={menuRev.error}
          onRetry={menuRev.refetch}
        >
          {revenueRows.length ? (
            <PieAnalyticsChart
              data={revenueChartData}
              nameKey="name"
              valueKey="revenue"
            />
          ) : (
            <EmptyState title="No revenue data" />
          )}
        </ChartContainer>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-3 sm:mb-4">
          Top Performing Items
        </h3>
        <AnalyticsTable columns={columns} rows={topRows} />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-3 sm:mb-4">
          Least Performing Items
        </h3>
        <AnalyticsTable columns={leastColumns} rows={leastRows} />
      </div>
    </div>
  );
}
