import { createFileRoute, Navigate, Link, useLocation } from "@tanstack/react-router";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  useOverviewKpis,
  useProfitabilityDashboard,
  useMostProfitableItems,
  useLeastSellingItems,
  useHourlyOrders,
  useTrendingItems,
} from "@/hooks/useAnalytics";
import { promotionsOptions } from "@/query/options/promotions";
import { menuOptions } from "@/query/options/menu";
import {
  ArrowUpRight, ArrowDownRight, Bell, ChevronRight,
  TrendingUp, TrendingDown, Zap, ShoppingBag, Clock,
  CheckCircle2, ChefHat, PackageCheck, AlertCircle,
  AlertTriangle, Menu as MenuIcon,
  Flame, Plus, RotateCw, Tag,
} from "lucide-react";
import { SidebarIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/")({ component: AdminDashboardPage });

// ── Helpers ───────────────────────────────────────────────────────────────────
const TODAY       = new Date().toISOString().slice(0, 10);
const fmt         = (n) => n == null ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(n));
const fmtCur      = (n) => n == null ? "—" : `₹${fmt(n)}`;
const fmtPct      = (n) => n == null ? "—" : `${Number(n).toFixed(1)}%`;
const greet       = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const todayLabel  = () => new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const hourLabel   = (h) => h === 0 ? "12A" : h < 12 ? `${h}A` : h === 12 ? "12P" : `${h - 12}P`;
const fmtTime     = (iso) => !iso ? "" : new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
const trendSign   = (t) => t == null ? null : t >= 0 ? `+${Math.round(Math.abs(t))}%` : `-${Math.round(Math.abs(t))}%`;
const isTodayDate = (iso) => iso && new Date(iso).toDateString() === new Date().toDateString();

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ["Overview", "Activity", "Insights"];

// Single combined nav bar — hamburger | tabs | bell (no store dropdown)
function CombinedNav({ active, onChange, d, toggleSidebar }) {
  const notifCount = Math.min((d.delayedOrders ?? 0) + (d.placedOrders ?? 0), 9);
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <div className="flex items-center h-12 px-2">
        {/* hamburger */}
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleSidebar}
          aria-label="Open menu"
        >
          <SidebarIcon />
        </Button>

        {/* tabs — fill all remaining space */}
        <div className="flex flex-1 max-w-lg mx-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => onChange(tab)}
              className={cn(
                "flex-1 relative h-12 text-sm font-medium transition-colors",
                active === tab ? "text-primary" : "text-zinc-400 hover:text-zinc-600"
              )}>
              {tab}
              {active === tab && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* bell */}
        <Button
          aria-label="Notifications"
          size="icon"
          variant="ghost"
          className="relative"
        >
          <Bell />
          {notifCount > 0 && (
            <span className="absolute top-0.5 right-0.5 size-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {notifCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return <div className="bg-zinc-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl">{fmtCur(payload[0]?.value)}</div>;
}

// ── Shared ────────────────────────────────────────────────────────────────────
function SectionLabel({ children, action, to }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <p className="text-sm font-medium text-zinc-500">{children}</p>
      {action && (
        <Link to={to ?? "#"} className="flex items-center gap-0.5 text-sm hover:underline font-medium text-primary">
          {action} <ChevronRight size={11} />
        </Link>
      )}
    </div>
  );
}

