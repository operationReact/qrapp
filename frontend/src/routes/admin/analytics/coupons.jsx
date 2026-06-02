import AnalyticsPageHeader from "@/components/analytics/AnalyticsPageHeader";
import ChartContainer from "@/components/analytics/ChartContainer";
import AnalyticsTable from "@/components/analytics/AnalyticsTable";
import MetricCard from "@/components/analytics/MetricCard";
import MultiBarChart from "@/components/charts/MultiBarChart";
import OrdersBarChart from "@/components/charts/OrdersBarChart";
import { EmptyState } from "@/components/analytics/States";
import { useCouponAnalytics } from "@/hooks/useAnalytics";
import { Tag, DollarSign, TrendingDown, Percent } from "lucide-react";
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

export const Route = createFileRoute("/admin/analytics/coupons")({
  component: CouponAnalyticsPage,
});

const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_DAYS_AGO = new Date(new Date().setDate(new Date().getDate() - 29))
  .toISOString()
  .slice(0, 10);

function CouponAnalyticsPage() {
  const [from, setFrom] = useState(THIRTY_DAYS_AGO);
  const [to, setTo] = useState(TODAY);

  const params = { from, to };
  const coupons = useCouponAnalytics(params);

  // Backend returns List<CouponPerformanceResponse>
  const couponsRows = Array.isArray(coupons.data) ? coupons.data : [];

  // Derive summary from the list
  const summary = {
    activeCoupons: couponsRows.length,
    totalUses: couponsRows.reduce((s, c) => s + (c.usageCount ?? 0), 0),
    totalDiscount: couponsRows.reduce((s, c) => s + (c.totalDiscount ?? 0), 0),
    revenueFromCoupons: couponsRows.reduce((s, c) => s + (c.revenueGenerated ?? 0), 0),
  };

  const chartData = couponsRows.map((c) => ({
    name: c.code,
    revenue: c.revenueGenerated,
    discount: c.totalDiscount,
    uses: c.usageCount,
  }));

  const columns = [
    { key: "code", header: "Code" },
    { key: "usageCount", header: "Uses", align: "right" },
    {
      key: "totalDiscount",
      header: "Discount",
      align: "right",
      render: (v) => fmt(v),
    },
    {
      key: "revenueGenerated",
      header: "Revenue",
      align: "right",
      render: (v) => fmt(v),
    },
    {
      key: "effectiveness",
      header: "Effect.",
      align: "right",
      render: (v) => (v != null ? `${v}%` : "—"),
    },
  ];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <AnalyticsPageHeader
        title="Coupon Analytics"
        description="Coupon usage, effectiveness and revenue impact."
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

      {/* 2 cols on mobile → 4 on sm */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <MetricCard
          title="Active Coupons"
          value={summary.activeCoupons}
          icon={<Tag size={14} />}
          loading={coupons.loading}
        />
        <MetricCard
          title="Total Uses"
          value={summary.totalUses}
          icon={<Percent size={14} />}
          loading={coupons.loading}
        />
        <MetricCard
          title="Total Discount"
          value={fmt(summary.totalDiscount)}
          icon={<TrendingDown size={14} />}
          loading={coupons.loading}
        />
        <MetricCard
          title="Coupon Revenue"
          value={fmt(summary.revenueFromCoupons)}
          icon={<DollarSign size={14} />}
          loading={coupons.loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartContainer
          title="Coupon Usage"
          subtitle="Uses per coupon"
          loading={coupons.loading}
          error={coupons.error}
          onRetry={coupons.refetch}
        >
          {chartData.length ? (
            <OrdersBarChart
              data={chartData}
              xKey="name"
              dataKey="uses"
              color="#f59e0b"
              label="Uses"
            />
          ) : (
            <EmptyState title="No coupon data" />
          )}
        </ChartContainer>

        <ChartContainer
          title="Revenue vs Discount"
          subtitle="Impact analysis per coupon"
          loading={coupons.loading}
          error={coupons.error}
          onRetry={coupons.refetch}
        >
          {chartData.length ? (
            <MultiBarChart
              data={chartData}
              xKey="name"
              series={[
                { dataKey: "revenue", color: "#10b981", name: "Revenue" },
                { dataKey: "discount", color: "#f43f5e", name: "Discount" },
              ]}
            />
          ) : (
            <EmptyState title="No data" />
          )}
        </ChartContainer>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-3 sm:mb-4">
          Coupon Performance
        </h3>
        <AnalyticsTable columns={columns} rows={couponsRows} />
      </div>
    </div>
  );
}
