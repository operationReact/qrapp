import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import PreOrderCard from "@/components/admin/PreOrderCard";
import CreatePreOrderDialog from "@/components/admin/CreatePreOrderDialog";
import { adminPreOrdersOptions, adminPreOrderDashboardOptions } from "@/query/options/orders";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  CalendarCheckIcon,
  ClockCountdownIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
  ArrowsClockwiseIcon,
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

/** Assign each order to a time-window bucket */
function getTimeGroup(order) {
  if (!order.scheduledAt) return "upcoming";
  const d   = new Date(order.scheduledAt);
  const now = new Date();
  if (d < now && order.status === "PRE_ORDERED") return "overdue";
  const twoH     = new Date(now.getTime() + 2 * 3_600_000);
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (d <= twoH && isSameDay(d, now))  return "next2h";
  if (isSameDay(d, now))               return "todayLater";
  if (isSameDay(d, tomorrow))          return "tomorrow";
  return "upcoming";
}

const TIME_GROUPS = [
  { key: "overdue",    label: "Overdue",      accent: "text-red-600",    bg: "bg-red-50 border-red-200",      dot: "bg-red-500"    },
  { key: "next2h",     label: "Next 2 Hours", accent: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  dot: "bg-amber-400"  },
  { key: "todayLater", label: "Today Later",  accent: "text-sky-700",    bg: "bg-sky-50 border-sky-200",      dot: "bg-sky-400"    },
  { key: "tomorrow",   label: "Tomorrow",     accent: "text-violet-700", bg: "bg-violet-50 border-violet-200",dot: "bg-violet-500" },
  { key: "upcoming",   label: "Upcoming",     accent: "text-zinc-600",   bg: "bg-zinc-100 border-zinc-200",   dot: "bg-zinc-400"   },
];

const STATUS_FILTERS = [
  { label: "All",       value: "" },
  { label: "Pending",   value: "PRE_ORDERED" },
  { label: "Accepted",  value: "ORDER_PLACED" },
  { label: "Preparing", value: "PREPARING" },
  { label: "Ready",     value: "READY" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

// ── Summary strip (replaces 6 stat cards) ─────────────────────────────────────

function SummaryStrip({ dash, loading }) {
  const metrics = [
    {
      value: dash.pendingPreOrders, label: "Pending",
      icon: ClockCountdownIcon,
      urgent: dash.pendingPreOrders > 0,
      urgentCls: "text-violet-600",
    },
    {
      value: dash.todayPreOrders, label: "Today",
      icon: CalendarCheckIcon,
      urgent: dash.todayPreOrders > 0,
      urgentCls: "text-amber-600",
    },
    {
      value: dash.tomorrowPreOrders, label: "Tomorrow",
      icon: CalendarCheckIcon,
      urgent: false,
      urgentCls: "text-sky-600",
    },
    {
      value: dash.overduePreOrders, label: "Overdue",
      icon: WarningCircleIcon,
      urgent: dash.overduePreOrders > 0,
      urgentCls: "text-red-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex gap-2">
        {[1,2,3,4].map((i) => (
          <Skeleton key={i} className="h-[60px] w-[90px] rounded-xl flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {metrics.map((m) => {
        const Icon = m.icon;
        const active = m.urgent;
        return (
          <div
            key={m.label}
            className={cn(
              "flex-shrink-0 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 bg-white shadow-sm min-w-[88px]",
              active ? "border-zinc-200" : "border-zinc-100",
            )}
          >
            <Icon
              weight="fill"
              className={cn("size-4 flex-shrink-0", active ? m.urgentCls : "text-zinc-300")}
            />
            <div className="flex flex-col leading-none">
              <span className={cn(
                "text-[22px] font-black leading-none tabular-nums",
                active ? m.urgentCls : "text-zinc-700",
              )}>
                {m.value}
              </span>
              <span className="text-[10px] font-semibold text-zinc-400 mt-0.5 uppercase tracking-wide whitespace-nowrap">
                {m.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function PreOrdersPage() {
  const qc = useQueryClient();
  const [activeStatus, setActiveStatus] = useState("");
  const [search, setSearch]             = useState("");
  const [createOpen, setCreateOpen]     = useState(false);

  const params = useMemo(() => {
    const p = { size: 100 };
    if (activeStatus) p.status = activeStatus;
    if (search.trim()) p.query = search.trim();
    return p;
  }, [activeStatus, search]);

  const { data: preOrdersPage, isLoading }         = useQuery(adminPreOrdersOptions(params));
  const { data: dashboard,     isLoading: dashLoad } = useQuery(adminPreOrderDashboardOptions(12));

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["pre-orders", "admin"] });
  }, [qc]);

  const preOrders = useMemo(() => preOrdersPage?.content ?? [], [preOrdersPage]);

  const dash = dashboard ?? {
    totalPreOrders: 0, todayPreOrders: 0, tomorrowPreOrders: 0,
    pendingPreOrders: 0, acceptedPreOrders: 0, overduePreOrders: 0,
  };

  // Bucket orders into time groups
  const grouped = useMemo(() => {
    const map = Object.fromEntries(TIME_GROUPS.map((g) => [g.key, []]));
    for (const o of preOrders) map[getTimeGroup(o)].push(o);
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.scheduledAt ?? 0) - new Date(b.scheduledAt ?? 0));
    }
    return map;
  }, [preOrders]);

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <AdminHeader
        title="Pre-Orders"
        description="Scheduled orders"
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => setCreateOpen(true)}
            >
              <PlusIcon className="size-3.5" weight="bold" />
              New
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={refresh}
              title="Refresh"
            >
              <ArrowsClockwiseIcon className="size-3.5" />
            </Button>
          </div>
        }
      />

      <CreatePreOrderDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* ── Summary strip ────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4">
        <SummaryStrip dash={dash} loading={dashLoad} />
      </div>

      {/* ── Sticky filter bar ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-zinc-100 px-4 pb-3 space-y-2.5">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone, order number…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-sm outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white focus:border-violet-300 placeholder:text-zinc-400 transition-all"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((f) => {
            const count  = f.value === ""
              ? preOrders.length
              : preOrders.filter((o) => o.status === f.value).length;
            const active = activeStatus === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setActiveStatus(f.value)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 h-7 text-xs font-semibold transition-all whitespace-nowrap",
                  active
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className={cn(
                    "rounded-full px-1.5 text-[10px] leading-4 font-bold min-w-[18px] text-center",
                    active ? "bg-white/25 text-white" : "bg-zinc-200 text-zinc-500",
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Order list ───────────────────────────────────────────────────── */}
      <div className="px-4 py-4 space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[188px] rounded-2xl" />
            ))}
          </div>
        ) : preOrders.length === 0 ? (
          <Empty>
            <EmptyMedia>
              <CalendarCheckIcon className="size-12 text-violet-300" weight="thin" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No pre-orders found</EmptyTitle>
              <EmptyDescription>
                {activeStatus === ""
                  ? "No pre-orders have been placed yet."
                  : "No orders match this filter."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          TIME_GROUPS.map((grp) => {
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
                  <div className="flex-1 h-px bg-zinc-100" />
                  <span className="text-xs text-zinc-400 font-medium tabular-nums">
                    {orders.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {orders.map((order) => (
                    <PreOrderCard key={order.id} order={order} onUpdated={refresh} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}

