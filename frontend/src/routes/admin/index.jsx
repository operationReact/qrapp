import { createFileRoute, Navigate, Link, useLocation } from "@tanstack/react-router";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  AlertTriangle, ArrowUpRight, ArrowDownRight, Bell, ChevronRight,
  TrendingUp, TrendingDown, Zap, ShoppingBag, IndianRupee, Clock,
  CheckCircle2, ChefHat, PackageCheck, AlertCircle, Menu as MenuIcon,
  Star, BadgePercent, Flame,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: AdminDashboardPage });

const fmt = (n) => n == null ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(n));
const fmtCur = (n) => n == null ? "—" : `₹${fmt(n)}`;
const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

function SalesChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return <div className="bg-violet-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg">{fmtCur(payload[0]?.value)}</div>;
}

function SectionHeader({ title, action, to }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[15px] font-semibold text-zinc-900">{title}</h2>
      {action && <Link to={to ?? "#"} className="flex items-center gap-0.5 text-xs font-semibold text-violet-600">{action} <ArrowUpRight size={13} /></Link>}
    </div>
  );
}

function KpiTile({ label, value, delta, danger, icon: Icon, iconColor }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col gap-1 min-w-0">
      <div className="flex items-start justify-between gap-1">
        <span className="text-[11px] font-medium text-zinc-500 leading-tight">{label}</span>
        <span className={cn("size-7 rounded-xl flex items-center justify-center shrink-0", iconColor)}><Icon size={14} /></span>
      </div>
      <p className="text-xl font-bold text-zinc-900 tracking-tight">{value}</p>
      {danger
        ? <span className="text-[11px] font-semibold text-red-500">Needs attention</span>
        : delta != null
          ? <span className={cn("flex items-center gap-0.5 text-[11px] font-semibold", delta >= 0 ? "text-emerald-600" : "text-red-500")}>
              {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(delta)}% vs yesterday
            </span>
          : null}
    </div>
  );
}

function ActionRow({ icon: Icon, iconBg, text, to }) {
  return (
    <Link to={to ?? "#"} className="flex items-center gap-3 py-3 border-b border-zinc-50 last:border-0 active:bg-zinc-50 transition-colors">
      <span className={cn("size-8 rounded-xl flex items-center justify-center shrink-0", iconBg)}><Icon size={14} /></span>
      <span className="flex-1 text-sm font-medium text-zinc-800 leading-tight">{text}</span>
      <ChevronRight size={15} className="text-zinc-300 shrink-0" />
    </Link>
  );
}

function OpsChip({ label, value, icon: Icon, color, bg }) {
  return (
    <Link to="/admin/kitchen-queue" className={cn("flex flex-col items-center justify-center rounded-2xl p-3 min-w-[76px] gap-1 border border-zinc-50 shadow-sm", bg)}>
      <Icon size={18} className={color} />
      <span className={cn("text-2xl font-bold leading-none", color)}>{value}</span>
      <span className="text-[10px] font-semibold text-zinc-500">{label}</span>
    </Link>
  );
}

