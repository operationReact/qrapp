import { Link } from "@tanstack/react-router";
import { createElement } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CircleCheck,
  CheckCircle2,
  ChefHat,
  Calculator,
  Clock3,
  Flame,
  Package,
  RefreshCw,
  ShoppingBag,
  Receipt,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ErrorState,
  formatCurrency,
  formatNumber,
  formatPercent,
  LoadingRows,
  Panel,
  PanelHeader,
  Skeleton,
  Trend,
} from "./DashboardPrimitives";
import { ActivityChart, RevenueChart } from "./DashboardCharts";

const statusMeta = {
  ORDER_PLACED: { label: "New", color: "text-[#7C3AED]", bg: "bg-[#F5F3FF]", icon: Sparkles },
  ACKNOWLEDGED: { label: "Confirmed", color: "text-[#2563EB]", bg: "bg-[#EFF6FF]", icon: Receipt },
  PREPARING: { label: "Preparing", color: "text-[#D97706]", bg: "bg-[#FFF7E6]", icon: ChefHat },
  READY: { label: "Ready", color: "text-[#16A34A]", bg: "bg-[#ECFDF3]", icon: CircleCheck },
  DELIVERED: { label: "Out for delivery", color: "text-[#2563EB]", bg: "bg-[#EFF6FF]", icon: Receipt },
  COMPLETED: { label: "Completed", color: "text-[#6B6B6B]", bg: "bg-[#F8F6F3]", icon: CircleCheck },
  CANCELLED: { label: "Cancelled", color: "text-[#DC2626]", bg: "bg-[#FEF2F2]", icon: TriangleAlert },
};

