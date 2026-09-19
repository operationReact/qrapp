import { Link } from "@tanstack/react-router";
import { createElement } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  Clock3,
  Flame,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  Tag,
  Users,
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
  ORDER_PLACED: { label: "New", color: "text-violet-700", bg: "bg-violet-50" },
  ACKNOWLEDGED: { label: "Confirmed", color: "text-blue-700", bg: "bg-blue-50" },
  PREPARING: { label: "Preparing", color: "text-amber-700", bg: "bg-amber-50" },
  READY: { label: "Ready", color: "text-emerald-700", bg: "bg-emerald-50" },
  DELIVERED: { label: "Out for delivery", color: "text-cyan-700", bg: "bg-cyan-50" },
  COMPLETED: { label: "Completed", color: "text-zinc-600", bg: "bg-zinc-100" },
  CANCELLED: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50" },
};

export function KpiStrip({ summary, comparison, loading }) {
  const current = summary ?? {};
  const previous = comparison ?? {};
  const orders = current.completedOrders;
  const cards = [
    {
      label: "Revenue",
      value: formatCurrency(current.totalRevenue),
      trend: current.totalRevenue == null ? null : (previous.totalRevenue != null
        ? ((Number(current.totalRevenue) - Number(previous.totalRevenue)) / Number(previous.totalRevenue || 1)) * 100
        : null),
      tone: "text-zinc-950",
    },
    {
      label: "Orders",
      value: formatNumber(orders),
      trend: orders != null && previous.completedOrders != null
        ? ((Number(orders) - Number(previous.completedOrders)) / Number(previous.completedOrders || 1)) * 100
        : null,
      tone: "text-zinc-950",
    },
    {
      label: "Avg. order value",
      value: formatCurrency(current.averageOrderValue),
      trend: current.averageOrderValue != null && previous.averageOrderValue != null
        ? ((Number(current.averageOrderValue) - Number(previous.averageOrderValue)) / Number(previous.averageOrderValue || 1)) * 100
        : null,
      tone: "text-zinc-950",
    },
    {
      label: "Est. profit",
      value: formatCurrency(current.totalEstimatedProfit),
      note: "Cost-backed estimate",
      tone: "text-emerald-700",
    },
    { label: "Pending", value: loading ? null : formatNumber(current.pendingOrders), note: "Live queue", tone: "text-amber-700" },
    { label: "Delayed", value: loading ? null : formatNumber(current.delayedOrders), note: "Live queue", tone: "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-200/80 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card, index) => (
        <div key={card.label} className={cn(
          "min-w-0 bg-white px-3 py-3 sm:px-4 sm:py-3.5",
          index === 3 && "bg-emerald-50/30",
        )}>
          <p className="text-[10px] font-bold uppercase leading-snug tracking-[0.1em] text-zinc-400">{card.label}</p>
          {loading && index < 3 ? <Skeleton className="mt-2 h-7 w-20" /> : (
            <p className={cn("mt-1.5 break-words text-[21px] font-bold leading-tight tracking-tight tabular-nums sm:text-[22px]", card.tone)}>
              {card.value ?? "—"}
            </p>
          )}
          <div className="mt-1 min-h-4">
            {card.note ? <span className="text-[11px] leading-snug text-zinc-400">{card.note}</span> : <Trend value={card.trend} />}
          </div>
        </div>
      ))}
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
    <Panel className="lg:col-span-8">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3.5 sm:px-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">Business performance</p>
          <h2 className="mt-1 text-[15px] font-bold tracking-tight text-zinc-950">Revenue &amp; orders</h2>
          <p className="mt-0.5 text-xs text-zinc-400">{rangeLabel} · completed orders</p>
        </div>
        <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5" role="tablist" aria-label="Revenue chart metric">
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
                "rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                metric === value ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800",
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
        <EmptyState icon={CircleDollarSign} title="No sales data for this period" description="Completed orders will appear here once they are recorded." />
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
    ["New", dashboard?.placedOrders ?? 0, "bg-violet-50 text-violet-700"],
    ["Preparing", dashboard?.preparingOrders ?? 0, "bg-amber-50 text-amber-700"],
    ["Ready", dashboard?.readyOrders ?? 0, "bg-emerald-50 text-emerald-700"],
    ["Delayed", dashboard?.delayedOrders ?? 0, "bg-red-50 text-red-700"],
  ];

  return (
    <Panel className="lg:col-span-4">
      <PanelHeader action="Kitchen queue" to="/admin/kitchen-queue">Live operations</PanelHeader>
      {loading ? <LoadingRows count={3} /> : error ? <ErrorState message="Unable to load live operations." onRetry={onRetry} /> : <>
      <div className="grid grid-cols-4 gap-1.5 px-4 pt-4 sm:px-5">
        {counts.map(([label, value, classes]) => (
          <Link key={label} to="/admin/kitchen-queue" className={cn("rounded-xl px-1 py-2 text-center transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", classes)}>
            <p className="text-lg font-bold tabular-nums">{formatNumber(value)}</p>
            <p className="mt-0.5 truncate text-[10px] font-semibold">{label}</p>
          </Link>
        ))}
      </div>
      </>}
      <div className="mt-4 divide-y divide-zinc-100 border-t border-zinc-100 px-4 sm:px-5">
        {queue.length === 0 ? <EmptyState icon={CheckCircle2} title="Kitchen is clear" description="No active orders need attention right now." /> : queue.map((order) => {
          const meta = statusMeta[order.status] ?? statusMeta.ORDER_PLACED;
          return (
            <Link key={order.id} to="/admin/kitchen-queue" className="flex items-center gap-2.5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500"><ChefHat size={14} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-xs font-bold text-zinc-800">#{order.orderNumber ?? order.id}</span>
                <span className="block text-[11px] text-zinc-400">{order.isDelayed ? "Needs attention" : "Active order"}</span>
              </span>
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

export function NeedsAttention({ dashboard, inventoryQuery, summary, liveLoading }) {
  const inventory = inventoryQuery.data?.content ?? [];
  const inventoryCount = inventoryQuery.data?.totalElements ?? inventory.length;
  const alerts = [
    dashboard?.delayedOrders > 0 && { tone: "red", icon: AlertTriangle, title: `${formatNumber(dashboard.delayedOrders)} delayed order${dashboard.delayedOrders === 1 ? "" : "s"}`, detail: "Review the kitchen queue", to: "/admin/kitchen-queue", action: "Review" },
    dashboard?.placedOrders > 0 && { tone: "amber", icon: ChefHat, title: `${formatNumber(dashboard.placedOrders)} new order${dashboard.placedOrders === 1 ? "" : "s"} waiting`, detail: "Acknowledge incoming orders", to: "/admin/kitchen-queue", action: "Open queue" },
    inventoryCount > 0 && { tone: "amber", icon: Package, title: `${formatNumber(inventoryCount)} item${inventoryCount === 1 ? "" : "s"} running low`, detail: "Check inventory levels", to: "/admin/menu", action: "View stock" },
    summary?.cancelledOrders > 0 && { tone: "neutral", icon: ShoppingBag, title: `${formatNumber(summary.cancelledOrders)} cancelled orders`, detail: "Cancellation rate for this period", to: "/admin/analytics/orders", action: "Inspect" },
  ].filter(Boolean);
  const tones = {
    red: "border-red-100 bg-red-50/60 text-red-700",
    amber: "border-amber-100 bg-amber-50/60 text-amber-700",
    neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
  };
  return (
    <Panel>
      <PanelHeader action="Operations center" to="/admin/ops-center">Action queue</PanelHeader>
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
    ["Add item", Plus, "/admin/menu"],
    ["Create combo", Flame, "/admin/combos"],
    ["Coupon", Tag, "/admin/promotions"],
    ["Sync", RefreshCw, "/admin/ops-center"],
    ["Kitchen", ChefHat, "/admin/kitchen-queue"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-bold text-zinc-500">Quick actions</span>
      {actions.map(([label, Icon, to]) => (
        <Link key={label} to={to} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
          {createElement(Icon, { size: 14, "aria-hidden": true })}
          {label}
        </Link>
      ))}
    </div>
  );
}