// Skeleton shimmer for loading states
function Skeleton({ className }) {
  return <div className={cn("animate-pulse bg-zinc-100 rounded-lg", className)} />;
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ d, ownerName }) {
  // ── API calls ──────────────────────────────────────────────────────────────
  const kpis     = useOverviewKpis();                                              // revenueToday, revenueTrend
  const profit   = useProfitabilityDashboard({ from: TODAY, to: TODAY });          // totalEstimatedProfit, avgProfitMargin
  const { data: promotions = [] } = useQuery(promotionsOptions);                   // expiresAt, isActive
  const { data: menu = [] }       = useQuery(menuOptions());                       // available flag

  // ── Derived values ─────────────────────────────────────────────────────────
  const k  = (kpis.data && typeof kpis.data === "object" && !Array.isArray(kpis.data)) ? kpis.data : {};
  const pd = profit.data ?? {};

  const todayRevenue    = k.revenueToday    != null ? Number(k.revenueToday)       : null;
  const revenueTrend    = k.revenueTrend    != null ? Number(k.revenueTrend)       : null;
  const estProfit       = pd.totalEstimatedProfit != null ? Number(pd.totalEstimatedProfit) : null;
  const margin          = pd.avgProfitMargin != null ? Number(pd.avgProfitMargin)  : null;

  const todayOrders     = (d.completedToday ?? 0) + (d.liveOrders ?? 0);
  const pendingOrders   = (d.placedOrders ?? 0) + (d.preparingOrders ?? 0);
  const delayedCount    = d.delayedOrders ?? 0;

  const expiringPromos  = promotions.filter(p => p.isActive && isTodayDate(p.expiresAt));
  const outOfStock      = menu.filter(m => !m.available).length;

  const priorities = [
    delayedCount > 0 && {
      dotCls: "bg-red-400", tagCls: "text-red-500", tagBg: "bg-red-50",
      text: `${delayedCount} delayed order${delayedCount > 1 ? "s" : ""} — action needed`,
      tag: "Urgent", to: "/admin/kitchen-queue",
    },
    expiringPromos.length > 0 && {
      dotCls: "bg-amber-400", tagCls: "text-amber-600", tagBg: "bg-amber-50",
      text: `${expiringPromos.length} promotion${expiringPromos.length > 1 ? "s" : ""} expire${expiringPromos.length === 1 ? "s" : ""} today`,
      tag: "Today", to: "/admin/promotions",
    },
    outOfStock > 0 && {
      dotCls: "bg-orange-400", tagCls: "text-orange-500", tagBg: "bg-orange-50",
      text: `${outOfStock} menu item${outOfStock > 1 ? "s" : ""} out of stock`,
      tag: "Stock", to: "/admin/menu?availability=unavailable",
    },
    pendingOrders > 0 && {
      dotCls: "bg-blue-400", tagCls: "text-blue-500", tagBg: "bg-blue-50",
      text: `${pendingOrders} order${pendingOrders > 1 ? "s" : ""} waiting in queue`,
      tag: "Queue", to: "/admin/kitchen-queue",
    },
  ].filter(Boolean).slice(0, 3);

  const quickActions = [
    { label: "Add Item",  icon: Plus,    bgCls: "bg-violet-50",  iconCls: "text-violet-600", to: "/admin/menu"       },
    { label: "Combo",     icon: Flame,   bgCls: "bg-orange-50",  iconCls: "text-orange-500", to: "/admin/combos"     },
    { label: "Coupon",    icon: Tag,     bgCls: "bg-emerald-50", iconCls: "text-emerald-600",to: "/admin/coupons"    },
    { label: "Sync",      icon: RotateCw,bgCls: "bg-zinc-100",   iconCls: "text-zinc-600",   to: "/admin/ops-center" },
  ];

  const revenueLoading = kpis.loading;
  const profitLoading  = profit.loading;

  return (
    <div className="px-4 py-4 space-y-4 md:space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-xs uppercase tracking-wide font-medium text-primary">{todayLabel()}</p>
        <h1 className="text-xl md:text-2xl font-semibold capitalize leading-tight mt-1.5">
          {greet()}{ownerName ? `, ${ownerName}` : ""} 👋
        </h1>
      </div>

      {/* Alert banner — only when there are pending orders */}
      {pendingOrders > 0 && (
        <Link to="/admin/kitchen-queue"
          className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 active:opacity-80">
          <AlertCircle size={14} className="text-amber-500 shrink-0" />
          <span className="flex-1 text-[12px] font-semibold text-amber-800">
            {pendingOrders} order{pendingOrders > 1 ? "s" : ""} need attention
          </span>
          <span className="text-[11px] font-bold text-amber-600">Review →</span>
        </Link>
      )}

      {/* Revenue Hero */}
      <div className="bg-white border-card rounded-lg p-4">
        <div className="flex items-start justify-between mb-1">
          <span className="text-sm font-medium text-primary">Today's Revenue</span>
          <TrendingUp className="text-primary mt-0.5 size-5" />
        </div>
        {revenueLoading ? (
          <Skeleton className="h-9 w-36 bg-white/20 mt-0.5" />
        ) : (
          <div className="text-2xl font-semibold leading-tight tracking-tight">
            {fmtCur(todayRevenue ?? 0)} <span className="tracking-normal font-medium uppercase text-xs text-zinc-500 ml-1">/ Live</span>
          </div>
        )}
        <div className="flex items-center gap-1 mt-1.5">
          {revenueTrend != null && (
            <>
              {revenueTrend >= 0
                ? <ArrowUpRight size={12} className="text-emerald-500" />
                : <ArrowDownRight size={12} className="text-red-500" />
              }
              <span className={cn("text-[11px] font-semibold", revenueTrend >= 0 ? "text-emerald-500" : "text-red-500")}>
                {trendSign(revenueTrend)} vs yesterday
              </span>
            </>
          )}
        </div>
      </div>

      {/* Profit + Orders */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3.5 border-card">
          <span className="text-sm font-medium text-primary">   Est. Profit</span>
          {profitLoading ? (
            <Skeleton className="h-7 w-24 mt-1" />
          ) : (
            <div className="text-2xl font-semibold mt-0.5 tracking-tight">{fmtCur(estProfit ?? 0)}</div>
          )}
          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
            {margin != null ? `${fmtPct(margin)} margin` : "—"}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3.5 border-card">
           <span className="text-sm font-medium text-primary">Orders</span>
          <div className="text-2xl font-semibold mt-0.5 tracking-tight">{fmt(todayOrders || 0)}</div>
          {pendingOrders > 0
            ? <div className="text-xs text-amber-700 font-medium mt-0.5">{pendingOrders} pending orders</div>
            : <div className="text-xs text-zinc-500 mt-0.5">today</div>
          }
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map(({ label, icon: Icon, bgCls, iconCls, to }) => ( // eslint-disable-line no-unused-vars
            <Link key={label} to={to}
              className="flex flex-col items-center gap-2 bg-white rounded-lg hover:shadow-sm p-2.5 border border-zinc-200 active:scale-95 transition-all">
              <div className={cn("size-9 rounded-lg flex items-center justify-center", bgCls)}>
                <Icon weight="duotone" size={16} className={iconCls} />
              </div>
              <span className="text-xs font-medium text-zinc-600 text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Today's Priorities */}
      <div>
        <SectionLabel action="See all" to="/admin/ops-center">Today's Priorities</SectionLabel>
        {priorities.length === 0 ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-3">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-[12px] font-medium text-emerald-700">All clear — no urgent items 🎉</span>
          </div>
        ) : (
          <div className="space-y-2">
            {priorities.map(({ dotCls, tagCls, tagBg, text, tag, to }) => (
              <Link key={text} to={to}
                className="flex items-center gap-2.5 bg-white rounded-sm border-card px-3 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,.04)] border border-zinc-100 active:bg-zinc-50">
                <span className={cn("size-1.5 rounded-[2px] shrink-0", dotCls)} />
                <span className="text-sm flex-1">{text}</span>
                <Badge className={cn(tagCls, tagBg)}>{tag}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Activity Tab ──────────────────────────────────────────────────────────────
// Order status → icon/color config (static Tailwind classes only)
const ORDER_STATUS_META = {
  ORDER_PLACED: { Icon: ShoppingBag,  iconCls: "text-violet-500",  bgCls: "bg-violet-50",  verb: "New order placed"    },
  PREPARING:    { Icon: ChefHat,       iconCls: "text-orange-500",  bgCls: "bg-orange-50",  verb: "Started preparing"   },
  READY:        { Icon: PackageCheck,  iconCls: "text-emerald-500", bgCls: "bg-emerald-50", verb: "Order ready"         },
  COMPLETED:    { Icon: CheckCircle2,  iconCls: "text-emerald-500", bgCls: "bg-emerald-50", verb: "Order completed"     },
  CANCELLED:    { Icon: AlertCircle,   iconCls: "text-red-500",     bgCls: "bg-red-50",     verb: "Order cancelled"     },
  DELAYED:      { Icon: AlertTriangle, iconCls: "text-red-500",     bgCls: "bg-red-50",     verb: "Order delayed"       },
};

function ActivityTab({ d }) {
  const opsChips = [
    { label: "New",       value: d.placedOrders   ?? 0, dotCls: "bg-violet-400",  numCls: "text-violet-700",  bgCls: "bg-violet-50"   },
    { label: "Preparing", value: d.preparingOrders ?? 0, dotCls: "bg-orange-400",  numCls: "text-orange-600",  bgCls: "bg-orange-50"   },
    { label: "Ready",     value: d.readyOrders     ?? 0, dotCls: "bg-emerald-400", numCls: "text-emerald-700", bgCls: "bg-emerald-50"  },
    { label: "Delayed",   value: d.delayedOrders   ?? 0, dotCls: "bg-red-400",     numCls: "text-red-600",     bgCls: "bg-red-50"      },
    { label: "Done",      value: d.completedToday  ?? 0, dotCls: "bg-teal-400",    numCls: "text-teal-700",    bgCls: "bg-teal-50"     },
  ];

  // Build activity feed from live orders queue (real data)
  const liveQueue   = d.liveOrdersQueue ?? [];
  const attentionQ  = d.attentionOrders ?? [];
  const combinedQ   = [...attentionQ, ...liveQueue]
    .filter((o, i, arr) => arr.findIndex(x => x.id === o.id) === i) // dedupe
    .slice(0, 6);

  const activityItems = combinedQ.map((order) => {
    const meta = ORDER_STATUS_META[order.status] ?? ORDER_STATUS_META.ORDER_PLACED;
    return {
      Icon: meta.Icon,
      iconCls: meta.iconCls,
      bgCls: meta.bgCls,
      text: `${meta.verb} — #${order.id}`,
      time: fmtTime(order.createdAt),
    };
  });

  // All priorities — dynamic from live data
  const allPriorities = [
    d.delayedOrders > 0 && {
      dotCls: "bg-red-400", tagCls: "text-red-500", tagBg: "bg-red-50",
      text: `${d.delayedOrders} delayed order${d.delayedOrders > 1 ? "s" : ""} need action`,
      tag: "Urgent", to: "/admin/kitchen-queue",
    },
    (d.placedOrders ?? 0) > 0 && {
      dotCls: "bg-violet-400", tagCls: "text-violet-500", tagBg: "bg-violet-50",
      text: `${d.placedOrders} new order${d.placedOrders > 1 ? "s" : ""} awaiting kitchen`,
      tag: "Queue", to: "/admin/kitchen-queue",
    },
    {
      dotCls: "bg-blue-400", tagCls: "text-blue-500", tagBg: "bg-blue-50",
      text: "Data sync — keep analytics up to date",
      tag: "Sync", to: "/admin/ops-center",
    },
    {
      dotCls: "bg-zinc-300", tagCls: "text-zinc-500", tagBg: "bg-zinc-100",
      text: "Review weekly analytics report",
      tag: "Later", to: "/admin/analytics",
    },
  ].filter(Boolean);

  return (
    <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">
      {/* Live Operations — real counts */}
      <div>
        <SectionLabel action="Kitchen Queue" to="/admin/kitchen-queue">Live Operations</SectionLabel>
        <div className="grid grid-cols-5 gap-1.5">
          {opsChips.map(({ label, value, dotCls, numCls, bgCls }) => (
            <Link key={label} to="/admin/kitchen-queue"
              className={cn("flex flex-col items-center justify-center rounded-xl py-2.5 gap-0.5 border border-transparent", bgCls)}>
              <span className={cn("size-1.5 rounded-full", dotCls)} />
              <span className={cn("text-[20px] font-bold leading-tight", numCls)}>{value}</span>
              <span className="text-[9px] font-semibold text-zinc-500">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Priorities */}
      <div>
        <SectionLabel action="Ops Center" to="/admin/ops-center">All Priorities</SectionLabel>
        <div className="space-y-2">
          {allPriorities.map(({ dotCls, tagCls, tagBg, text, tag, to }) => (
            <Link key={text} to={to}
              className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,.04)] border border-zinc-100 active:bg-zinc-50">
              <span className={cn("size-1.5 rounded-full shrink-0", dotCls)} />
              <span className="text-[12px] text-zinc-700 font-medium leading-snug flex-1">{text}</span>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap", tagCls, tagBg)}>{tag}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity — from live queue */}
      <div>
        <SectionLabel action="View all" to="/admin/ops-center">Recent Activity</SectionLabel>
        <div className="bg-white rounded-2xl px-4 shadow-[0_1px_8px_rgba(0,0,0,.05)] border border-zinc-100 divide-y divide-zinc-50">
          {activityItems.length === 0 ? (
            <div className="py-4 text-center text-[12px] text-zinc-400">No recent activity</div>
          ) : (
            activityItems.map(({ Icon, iconCls, bgCls, text, time }, i) => ( // eslint-disable-line no-unused-vars
              <div key={i} className="flex items-center gap-2.5 py-2.5">
                <span className={cn("size-7 rounded-lg flex items-center justify-center shrink-0", bgCls)}>
                  <Icon size={13} className={iconCls} />
                </span>
                <p className="flex-1 text-[12px] font-medium text-zinc-700 leading-snug truncate">{text}</p>
                <span className="text-[10px] text-zinc-400 font-medium shrink-0">{time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Insights Tab ──────────────────────────────────────────────────────────────
function InsightsTab({ d }) {
  // ── API calls ──────────────────────────────────────────────────────────────
  const profit      = useProfitabilityDashboard({ from: TODAY, to: TODAY });
  const topItems    = useMostProfitableItems({ from: TODAY, to: TODAY, limit: 3 });
  const lowItems    = useLeastSellingItems({ from: TODAY, to: TODAY, limit: 3 });
  const hourly      = useHourlyOrders();   // defaults to today
  const trending    = useTrendingItems();  // { trending, mostReordered, ... }

  // ── Derived ────────────────────────────────────────────────────────────────
  const pd       = profit.data ?? {};
  const revenue  = Number(pd.totalRevenue           ?? 0);
  const cost     = Number(pd.totalEstimatedCost     ?? 0);
  const profitAmt= Number(pd.totalEstimatedProfit   ?? 0);
  const marginPct= Number(pd.avgProfitMargin        ?? 0);

  const maxRev = revenue || 1;
  const profitRows = [
    { label: "Revenue",      value: fmtCur(revenue),    pct: 100,                     barCls: "bg-violet-400" },
    { label: "COGS",         value: fmtCur(cost),       pct: Math.round(cost / maxRev * 100),   barCls: "bg-rose-300"   },
    { label: "Gross Profit", value: fmtCur(revenue - cost), pct: Math.round((revenue - cost) / maxRev * 100), barCls: "bg-emerald-400" },
    { label: "Net Profit",   value: fmtCur(profitAmt),  pct: Math.round(profitAmt / maxRev * 100), barCls: "bg-blue-400" },
  ];

  // Sales trend chart — real hourly data
  const hourlyRows = Array.isArray(hourly.data) ? hourly.data : [];
  const salesData  = hourlyRows.map(row => ({
    t: hourLabel(row.hourOfDay ?? row.hour ?? 0),
    v: Number(row.hourRevenue ?? 0),
  }));

  // Top/low items
  const topItemRows = Array.isArray(topItems.data) ? topItems.data.slice(0, 3) : [];
  const lowItemRows = Array.isArray(lowItems.data) ? lowItems.data.slice(0, 3) : [];

  // Trending → smart recommendations
  const trendData    = trending.data ?? {};
  const trendingList = (trendData.trending ?? []).slice(0, 3);

  return (
    <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">

      {/* Profitability */}
      <div>
        <SectionLabel action="Full report" to="/admin/analytics/profitability">Profitability Today</SectionLabel>
        <div className="bg-white rounded-2xl p-4 shadow-[0_1px_8px_rgba(0,0,0,.06)] border border-zinc-100 space-y-3">
          {profit.loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
          ) : (
            profitRows.map(({ label, value, pct, barCls }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-zinc-600 font-medium">{label}</span>
                  <span className="text-[11px] font-bold text-zinc-800">{value}</span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", barCls)} style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
              </div>
            ))
          )}
          {!profit.loading && (
            <p className="text-[10px] text-zinc-400 pt-0.5">
              Profit margin: <span className="font-bold text-emerald-600">{fmtPct(marginPct)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Top & Low revenue items */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
          <div className="flex items-center gap-1 mb-2">
            <TrendingUp size={11} className="text-emerald-600" />
            <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wide">High Profit</p>
          </div>
          {topItems.loading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full mb-1" />)
            : topItemRows.length === 0
              ? <p className="text-[10px] text-zinc-400">No data yet</p>
              : topItemRows.map((it) => (
                  <div key={it.menuItemName} className="flex items-center justify-between py-0.5">
                    <span className="text-[10.5px] text-zinc-700 truncate pr-1">{it.menuItemName}</span>
                    <span className="text-[10.5px] font-bold text-emerald-700 shrink-0">{fmtCur(it.totalProfit)}</span>
                  </div>
                ))
          }
        </div>
        <div className="bg-red-50 rounded-xl p-3 border border-red-100">
          <div className="flex items-center gap-1 mb-2">
            <TrendingDown size={11} className="text-red-500" />
            <p className="text-[9px] font-bold text-red-600 uppercase tracking-wide">Low Sales</p>
          </div>
          {lowItems.loading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full mb-1" />)
            : lowItemRows.length === 0
              ? <p className="text-[10px] text-zinc-400">No data yet</p>
              : lowItemRows.map((it) => (
                  <div key={it.menuItemName} className="flex items-center justify-between py-0.5">
                    <span className="text-[10.5px] text-zinc-700 truncate pr-1">{it.menuItemName}</span>
                    <span className="text-[10.5px] font-bold text-red-500 shrink-0">{fmtCur(it.totalRevenue)}</span>
                  </div>
                ))
          }
        </div>
      </div>

      {/* Sales Trend — real hourly data */}
      <div>
        <SectionLabel action="Analytics" to="/admin/analytics/sales">Today's Sales Trend</SectionLabel>
        <div className="bg-white rounded-2xl p-4 shadow-[0_1px_8px_rgba(0,0,0,.06)] border border-zinc-100">
          {hourly.loading ? (
            <Skeleton className="h-36 w-full" />
          ) : salesData.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-[12px] text-zinc-400">
              <div className="text-center">
                <Clock size={20} className="mx-auto mb-1 text-zinc-300" />
                No hourly data yet
              </div>
            </div>
          ) : (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 4, right: 2, left: -30, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#a1a1aa" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `₹${v / 1000}K` : `₹${v}`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#7C3AED", strokeWidth: 1, strokeDasharray: "4 4" }} />
                  <Area type="monotone" dataKey="v" stroke="#7C3AED" strokeWidth={2} fill="url(#salesGrad)"
                    dot={{ r: 2.5, fill: "#7C3AED", stroke: "#fff", strokeWidth: 1.5 }}
                    activeDot={{ r: 4, fill: "#7C3AED", stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Smart Recommendations — from trending items engine */}
      <div>
        <SectionLabel action="View all" to="/admin/recommendations">
          <span className="flex items-center gap-1.5">Smart Recommendations <Zap size={10} className="text-amber-400" /></span>
        </SectionLabel>
        {trending.loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : trendingList.length === 0 ? (
          <div className="bg-white rounded-xl px-3 py-3 text-[12px] text-zinc-400 text-center border border-zinc-100">
            Trending data is computed nightly — check back tomorrow.
          </div>
        ) : (
          <div className="space-y-2">
            {trendingList.map(({ name, count }) => (
              <div key={name} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,.04)] border border-zinc-100">
                <span className="text-[18px] shrink-0">🔥</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-medium text-zinc-700 leading-snug">{name} is trending</p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-0.5">{count} orders recently</p>
                </div>
                <Link to="/admin/recommendations"
                  className="shrink-0 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-1 rounded-lg">
                  Boost
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avg Fulfillment */}
      <div className="bg-white rounded-xl px-4 py-3 shadow-[0_1px_6px_rgba(0,0,0,.04)] border border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Clock size={14} className="text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Avg Fulfillment</p>
            <p className="text-[15px] font-bold text-zinc-900">{d.averageFulfillmentMinutes ?? 0} min</p>
          </div>
        </div>
        <Link to="/admin/analytics/orders"
          className="text-[11px] font-semibold text-violet-500 flex items-center gap-0.5">
          Details <ChevronRight size={11} />
        </Link>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
function AdminDashboardPage() {
  const { dashboard, loadData } = useAdminDashboard();
  const { isAdmin, isSuperUser, user } = useAuth();
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => { loadData({ quiet: true }); }, []); // eslint-disable-line

  if (!isAdmin && !isSuperUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const ownerName = user?.info?.name?.split(" ")[0] ?? "";
  const d = dashboard ?? {};

  return (
    <div className="min-h-screen">
      <CombinedNav
        active={activeTab}
        onChange={setActiveTab}
        d={d}
        toggleSidebar={toggleSidebar}
      />

      <div className="pb-8">
        {activeTab === "Overview" && <OverviewTab d={d} ownerName={ownerName} />}
        {activeTab === "Activity" && <ActivityTab d={d} />}
        {activeTab === "Insights" && <InsightsTab d={d} />}
      </div>
    </div>
  );
}