function AdminDashboardPage() {
  const { dashboard, loadData } = useAdminDashboard();
  const { isAdmin, isSuperUser, user } = useAuth();
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const [notifCount] = useState(3);

  useEffect(() => { loadData({ quiet: true }); }, []); // eslint-disable-line

  if (!isAdmin && !isSuperUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const ownerName = user?.info?.name?.split(" ")[0] ?? "there";
  const d = dashboard ?? {};
  const todayRevenue    = d.totalRevenue ?? null;
  const todayOrders     = (d.completedToday ?? 0) + (d.liveOrders ?? 0);
  const pendingOrders   = (d.placedOrders ?? 0) + (d.preparingOrders ?? 0);
  const estimatedProfit = todayRevenue ? Math.round(todayRevenue * 0.387) : null;

  const actions = [
    d.delayedOrders > 0 && { icon: AlertCircle, iconBg: "bg-red-50 text-red-500", text: `${d.delayedOrders} delayed order${d.delayedOrders > 1 ? "s" : ""} need attention`, to: "/admin/kitchen-queue" },
    { icon: BadgePercent, iconBg: "bg-amber-50 text-amber-500",  text: "1 promotion is expiring today", to: "/admin/promotions" },
    { icon: ShoppingBag,  iconBg: "bg-orange-50 text-orange-500",text: "2 menu items are out of stock",  to: "/admin/menu"       },
    { icon: Zap,          iconBg: "bg-violet-50 text-violet-500",text: "Sync pending since 15 mins",     to: "/admin/ops-center" },
  ].filter(Boolean);

  const opsChips = [
    { label: "New",       value: d.placedOrders   ?? 0, icon: ShoppingBag,   color: "text-violet-600", bg: "bg-violet-50"  },
    { label: "Preparing", value: d.preparingOrders ?? 0, icon: ChefHat,       color: "text-orange-600", bg: "bg-orange-50"  },
    { label: "Ready",     value: d.readyOrders     ?? 0, icon: PackageCheck,  color: "text-emerald-600",bg: "bg-emerald-50" },
    { label: "Delayed",   value: d.delayedOrders   ?? 0, icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50"     },
    { label: "Completed", value: d.completedToday  ?? 0, icon: CheckCircle2,  color: "text-teal-600",   bg: "bg-teal-50"    },
  ];

  const salesData = [
    { time: "6 AM", revenue: 500 }, { time: "9 AM", revenue: 1800 }, { time: "12 PM", revenue: 5800 },
    { time: "3 PM", revenue: 3400 }, { time: "6 PM", revenue: 2000 }, { time: "9 PM", revenue: 1200 },
  ];

  const profitSummary = [
    { label: "Revenue",       value: fmtCur(todayRevenue ?? 12450), color: "text-zinc-900"    },
    { label: "Food Cost",     value: fmtCur(6200),                   color: "text-zinc-900"    },
    { label: "Est. Profit",   value: fmtCur(estimatedProfit ?? 4820),color: "text-emerald-600" },
    { label: "Profit Margin", value: "38%",                          color: "text-emerald-600" },
  ];
  const topItems = [{ name: "Paneer Biryani", profit: 120 }, { name: "Burger Combo", profit: 90 }, { name: "Veg Pizza", profit: 85 }];
  const lowItems = [{ name: "Tea", profit: 3 }, { name: "Coffee", profit: 4 }, { name: "Fries", profit: 7 }];
  const recs = [
    { emoji: "🍔", title: "Customers buying Burger also buy Fries.",   revenue: "+₹1,500/week" },
    { emoji: "🍗", title: "Chicken Biryani + Coke combo opportunity.", revenue: "+₹2,200/week" },
    { emoji: "🥛", title: "Milkshake Combo Opportunity.",              revenue: "+₹900/week"   },
  ];
  const activity = [
    { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", text: "Order BB-20260607-0003 completed",  time: "12:15 PM" },
    { icon: Star,         color: "text-violet-500",  bg: "bg-violet-50",  text: 'New Combo "Family Feast" created', time: "12:11 PM" },
    { icon: BadgePercent, color: "text-amber-500",   bg: "bg-amber-50",   text: "Promotion activated",              time: "11:45 AM" },
    { icon: ShoppingBag,  color: "text-blue-500",    bg: "bg-blue-50",    text: "Menu item updated",                time: "11:30 AM" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7F5]">

      {/* S1 — HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <button onClick={toggleSidebar} aria-label="Menu" className="size-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 transition-colors">
            <MenuIcon size={20} className="text-zinc-700" />
          </button>
          <img src="/bro-logo.png" alt="Bro & Bro" className="h-8" />
          <button aria-label="Notifications" className="size-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 transition-colors relative">
            <Bell size={20} className="text-zinc-700" />
            {notifCount > 0 && <span className="absolute top-1 right-1 size-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{notifCount}</span>}
          </button>
        </div>
      </header>

      <div className="px-4 pb-10 space-y-4 pt-4 max-w-lg mx-auto">

        {/* Greeting */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-zinc-900 leading-snug">{greet()}, {ownerName}! 👋</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Here's how your restaurant is doing today.</p>
          </div>
          <button className="shrink-0 flex items-center gap-1.5 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm whitespace-nowrap">
            <ShoppingBag size={13} className="text-violet-500" />Bro &amp; Bro Cafe
            <ChevronRight size={12} className="rotate-90 text-zinc-400" />
          </button>
        </div>

        {/* S2 — BUSINESS HEALTH */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">Business Health</p>
          <div className="grid grid-cols-2 gap-3">
            <KpiTile label="Today's Revenue"  value={fmtCur(todayRevenue ?? 12450)}   delta={12} icon={IndianRupee} iconColor="bg-violet-50 text-violet-600" />
            <KpiTile label="Today's Orders"   value={fmt(todayOrders || 67)}          delta={8}  icon={ShoppingBag} iconColor="bg-blue-50 text-blue-600" />
            <KpiTile label="Estimated Profit" value={fmtCur(estimatedProfit ?? 4820)} delta={15} icon={TrendingUp}  iconColor="bg-emerald-50 text-emerald-600" />
            <KpiTile label="Pending Orders"   value={fmt(pendingOrders || 3)}         danger     icon={Clock}       iconColor="bg-red-50 text-red-500" />
          </div>
        </div>

        {/* S3 — ACTION CENTER */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-zinc-900">Action Center</h2>
              <span className="size-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{actions.length}</span>
            </div>
            <Link to="/admin/ops-center" className="flex items-center gap-0.5 text-xs font-semibold text-violet-600">View all <ArrowUpRight size={13} /></Link>
          </div>
          {actions.map((a, i) => <ActionRow key={i} {...a} />)}
        </div>

        {/* S4 — OPERATIONS SNAPSHOT */}
        <div>
          <SectionHeader title="Operations Snapshot" action="Go to Kitchen Queue" to="/admin/kitchen-queue" />
          <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {opsChips.map((c) => <OpsChip key={c.label} {...c} />)}
          </div>
        </div>

        {/* S5 — PROFITABILITY SNAPSHOT */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100">
          <SectionHeader title="Profitability Snapshot" action="View Profitability" to="/admin/analytics/profitability" />
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {profitSummary.map(({ label, value, color }) => (
              <div key={label} className="bg-zinc-50 rounded-xl p-3">
                <p className="text-[10px] font-medium text-zinc-500">{label}</p>
                <p className={cn("text-base font-bold mt-0.5", color)}>{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-emerald-50 rounded-xl p-3">
              <div className="flex items-center gap-1 mb-2"><TrendingUp size={12} className="text-emerald-600" /><p className="text-[10px] font-semibold text-emerald-700">Top Profit Items</p></div>
              {topItems.map((it) => (
                <div key={it.name} className="flex items-center justify-between py-0.5">
                  <span className="text-[11px] text-zinc-700 truncate pr-1">{it.name}</span>
                  <span className="text-[11px] font-bold text-emerald-700 shrink-0">{fmtCur(it.profit)}</span>
                </div>
              ))}
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="flex items-center gap-1 mb-2"><TrendingDown size={12} className="text-red-500" /><p className="text-[10px] font-semibold text-red-600">Low Profit Items</p></div>
              {lowItems.map((it) => (
                <div key={it.name} className="flex items-center justify-between py-0.5">
                  <span className="text-[11px] text-zinc-700 truncate pr-1">{it.name}</span>
                  <span className="text-[11px] font-bold text-red-500 shrink-0">{fmtCur(it.profit)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* S6 — SALES TREND */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100">
          <SectionHeader title="Today's Sales Trend" action="View Analytics" to="/admin/analytics/sales" />
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `₹${v / 1000}K` : `₹${v}`} />
                <Tooltip content={<SalesChartTooltip />} cursor={{ stroke: "#7C3AED", strokeWidth: 1.5, strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2.5} fill="url(#salesGrad)"
                  dot={{ r: 3, fill: "#7C3AED", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "#7C3AED", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* S7 — SMART RECOMMENDATIONS */}
        <div>
          <SectionHeader title="Smart Recommendations" action="View all" to="/admin/recommendations" />
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
            {recs.map((r, i) => (
              <div key={i} className="shrink-0 w-[200px] bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="size-9 rounded-xl bg-emerald-100 flex items-center justify-center text-lg shrink-0">{r.emoji}</span>
                  <Zap size={14} className="text-emerald-600 shrink-0" />
                </div>
                <p className="text-[13px] font-semibold text-zinc-800 leading-snug">{r.title}</p>
                <div>
                  <p className="text-[10px] text-zinc-500 font-medium">Potential Revenue</p>
                  <p className="text-base font-bold text-emerald-700">{r.revenue}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-1.5 mt-2">
            {recs.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full transition-all", i === 0 ? "w-4 bg-violet-600" : "w-1.5 bg-zinc-300")} />)}
          </div>
        </div>

        {/* S8 — TOP COMBO */}
        <div>
          <SectionHeader title="Top Performing Combo" action="View all" to="/admin/combos" />
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex items-center gap-4">
            <div className="flex items-center gap-1 shrink-0">
              {["🍔", "🍟", "🥤"].map((e, i) => (
                <span key={i} className="size-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl shadow-sm border border-amber-100">{e}</span>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5"><Flame size={12} className="text-amber-500" /><p className="text-[11px] font-semibold text-amber-600">Best Seller</p></div>
              <p className="text-sm font-bold text-zinc-900">Burger + Fries + Coke</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Revenue</p>
              <p className="text-lg font-bold text-violet-700">₹8,200</p>
            </div>
            <ChevronRight size={16} className="text-zinc-300 shrink-0" />
          </div>
        </div>

        {/* S9 — RECENT ACTIVITY */}
        <div>
          <SectionHeader title="Recent Activity" action="View all" to="/admin/ops-center" />
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 divide-y divide-zinc-50">
            {activity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className={cn("size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5", item.bg)}>
                  <item.icon size={14} className={item.color} />
                </span>
                <p className="flex-1 text-sm font-medium text-zinc-800 leading-snug">{item.text}</p>
                <span className="text-[11px] text-zinc-400 font-medium shrink-0 mt-0.5">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
