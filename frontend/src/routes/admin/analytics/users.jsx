import AnalyticsPageHeader from "@/components/analytics/AnalyticsPageHeader";
import ChartContainer from "@/components/analytics/ChartContainer";
import AnalyticsTable from "@/components/analytics/AnalyticsTable";
import MetricCard from "@/components/analytics/MetricCard";
import OrdersBarChart from "@/components/charts/OrdersBarChart";
import PieAnalyticsChart from "@/components/charts/PieAnalyticsChart";
import { EmptyState } from "@/components/analytics/States";
import { useUserPreferences, useRepeatCustomers } from "@/hooks/useAnalytics";
import { Users, Repeat, Star } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/analytics/users")({
  component: UserAnalyticsPage,
});

function UserAnalyticsPage() {
  const prefs = useUserPreferences();
  const repeat = useRepeatCustomers();

  const prefsData = prefs.data ?? {};
  const repeatRows = repeat.data ?? [];

  const favoriteItems = prefsData.favoriteItems ?? [];
  const orderTimeDist = prefsData.orderTimeDistribution ?? [];
  const totalUsers = prefsData.totalUsers ?? null;
  const repeatCount = prefsData.repeatCustomers ?? null;
  const avgOrdersPerUser = prefsData.avgOrdersPerUser ?? null;

  const repeatColumns = [
    { key: "userName", header: "User" },
    { key: "orderCount", header: "Orders", align: "right" },
    {
      key: "totalSpend",
      header: "Total Spend",
      align: "right",
      render: (v) => (v != null ? `₹${v}` : "—"),
    },
    { key: "favoriteItem", header: "Fav Item" },
  ];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <AnalyticsPageHeader
        title="User Analytics"
        description="Customer behavior, preferences and loyalty insights."
      />

      {/* stacked on mobile, 3 cols on sm */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <MetricCard
          title="Total Users"
          value={totalUsers}
          icon={<Users size={14} />}
          loading={prefs.loading}
        />
        <MetricCard
          title="Repeat Customers"
          value={repeatCount}
          icon={<Repeat size={14} />}
          loading={prefs.loading}
        />
        <MetricCard
          title="Avg Orders / User"
          value={avgOrdersPerUser}
          icon={<Star size={14} />}
          loading={prefs.loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartContainer
          title="Favorite Items"
          subtitle="Most popular items across all users"
          loading={prefs.loading}
          error={prefs.error}
          onRetry={prefs.refetch}
        >
          {favoriteItems.length ? (
            <OrdersBarChart
              data={favoriteItems.slice(0, 8)}
              xKey="name"
              dataKey="count"
              color="#ec4899"
              label="Users"
            />
          ) : (
            <EmptyState title="No preference data" />
          )}
        </ChartContainer>

        <ChartContainer
          title="Ordering Time Distribution"
          subtitle="When users prefer to order"
          loading={prefs.loading}
          error={prefs.error}
          onRetry={prefs.refetch}
        >
          {orderTimeDist.length ? (
            <PieAnalyticsChart
              data={orderTimeDist}
              nameKey="slot"
              valueKey="count"
            />
          ) : (
            <EmptyState title="No time data" />
          )}
        </ChartContainer>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-3 sm:mb-4">
          Most Active Users
        </h3>
        <AnalyticsTable columns={repeatColumns} rows={repeatRows} />
      </div>
    </div>
  );
}
