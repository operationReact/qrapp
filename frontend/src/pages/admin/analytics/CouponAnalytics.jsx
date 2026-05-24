import AnalyticsPageHeader from "@/components/analytics/AnalyticsPageHeader";
import ChartContainer from "@/components/analytics/ChartContainer";
import AnalyticsTable from "@/components/analytics/AnalyticsTable";
import MetricCard from "@/components/analytics/MetricCard";
import MultiBarChart from "@/components/charts/MultiBarChart";
import OrdersBarChart from "@/components/charts/OrdersBarChart";
import { EmptyState } from "@/components/analytics/States";
import { useCouponAnalytics } from "@/hooks/useAnalytics";
import { Tag, DollarSign, TrendingDown, Percent } from "lucide-react";

const fmt = (n) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
    : "—";

export default function CouponAnalytics() {
  const coupons = useCouponAnalytics();

  const data = coupons.data ?? {};
  const couponsRows = data.coupons ?? [];
  const summary = data.summary ?? {};

  const chartData = couponsRows.map((c) => ({
    name: c.code,
    revenue: c.revenueGenerated,
    discount: c.totalDiscount,
    uses: c.usageCount,
  }));

  const columns = [
    { key: "code",             header: "Code" },
    { key: "usageCount",       header: "Uses",     align: "right" },
    { key: "totalDiscount",    header: "Discount",  align: "right", render: (v) => fmt(v) },
    { key: "revenueGenerated", header: "Revenue",   align: "right", render: (v) => fmt(v) },
    { key: "effectiveness",    header: "Effect.",   align: "right", render: (v) => v != null ? `${v}%` : "—" },
  ];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-screen-2xl mx-auto">
      <AnalyticsPageHeader
        title="Coupon Analytics"
        description="Coupon usage, effectiveness and revenue impact."
      />

      {/* 2 cols on mobile → 4 on sm */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <MetricCard title="Active Coupons"       value={summary.activeCoupons}              icon={<Tag size={14} />}         loading={coupons.loading} />
        <MetricCard title="Total Uses"           value={summary.totalUses}                  icon={<Percent size={14} />}     loading={coupons.loading} />
        <MetricCard title="Total Discount"       value={fmt(summary.totalDiscount)}         icon={<TrendingDown size={14} />} loading={coupons.loading} />
        <MetricCard title="Coupon Revenue"       value={fmt(summary.revenueFromCoupons)}    icon={<DollarSign size={14} />}  loading={coupons.loading} />
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
            <OrdersBarChart data={chartData} xKey="name" dataKey="uses" color="#f59e0b" label="Uses" />
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

