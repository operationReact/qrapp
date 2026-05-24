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

export const Route = createFileRoute("/admin/analytics/menu")({
  component: MenuAnalyticsPage,
});

function MenuAnalyticsPage() {
  const topItems = useTopSellingItems();
  const leastItems = useLeastSellingItems();
  const menuRev = useMenuRevenue();

  const topRows = topItems.data ?? [];
  const leastRows = leastItems.data ?? [];
  const revenueRows = menuRev.data ?? [];

  const columns = [
    { key: "rank", header: "#", render: (_, __, i) => rankBadge(i) },
    { key: "name", header: "Item" },
    { key: "quantity", header: "Qty", align: "right" },
    {
      key: "revenue",
      header: "Revenue",
      align: "right",
      render: (v) => fmt(v),
    },
    {
      key: "revenueShare",
      header: "Share",
      align: "right",
      render: (v) => (v != null ? `${v}%` : "—"),
    },
  ];

  const leastColumns = [
    { key: "name", header: "Item" },
    { key: "quantity", header: "Qty", align: "right" },
    {
      key: "revenue",
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
              data={topRows.slice(0, 8)}
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
              data={revenueRows.slice(0, 6)}
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
