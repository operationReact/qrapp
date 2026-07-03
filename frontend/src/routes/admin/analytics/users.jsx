import AnalyticsPageHeader from "@/components/analytics/AnalyticsPageHeader";
import ChartContainer from "@/components/analytics/ChartContainer";
import AnalyticsTable from "@/components/analytics/AnalyticsTable";
import MetricCard from "@/components/analytics/MetricCard";
import OrdersBarChart from "@/components/charts/OrdersBarChart";
import PieAnalyticsChart from "@/components/charts/PieAnalyticsChart";
import { EmptyState } from "@/components/analytics/States";
import {
  useUserPreferences,
  useRepeatCustomers,
  useRepeatRate,
  useTopSpenders,
  useChurnedUsers,
} from "@/hooks/useAnalytics";
import { Users, Repeat, Star, TrendingUp, AlertTriangle, Crown } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/analytics/users")({
  component: UserAnalyticsPage,
});

const fmt = (v) => (v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—");

// Segment badge colours
const SEGMENT_COLORS = {
  VIP: "bg-yellow-100 text-yellow-700",
  REGULAR: "bg-blue-100 text-blue-700",
  OCCASIONAL: "bg-purple-100 text-purple-700",
  AT_RISK: "bg-orange-100 text-orange-700",
  CHURNED: "bg-red-100 text-red-700",
  NEW: "bg-green-100 text-green-700",
};

function SegmentBadge({ segment }) {
  const cls = SEGMENT_COLORS[segment] ?? "bg-zinc-100 text-zinc-600";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {segment ?? "—"}
    </span>
  );
}

function UserAnalyticsPage() {
  const prefs       = useUserPreferences();
  const repeat      = useRepeatCustomers();
  const rateQuery   = useRepeatRate();
  const spenders    = useTopSpenders();
  const churned     = useChurnedUsers();

  const prefsData   = prefs.data ?? {};
  const repeatRows  = repeat.data ?? [];
  const spenderRows = (spenders.data?.content ?? spenders.data ?? []);
  const churnedRows = (churned.data?.content  ?? churned.data  ?? []);
  const repeatRate  = rateQuery.data != null ? `${rateQuery.data}%` : null;

  const favoriteItems  = prefsData.favoriteItems ?? [];
  const orderTimeDist  = prefsData.orderTimeDistribution ?? [];
  const totalUsers     = prefsData.totalUsers ?? null;
  const repeatCount    = prefsData.repeatCustomers ?? null;
  const avgOrdersPerUser = prefsData.avgOrdersPerUser != null
    ? Number(prefsData.avgOrdersPerUser).toFixed(1)
    : null;

  // ── Column definitions ─────────────────────────────────────────────────────
  const activeColumns = [
    { key: "userName", header: "User" },
    { key: "orderCount", header: "Orders", align: "right" },
    { key: "totalSpend", header: "Total Spend", align: "right", render: fmt },
    { key: "favoriteItem", header: "Fav Item" },
  ];

  const spenderColumns = [
    { key: "phone", header: "Phone" },
    { key: "totalOrders", header: "Orders", align: "right" },
    { key: "completedOrders", header: "Completed", align: "right" },
    { key: "lifetimeSpend", header: "Lifetime Spend", align: "right", render: fmt },
    { key: "avgOrderValue", header: "Avg Order", align: "right", render: fmt },
    { key: "customerSegment", header: "Segment", render: (v) => <SegmentBadge segment={v} /> },
  ];

  const churnedColumns = [
    { key: "phone", header: "Phone" },
    { key: "completedOrders", header: "Orders", align: "right" },
    { key: "lifetimeSpend", header: "Lifetime Spend", align: "right", render: fmt },
    {
      key: "lastOrderAt",
      header: "Last Order",
      render: (v) => v ? new Date(v).toLocaleDateString("en-IN") : "—",
    },
    { key: "customerSegment", header: "Segment", render: (v) => <SegmentBadge segment={v} /> },
  ];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <AnalyticsPageHeader
        title="User Analytics"
        description="Customer behavior, preferences and loyalty insights."
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <MetricCard title="Total Users"      value={totalUsers}       icon={<Users size={14} />}      loading={prefs.loading} />
        <MetricCard title="Repeat Customers" value={repeatCount}      icon={<Repeat size={14} />}     loading={prefs.loading} />
        <MetricCard title="Avg Orders / User" value={avgOrdersPerUser} icon={<Star size={14} />}      loading={prefs.loading} />
        <MetricCard title="Repeat Rate"      value={repeatRate}       icon={<TrendingUp size={14} />} loading={rateQuery.loading} />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartContainer
          title="Favorite Items"
          subtitle="Most popular items across all users"
          loading={prefs.loading}
          error={prefs.error}
          onRetry={prefs.refetch}
        >
          {favoriteItems.length ? (
            <OrdersBarChart data={favoriteItems.slice(0, 8)} xKey="name" dataKey="count" color="#ec4899" label="Orders" />
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
            <PieAnalyticsChart data={orderTimeDist} nameKey="slot" valueKey="count" />
          ) : (
            <EmptyState title="No time data" />
          )}
        </ChartContainer>
      </div>

      {/* ── Most Active Users ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-3 sm:mb-4 flex items-center gap-2">
          <Star size={14} className="text-pink-500" /> Most Active Users
        </h3>
        <AnalyticsTable columns={activeColumns} rows={repeatRows} />
      </div>

      {/* ── Top Spenders ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-3 sm:mb-4 flex items-center gap-2">
          <Crown size={14} className="text-yellow-500" /> Top Spenders (VIP Leaderboard)
        </h3>
        {spenders.error ? (
          <EmptyState title="Failed to load top spenders" onRetry={spenders.refetch} />
        ) : (
          <AnalyticsTable columns={spenderColumns} rows={spenderRows} />
        )}
      </div>

      {/* ── Churned / At-Risk Users ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-3 sm:mb-4 flex items-center gap-2">
          <AlertTriangle size={14} className="text-orange-500" /> Churned Users
          <span className="text-[10px] font-normal text-zinc-400">(no order in last 30 days)</span>
        </h3>
        {churned.error ? (
          <EmptyState title="Failed to load churned users" onRetry={churned.refetch} />
        ) : (
          <AnalyticsTable columns={churnedColumns} rows={churnedRows} />
        )}
      </div>
    </div>
  );
}
