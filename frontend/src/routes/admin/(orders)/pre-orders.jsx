import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import PreOrderCard from "@/components/admin/PreOrderCard";
import CreatePreOrderDialog from "@/components/admin/CreatePreOrderDialog";
import { adminPreOrdersOptions, adminPreOrderDashboardOptions } from "@/query/options/orders";
import {
  CalendarCheckIcon,
  MagnifyingGlassIcon,
  ArrowCounterClockwiseIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/(orders)/pre-orders")({
  component: PreOrdersPage,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

function isOverdue(order) {
  return order.status === "PRE_ORDERED" && order.scheduledAt && new Date(order.scheduledAt) < new Date();
}

function getTimeGroup(order) {
  if (!order.scheduledAt) return "upcoming";
  const d   = new Date(order.scheduledAt);
  const now = new Date();
  if (isOverdue(order)) return "overdue";
  const twoH     = new Date(now.getTime() + 2 * 3_600_000);
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (d <= twoH && isSameDay(d, now))  return "next2h";
  if (isSameDay(d, now))               return "todayLater";
  if (isSameDay(d, tomorrow))          return "tomorrow";
  return "upcoming";
}

const TIME_GROUPS = [
  { key: "overdue",    label: "Overdue",      accent: "text-red-600",    bg: "bg-red-50 border-red-200",       dot: "bg-red-500"    },
  { key: "next2h",     label: "Next 2 Hours", accent: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400"  },
  { key: "todayLater", label: "Today Later",  accent: "text-sky-700",    bg: "bg-sky-50 border-sky-200",       dot: "bg-sky-400"    },
  { key: "tomorrow",   label: "Tomorrow",     accent: "text-violet-700", bg: "bg-violet-50 border-violet-200", dot: "bg-violet-500" },
  { key: "upcoming",   label: "Upcoming",     accent: "text-zinc-600",   bg: "bg-zinc-100 border-zinc-200",    dot: "bg-zinc-400"   },
];

const FILTER_LIST = [
  { key: "ALL",          label: "All"       },
  { key: "OVERDUE",      label: "Overdue"   },
  { key: "PRE_ORDERED",  label: "Pending"   },
  { key: "ORDER_PLACED", label: "Accepted"  },
  { key: "PREPARING",    label: "Preparing" },
  { key: "READY",        label: "Ready"     },
  { key: "COMPLETED",    label: "Completed" },
  { key: "CANCELLED",    label: "Cancelled" },
];

const FILTER_ACTIVE_CLS = {
  ALL:          "bg-gray-900  border-gray-900  text-white",
  OVERDUE:      "bg-red-600   border-red-600   text-white",
  PRE_ORDERED:  "bg-violet-600 border-violet-600 text-white",
  ORDER_PLACED: "bg-amber-500 border-amber-500 text-white",
  PREPARING:    "bg-orange-500 border-orange-500 text-white",
  READY:        "bg-green-600 border-green-600 text-white",
  COMPLETED:    "bg-gray-900  border-gray-900  text-white",
  CANCELLED:    "bg-gray-900  border-gray-900  text-white",
};

// ── Page ──────────────────────────────────────────────────────────────────────

function PreOrdersPage() {
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [search, setSearch]             = useState("");
  const [createOpen, setCreateOpen]     = useState(false);

  const params = useMemo(() => {
    const p = { size: 100 };
    if (search.trim()) p.query = search.trim();
    return p;
  }, [search]);

  const { data: preOrdersPage, isLoading, isFetching } = useQuery({
    ...adminPreOrdersOptions(params),
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  const { data: dashboard, isLoading: dashLoad } = useQuery(adminPreOrderDashboardOptions(12));

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["pre-orders", "admin"] });
  }, [qc]);

  const allOrders = useMemo(() => preOrdersPage?.content ?? [], [preOrdersPage]);

  const dash = dashboard ?? {
    pendingPreOrders: 0, todayPreOrders: 0, tomorrowPreOrders: 0, overduePreOrders: 0,
  };

  // ── Filter counts ──
  const counts = useMemo(() => ({
    ALL:          allOrders.length,
    OVERDUE:      allOrders.filter(isOverdue).length,
    PRE_ORDERED:  allOrders.filter((o) => o.status === "PRE_ORDERED").length,
    ORDER_PLACED: allOrders.filter((o) => o.status === "ORDER_PLACED").length,
    PREPARING:    allOrders.filter((o) => o.status === "PREPARING").length,
    READY:        allOrders.filter((o) => o.status === "READY").length,
    COMPLETED:    allOrders.filter((o) => o.status === "COMPLETED").length,
    CANCELLED:    allOrders.filter((o) => o.status === "CANCELLED").length,
  }), [allOrders]);

  // ── Filtered list ──
  const filteredOrders = useMemo(() => {
    if (activeFilter === "OVERDUE")  return allOrders.filter(isOverdue);
    if (activeFilter !== "ALL")      return allOrders.filter((o) => o.status === activeFilter);
    return allOrders;
  }, [allOrders, activeFilter]);

  // ── Time groups (only used in ALL view) ──
  const grouped = useMemo(() => {
    const map = Object.fromEntries(TIME_GROUPS.map((g) => [g.key, []]));
    for (const o of filteredOrders) map[getTimeGroup(o)].push(o);
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.scheduledAt ?? 0) - new Date(b.scheduledAt ?? 0));
    }
    return map;
  }, [filteredOrders]);

  // ── Summary stats (4-grid, same as Kitchen Queue) ──
  const STATS = [
    {
      key: "PRE_ORDERED", label: "Pending",
      count: dashLoad ? null : dash.pendingPreOrders,
      bg:     dash.pendingPreOrders > 0 ? "bg-violet-50" : "bg-gray-50",
      numCls: dash.pendingPreOrders > 0 ? "text-violet-700" : "text-gray-300",
      lblCls: dash.pendingPreOrders > 0 ? "text-violet-400" : "text-gray-300",
    },
    {
      key: "TODAY", label: "Today",
      count: dashLoad ? null : dash.todayPreOrders,
      bg:     dash.todayPreOrders > 0 ? "bg-amber-50" : "bg-gray-50",
      numCls: dash.todayPreOrders > 0 ? "text-amber-700" : "text-gray-300",
      lblCls: dash.todayPreOrders > 0 ? "text-amber-400" : "text-gray-300",
    },
    {
      key: "TOMORROW", label: "Tomorrow",
      count: dashLoad ? null : dash.tomorrowPreOrders,
      bg:     dash.tomorrowPreOrders > 0 ? "bg-sky-50" : "bg-gray-50",
      numCls: dash.tomorrowPreOrders > 0 ? "text-sky-700" : "text-gray-300",
      lblCls: dash.tomorrowPreOrders > 0 ? "text-sky-400" : "text-gray-300",
    },
    {
      key: "OVERDUE", label: "Overdue",
      count: dashLoad ? null : dash.overduePreOrders,
      bg:     dash.overduePreOrders > 0 ? "bg-red-50" : "bg-gray-50",
      numCls: dash.overduePreOrders > 0 ? "text-red-700" : "text-gray-300",
      lblCls: dash.overduePreOrders > 0 ? "text-red-400" : "text-gray-300",
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50">

      {/* ════════════════════════════════════════════════════
          Sticky header
          ════════════════════════════════════════════════════ */}
      <div className="bg-white border-b sticky top-0 z-20 px-4 pt-3 pb-3 space-y-3">

        {/* ── Title row ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-black text-gray-900 tracking-tight">Pre-Orders</span>
            {isFetching && !isLoading && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white active:bg-violet-700 transition-colors"
            >
              <PlusIcon weight="bold" className="size-3.5" />
              New
            </button>
            <button
              onClick={refresh}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-[12px] font-semibold text-gray-600 active:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <ArrowCounterClockwiseIcon
                weight="bold"
                className={cn("size-3.5", isFetching && "animate-spin")}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* ── 4-stat summary grid (tap to filter) ── */}
        <div className="grid grid-cols-4 gap-2">
          {STATS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveFilter(s.key === "TODAY" || s.key === "TOMORROW" ? "ALL" : s.key)}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl py-2 px-1 transition-all active:scale-95",
                s.bg,
                activeFilter === s.key && "ring-2 ring-current ring-offset-1",
              )}
            >
              <span className={cn("text-[20px] font-black leading-none tabular-nums", s.numCls)}>
                {s.count ?? "—"}
              </span>
              <span className={cn("text-[10px] font-semibold mt-0.5 leading-none", s.lblCls)}>
                {s.label}
              </span>
            </button>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="relative">
          <MagnifyingGlassIcon
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone, order number…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white focus:border-violet-300 placeholder:text-gray-400 transition-all"
          />
        </div>

        {/* ── Filter chips ── */}
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {FILTER_LIST.map((f) => {
            const count    = counts[f.key] ?? 0;
            const isActive = activeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={cn(
                  "shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold border transition-all whitespace-nowrap",
                  isActive
                    ? FILTER_ACTIVE_CLS[f.key]
                    : f.key === "OVERDUE" && count > 0
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "bg-white border-gray-200 text-gray-600",
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className={cn(
                    "rounded-full text-[10px] font-black px-1.5 py-0.5 leading-none",
                    isActive
                      ? "bg-white/25 text-inherit"
                      : f.key === "OVERDUE"
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-500",
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          Scrollable content
          ════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-24">

        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-gray-200" />
            ))}
          </div>

        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CalendarCheckIcon weight="thin" className="size-14 text-gray-300" />
            <span className="text-[13px] font-semibold text-gray-400">
              {activeFilter === "ALL" ? "No pre-orders found" : "No orders match this filter"}
            </span>
          </div>

        ) : activeFilter !== "ALL" ? (
          // Flat list for filtered views
          <div className="space-y-2.5">
            {filteredOrders.map((order) => (
              <PreOrderCard key={order.id} order={order} onUpdated={refresh} />
            ))}
          </div>

        ) : (
          // Grouped by time window for ALL view
          <div className="space-y-6">
            {TIME_GROUPS.map((grp) => {
              const orders = grouped[grp.key] ?? [];
              if (!orders.length) return null;
              return (
                <section key={grp.key}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                      "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 border",
                      grp.bg, grp.accent,
                    )}>
                      <span className={cn("size-1.5 rounded-full flex-shrink-0", grp.dot)} />
                      {grp.label}
                    </div>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400 font-medium tabular-nums">{orders.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {orders.map((order) => (
                      <PreOrderCard key={order.id} order={order} onUpdated={refresh} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <CreatePreOrderDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