export function KpiStrip({ summary, comparison, periodLabel = "Today", loading, error, onRetry }) {
  const current = summary ?? {};
  const previous = comparison ?? {};
  const orders = current.completedOrders;
  const hasCompletedOrders = Number(orders ?? 0) > 0;
  const trend = (value, previousValue) => (
    value != null && previousValue != null && Number(previousValue) !== 0
      ? ((Number(value) - Number(previousValue)) / Number(previousValue)) * 100
      : null
  );
  const cards = [
    {
      label: "Revenue",
      value: current.totalRevenue == null && hasCompletedOrders ? "Not available" : formatCurrency(current.totalRevenue ?? 0),
      trend: trend(current.totalRevenue, previous.totalRevenue),
      icon: Wallet,
      iconColor: "text-[#16A34A]",
      iconBg: "bg-[#ECFDF3]",
    },
    {
      label: "Orders",
      value: formatNumber(orders ?? 0),
      trend: trend(orders, previous.completedOrders),
      icon: Receipt,
      iconColor: "text-[#2563EB]",
      iconBg: "bg-[#EFF6FF]",
    },
    {
      label: "Avg. order value",
      value: current.averageOrderValue == null && hasCompletedOrders ? "Not available" : formatCurrency(current.averageOrderValue ?? 0),
      trend: trend(current.averageOrderValue, previous.averageOrderValue),
      icon: Calculator,
      iconColor: "text-[#7C3AED]",
      iconBg: "bg-[#F5F3FF]",
    },
    {
      label: "Est. profit",
      value: formatCurrency(current.totalEstimatedProfit ?? 0),
      note: "Cost-backed estimate",
      icon: TrendingUp,
      iconColor: "text-[#16A34A]",
      iconBg: "bg-[#ECFDF3]",
      valueColor: "text-[#059669]",
    },
  ];
  const displayCards = error ? cards.map((card) => ({ ...card, value: "—", trend: null })) : cards;

  return (
    <section className="rounded-[16px] border border-[#E8E2DD] bg-white p-3.5 shadow-none sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase leading-[14px] tracking-[0.08em] text-[#817A75]">{periodLabel}</p>
          <p className="mt-0.5 text-[11px] text-[#8A8580]">Current business performance</p>
        </div>
        <TrendingUp className="size-4 text-[#8A8580]" strokeWidth={1.9} aria-hidden="true" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {displayCards.map((card) => (
      <KpiCard key={card.label} card={card} loading={loading} />
      ))}
      </div>
      {error && <div className="flex items-center justify-between gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#DC2626]">
        <span>Unable to load performance metrics.</span>
        {onRetry && <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">Retry</button>}
      </div>}
    </section>
  );
}

function KpiCard({ card, loading }) {
  const Icon = card.icon;
  return (
    <div className={cn(
      "min-w-0 rounded-[14px] border border-[#E8E2DD] bg-white p-2.5",
      "min-h-[88px]",
    )}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-[10px] font-bold uppercase leading-[13px] tracking-[0.07em] text-[#817A75]">{card.label}</p>
        {Icon && <span className={cn("grid size-8 shrink-0 place-items-center rounded-[10px]", card.iconBg)}>
          <Icon className={cn("size-[17px]", card.iconColor)} strokeWidth={2} aria-hidden="true" />
        </span>}
      </div>
      {loading ? <Skeleton className="mt-2 h-6 w-16" /> : (
        <p className={cn(
          "mt-1 break-words text-[20px] font-extrabold leading-6 tracking-tight tabular-nums",
          card.valueColor,
          card.value === "Not available" && "text-[13px] text-[#8A8580]",
        )}>{card.value ?? "—"}</p>
      )}
      {card.note ? <p className="mt-0.5 whitespace-nowrap text-[10px] leading-[14px] text-[#8A8580]">{card.note}</p> : card.trend != null ? <Trend value={card.trend} /> : null}
    </div>
  );
}

export function RevenueOrdersPanel({ query, data, metric, setMetric, rangeLabel }) {
  const rows = (data ?? []).map((row) => ({
    label: new Date(`${row.salesDate}T00:00:00Z`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Kolkata",
    }),
    revenue: Number(row.totalRevenue ?? 0),
    orders: Number(row.completedOrders ?? 0),
    aov: Number(row.averageOrderValue ?? 0),
  }));
  const hasData = rows.some((row) => row.revenue || row.orders);

  return (
    <Panel className="lg:col-span-8 rounded-[16px] border-[#E8E2DD] shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EEE9E5] px-4 py-3.5 sm:px-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#817A75]">Business snapshot</p>
          <h2 className="mt-1 text-base font-bold leading-5 tracking-tight text-[#171717]">Revenue &amp; orders</h2>
          <p className="mt-0.5 text-[11px] text-[#8A8580]">{rangeLabel} · completed orders</p>
        </div>
        <div className="flex rounded-lg border border-[#E8E2DD] bg-[#FAF8F5] p-0.5" role="tablist" aria-label="Revenue chart metric">
          {[
            ["revenue", "Revenue"],
            ["orders", "Orders"],
            ["aov", "AOV"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={metric === value}
              onClick={() => setMetric(value)}
              className={cn(
                "h-8 rounded-lg px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2438]/30",
                metric === value ? "bg-[#171717] text-white" : "text-[#6B6B6B] hover:text-[#171717]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {query.isLoading ? <div className="p-4 sm:p-5"><Skeleton className="h-52 w-full sm:h-56" /></div> : query.error ? (
        <ErrorState onRetry={query.refetch} message="Unable to load revenue data." />
      ) : !hasData ? (
        <EmptyState compact icon={Wallet} title="No sales data for this period" description="Completed orders will appear here once recorded." />
      ) : (
        <div className="p-3 sm:p-4">
          <RevenueChart data={rows} metric={metric} />
        </div>
      )}
    </Panel>
  );
}

export function LiveOperations({ dashboard, loading, error, onRetry }) {
  const queue = [...(dashboard?.attentionOrders ?? []), ...(dashboard?.liveOrdersQueue ?? [])]
    .filter((order, index, rows) => rows.findIndex((item) => item.id === order.id) === index)
    .slice(0, 5);
  const counts = [
    ["New", dashboard?.placedOrders ?? 0, Sparkles, "bg-[#F5F3FF] text-[#7C3AED]"],
    ["Preparing", dashboard?.preparingOrders ?? 0, ChefHat, "bg-[#FFF7E6] text-[#D97706]"],
    ["Ready", dashboard?.readyOrders ?? 0, CircleCheck, "bg-[#ECFDF3] text-[#16A34A]"],
    ["Delayed", dashboard?.delayedOrders ?? 0, TriangleAlert, "bg-[#FEF2F2] text-[#DC2626]"],
  ];

  return (
    <Panel className="lg:col-span-4 rounded-[16px] border-[#E8E2DD] shadow-none">
      <PanelHeader action="Kitchen queue" to="/admin/kitchen-queue">Live operations</PanelHeader>
      {loading ? <LoadingRows count={3} /> : error ? <ErrorState message="Unable to load live operations." onRetry={onRetry} /> : <>
      <div className="[scrollbar-width:none] flex gap-2 overflow-x-auto px-4 pt-4 sm:px-5 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {counts.map(([label, value, Icon, classes]) => (
          <Link key={label} to="/admin/kitchen-queue" className="flex h-[78px] min-w-[82px] shrink-0 flex-col items-center justify-center rounded-xl border border-[#E8E2DD] bg-white p-2 text-center transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2438]/30">
            <span className={cn("mb-0.5 grid size-8 place-items-center rounded-[10px]", classes)}>
              {createElement(Icon, { className: "size-[17px]", strokeWidth: 2, "aria-hidden": true })}
            </span>
            <p className="text-lg font-bold leading-5 tabular-nums">{formatNumber(value)}</p>
            <p className="whitespace-nowrap text-[10px] font-semibold leading-3">{label}</p>
          </Link>
        ))}
      </div>
      </>}
      <div className="mt-4 divide-y divide-[#EEE9E5] border-t border-[#EEE9E5] px-4 sm:px-5">
        {queue.length === 0 ? <EmptyState icon={CheckCircle2} title="Kitchen is clear" description="No active orders need attention right now." /> : queue.map((order) => {
          const meta = statusMeta[order.status] ?? statusMeta.ORDER_PLACED;
          const StatusIcon = meta.icon;
          return (
            <Link key={order.id} to="/admin/kitchen-queue" className="flex min-h-16 items-center gap-2.5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2438]/30">
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-[10px]", meta.bg, meta.color)}><StatusIcon className="size-[17px]" strokeWidth={2} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-[#171717]">#{order.orderNumber ?? order.id}</span>
                <span className="block truncate text-[11px] text-[#6B6B6B]">{order.userName || "Guest"} · {formatNumber(order.totalItems ?? order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) ?? 0)} items</span>
              </span>
              <span className="hidden shrink-0 text-[10px] text-[#8A8580] sm:block">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : ""}</span>
              <span className={cn("rounded-md px-2 py-1 text-[10px] font-bold", meta.bg, meta.color)}>{meta.label}</span>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

export function TopSellingItems({ query, to }) {
  const rows = Array.isArray(query.data) ? query.data.slice(0, 5) : [];
  return (
    <Panel>
      <PanelHeader action="Menu analytics" to="/admin/analytics/menu">Top selling items</PanelHeader>
      {query.isLoading ? <LoadingRows count={5} /> : query.error ? <ErrorState message="Unable to load top items." onRetry={query.refetch} /> : rows.length === 0 ? (
        <EmptyState icon={Flame} title="No item sales yet" description={`No completed item sales from ${to}.`} />
      ) : (
        <div className="divide-y divide-zinc-100 px-4 sm:px-5">
          {rows.map((item, index) => (
            <div key={item.menuItemId ?? item.menuItemName} className="flex items-center gap-3 py-3">
              <span className="w-5 text-xs font-bold tabular-nums text-zinc-300">{String(index + 1).padStart(2, "0")}</span>
              {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" /> : <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-500"><Flame size={14} aria-hidden="true" /></span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-zinc-800">{item.menuItemName}</span>
                <span className="mt-0.5 block text-[11px] text-zinc-400">{formatNumber(item.totalQtySold)} sold · {formatNumber(item.totalOrderCount)} orders</span>
              </span>
              <span className="shrink-0 text-right text-xs font-bold tabular-nums text-zinc-800">{formatCurrency(item.totalRevenue)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function StallPerformance({ query }) {
  const rows = Array.isArray(query.data) ? query.data : [];
  const max = Math.max(...rows.map((row) => Number(row.revenue ?? 0)), 1);
  return (
    <Panel>
      <PanelHeader action="View all stalls" to="/admin/analytics/sales">Stall performance</PanelHeader>
      {query.isLoading ? <LoadingRows count={4} /> : query.error ? <ErrorState message="Unable to load stall performance." onRetry={query.refetch} /> : rows.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No stall sales yet" description="Stall attribution appears when completed orders include configured stall items." />
      ) : (
        <div className="space-y-4 px-4 py-4 sm:px-5">
          {rows.slice(0, 5).map((row) => (
            <div key={row.stallId}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-bold text-zinc-800">{row.stallName}</span>
                <span className="shrink-0 font-bold tabular-nums text-zinc-800">{formatCurrency(row.revenue)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(3, (Number(row.revenue ?? 0) / max) * 100)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">{formatNumber(row.orders)} orders · {formatCurrency(row.averageOrderValue)} AOV</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function OrderActivity({ query, rangeLabel }) {
  const rows = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
  (query.data ?? []).forEach((row) => {
    const target = rows.find((item) => item.hour === Number(row.hourOfDay));
    if (target) target.orders += Number(row.orderCount ?? row.totalOrderCount ?? 0);
  });
  const hasData = rows.some((row) => row.orders > 0);
  return (
    <Panel>
      <PanelHeader action="Order analytics" to="/admin/analytics/orders">Order activity</PanelHeader>
      <div className="px-4 pt-4 sm:px-5">
        <p className="text-xs text-zinc-400">{rangeLabel} · all order statuses</p>
      </div>
      {query.isLoading ? <div className="p-5"><Skeleton className="h-56 w-full" /></div> : query.error ? <ErrorState message="Unable to load order activity." onRetry={query.refetch} /> : !hasData ? (
        <EmptyState icon={Clock3} title="No hourly activity yet" />
      ) : <div className="p-3 sm:p-5"><ActivityChart data={rows} /></div>}
    </Panel>
  );
}

export function CustomerInsights({ query, repeatQuery }) {
  const data = query.data ?? {};
  const rows = [
    ["Customers", formatNumber(data.totalUsers), Users],
    ["Returning", formatNumber(data.repeatCustomers), RefreshCw],
    ["Repeat rate", formatPercent(repeatQuery.data), ArrowUpRight],
    ["Orders / customer", Number(data.avgOrdersPerUser) ? Number(data.avgOrdersPerUser).toFixed(1) : "—", ShoppingBag],
  ];
  return (
    <Panel>
      <PanelHeader action="Customer analytics" to="/admin/analytics/users">Customer insights</PanelHeader>
      {query.isLoading || repeatQuery.isLoading ? <LoadingRows count={4} /> : query.error || repeatQuery.error ? <ErrorState message="Unable to load customer insights." onRetry={() => { query.refetch(); repeatQuery.refetch(); }} /> : (
        <>
          <div className="grid grid-cols-2 gap-px bg-zinc-100">
            {rows.map(([label, value, Icon]) => (
              <div key={label} className="bg-white px-4 py-3.5 sm:px-5">
                {createElement(Icon, { size: 15, className: "mb-2 text-zinc-400", "aria-hidden": true })}
                <p className="text-lg font-bold tabular-nums text-zinc-900">{value}</p>
                <p className="mt-0.5 text-[11px] text-zinc-400">{label}</p>
              </div>
            ))}
          </div>
          <p className="px-4 py-3 text-[11px] text-zinc-400 sm:px-5">Customer metrics reflect the available all-time analytics snapshot.</p>
        </>
      )}
    </Panel>
  );
}

export function PaymentMix({ summary }) {
  const methods = [
    ["UPI / gateway", summary?.onlineRevenue, "bg-violet-500"],
    ["Wallet", summary?.walletRevenue, "bg-emerald-500"],
    ["Pay at stall", summary?.codRevenue, "bg-amber-500"],
  ].filter(([, amount]) => Number(amount) > 0);
  const total = methods.reduce((sum, [, amount]) => sum + Number(amount ?? 0), 0);
  if (!total) return null;
  return (
    <Panel>
      <PanelHeader>Payment mix</PanelHeader>
      <div className="space-y-3 px-4 py-4 sm:px-5">
        {methods.map(([label, amount, color]) => (
          <div key={label}>
            <div className="mb-1.5 flex justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-zinc-600"><span className={cn("size-2 rounded-full", color)} />{label}</span>
              <span className="font-bold tabular-nums text-zinc-800">{formatPercent((Number(amount) / total) * 100)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-100"><div className={cn("h-full rounded-full", color)} style={{ width: `${(Number(amount) / total) * 100}%` }} /></div>
            <p className="mt-1 text-right text-[11px] text-zinc-400">{formatCurrency(amount)}</p>
          </div>
        ))}
      </div>
      <p className="px-4 pb-4 text-[11px] text-zinc-400 sm:px-5">Amounts from completed orders; transaction counts are not exposed by the current payment analytics.</p>
    </Panel>
  );
}

export function NeedsAttention({ dashboard, inventoryQuery, liveLoading }) {
  const inventory = inventoryQuery.data?.content ?? [];
  const inventoryCount = inventoryQuery.data?.totalElements ?? inventory.length;
  const alerts = [
    dashboard?.delayedOrders > 0 && { tone: "red", icon: AlertTriangle, title: `${formatNumber(dashboard.delayedOrders)} delayed order${dashboard.delayedOrders === 1 ? "" : "s"}`, detail: "Review the kitchen queue", to: "/admin/kitchen-queue", action: "Review" },
    dashboard?.placedOrders > 0 && { tone: "amber", icon: ChefHat, title: `${formatNumber(dashboard.placedOrders)} new order${dashboard.placedOrders === 1 ? "" : "s"} waiting`, detail: "Acknowledge incoming orders", to: "/admin/kitchen-queue", action: "Open queue" },
    inventoryCount > 0 && { tone: "amber", icon: Package, title: `${formatNumber(inventoryCount)} item${inventoryCount === 1 ? "" : "s"} running low`, detail: "Check inventory levels", to: "/admin/menu", action: "View stock" },
  ].filter(Boolean);
  if (alerts.length === 0) return null;
  const tones = {
    red: "border-red-100 bg-red-50/60 text-red-700",
    amber: "border-amber-100 bg-amber-50/60 text-amber-700",
    neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
  };
  return (
    <Panel>
      <PanelHeader action="Operations center" to="/admin/ops-center">Needs attention</PanelHeader>
      {liveLoading || inventoryQuery.isLoading ? <LoadingRows count={2} /> : inventoryQuery.error ? <ErrorState message="Unable to load inventory alerts." onRetry={inventoryQuery.refetch} /> : alerts.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Everything is running smoothly" description="No delayed orders, stock alerts, or cancellations need action." />
      ) : (
        <div className="space-y-2 px-4 py-4 sm:px-5">
          {alerts.map(({ tone, icon: Icon, title, detail, to, action }) => (
            <Link key={title} to={to} className={cn("flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors hover:brightness-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", tones[tone])}>
              {createElement(Icon, { size: 17, className: "shrink-0", "aria-hidden": true })}
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold">{title}</span>
                <span className="mt-0.5 block truncate text-[11px] opacity-75">{detail}</span>
              </span>
              <span className="shrink-0 text-[11px] font-bold">{action} <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function QuickActions() {
  const actions = [
    ["View orders", ShoppingBag, "/admin/operational-queue"],
    ["Kitchen queue", ChefHat, "/admin/kitchen-queue"],
    ["View menu", Package, "/admin/menu"],
    ["View sales", TrendingUp, "/admin/analytics/sales"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map(([label, Icon, to]) => (
        <Link key={label} to={to} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#E8E2DD] bg-white px-3 text-xs font-semibold text-[#6B6B6B] transition-colors hover:border-[#FF2438]/30 hover:text-[#FF2438] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2438]/30">
          {createElement(Icon, { size: 14, "aria-hidden": true })}
          {label} <span aria-hidden="true">→</span>
        </Link>
      ))}
    </div>
  );
}
