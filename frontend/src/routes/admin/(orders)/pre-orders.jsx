import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import PreOrderCard from "@/components/admin/PreOrderCard";
import CreatePreOrderDialog from "@/components/admin/CreatePreOrderDialog";
import { adminPreOrdersOptions, adminPreOrderDashboardOptions } from "@/query/options/orders";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  CalendarCheckIcon,
  ClockCountdownIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  BroadcastIcon,
  WarningCircleIcon,
  ArrowsClockwiseIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/(orders)/pre-orders")({
  component: PreOrdersPage,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

function formatGroupDate(dt) {
  if (!dt) return "Unscheduled";
  const d = new Date(dt);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, tone }) {
  const StatIcon = icon;
  return (
    <div className={cn("rounded-xl border flex flex-col gap-1.5 p-4 relative overflow-hidden", tone.bg)}>
      <span className={cn("absolute right-3 top-3 size-7 grid place-items-center rounded-lg", tone.icon)}>
        <StatIcon weight="fill" className="size-4" />
      </span>
      <div className={cn("text-2xl font-bold", tone.text)}>{value}</div>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
    </div>
  );
}

// ── Status filter config ───────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PRE_ORDERED" },
  { label: "Accepted", value: "ORDER_PLACED" },
  { label: "Preparing", value: "PREPARING" },
  { label: "Ready", value: "READY" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

// ── Main page ─────────────────────────────────────────────────────────────────
function PreOrdersPage() {
  const qc = useQueryClient();
  const [activeStatus, setActiveStatus] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const params = useMemo(() => {
    const p = { size: 100 };
    if (activeStatus) p.status = activeStatus;
    if (search.trim()) p.query = search.trim();
    return p;
  }, [activeStatus, search]);

  const { data: preOrdersPage, isLoading } = useQuery(adminPreOrdersOptions(params));
  const { data: dashboard, isLoading: dashLoading } = useQuery(adminPreOrderDashboardOptions(12));

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["pre-orders", "admin"] });
  }, [qc]);

  const preOrders = useMemo(() => preOrdersPage?.content ?? [], [preOrdersPage]);

  // Group orders by scheduled date
  const grouped = useMemo(() => {
    if (!preOrders.length) return [];
    const map = new Map();
    for (const o of preOrders) {
      const key = o.scheduledAt
        ? new Date(o.scheduledAt).toDateString()
        : "__unscheduled__";
      if (!map.has(key)) map.set(key, { key, date: o.scheduledAt, orders: [] });
      map.get(key).orders.push(o);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });
  }, [preOrders]);

  const dash = dashboard ?? {
    totalPreOrders: 0,
    todayPreOrders: 0,
    tomorrowPreOrders: 0,
    pendingPreOrders: 0,
    acceptedPreOrders: 0,
    overduePreOrders: 0,
    cancelledPreOrders: 0,
  };

  const stats = [
    { label: "Total Pre-Orders", value: dash.totalPreOrders, icon: CalendarCheckIcon, tone: { bg: "bg-violet-50", icon: "bg-violet-100 text-violet-600", text: "text-violet-700" } },
    { label: "Today", value: dash.todayPreOrders, icon: CalendarCheckIcon, tone: { bg: "bg-amber-50", icon: "bg-amber-100 text-amber-600", text: "text-amber-700" } },
    { label: "Tomorrow", value: dash.tomorrowPreOrders, icon: BroadcastIcon, tone: { bg: "bg-sky-50", icon: "bg-sky-100 text-sky-600", text: "text-sky-700" } },
    { label: "Pending Review", value: dash.pendingPreOrders, icon: ClockCountdownIcon, tone: { bg: "bg-zinc-50", icon: "bg-zinc-100 text-zinc-600", text: "text-zinc-700" } },
    { label: "Accepted", value: dash.acceptedPreOrders, icon: CheckCircleIcon, tone: { bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600", text: "text-emerald-700" } },
    { label: "Overdue", value: dash.overduePreOrders, icon: WarningCircleIcon, tone: { bg: dash.overduePreOrders > 0 ? "bg-red-50" : "bg-zinc-50", icon: dash.overduePreOrders > 0 ? "bg-red-100 text-red-600" : "bg-zinc-100 text-zinc-500", text: dash.overduePreOrders > 0 ? "text-red-700" : "text-zinc-500" } },
  ];

  return (
    <>
      <AdminHeader
        title="Pre-Orders"
        description="Manage scheduled orders placed in advance by customers."
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => setCreateOpen(true)}
            >
              <PlusIcon className="size-3.5" weight="bold" />
              New Pre-Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={refresh}
            >
              <ArrowsClockwiseIcon className="size-3.5" />
              Refresh
            </Button>
          </div>
        }
      />

      <CreatePreOrderDialog open={createOpen} onOpenChange={setCreateOpen} />

      <div className="px-4 py-4 space-y-5">
        {/* ── Stats grid ─────────────────────────────────────────────────── */}
        {dashLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        )}

        {/* ── Search + status filter ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by phone, order number…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground transition-all"
            />
          </div>
        </div>

        {/* ── Status tabs ─────────────────────────────────────────────────── */}
        <Tabs value={activeStatus} onValueChange={setActiveStatus}>
          <ScrollArea orientation="horizontal" className="[&_[data-orientation=vertical]]:hidden">
            <TabsList className="w-max gap-1 bg-transparent p-0">
              {STATUS_FILTERS.map((f) => {
                const count = f.value === ""
                  ? preOrders.length
                  : preOrders.filter((o) => o.status === f.value).length;
                return (
                  <TabsTrigger
                    key={f.value}
                    value={f.value}
                    className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-full px-3 h-8 text-xs font-medium gap-1.5"
                  >
                    {f.label}
                    {count > 0 && (
                      <Badge className="h-4 min-w-4 px-1 text-[10px] bg-white/25 text-current border-0">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {STATUS_FILTERS.map((f) => (
            <TabsContent key={f.value} value={f.value} className="mt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-44 rounded-xl" />
                  ))}
                </div>
              ) : grouped.length === 0 ? (
                <Empty>
                  <EmptyMedia>
                    <CalendarCheckIcon className="size-12 text-violet-300" weight="thin" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No pre-orders found</EmptyTitle>
                    <EmptyDescription>
                      {f.value === "" ? "No pre-orders have been placed yet." : `No pre-orders with status "${f.label}".`}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-6">
                  {grouped.map((group) => {
                    const groupOrders = f.value
                      ? group.orders.filter((o) => o.status === f.value)
                      : group.orders;
                    if (groupOrders.length === 0) return null;

                    const groupLabel = formatGroupDate(group.date);
                    const isPast = group.date && new Date(group.date) < new Date() &&
                      groupOrders.some((o) => o.status === "PRE_ORDERED");

                    return (
                      <section key={group.key}>
                        {/* Date group header */}
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className={cn(
                              "flex items-center gap-1.5 text-sm font-semibold rounded-full px-3 py-1 border",
                              groupLabel === "Today"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : groupLabel === "Tomorrow"
                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                : isPast
                                ? "bg-red-50 text-red-600 border-red-200"
                                : "bg-violet-50 text-violet-700 border-violet-200",
                            )}
                          >
                            <CalendarCheckIcon className="size-3.5" weight="fill" />
                            {groupLabel}
                            {isPast && (
                              <span className="ml-1 text-[10px] text-red-500">(overdue)</span>
                            )}
                          </div>
                          <div className="flex-1 h-px bg-zinc-100" />
                          <span className="text-xs text-zinc-400">{groupOrders.length} order{groupOrders.length !== 1 ? "s" : ""}</span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {groupOrders.map((order) => (
                            <PreOrderCard
                              key={order.id}
                              order={order}
                              onUpdated={refresh}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* ── Upcoming queue (from dashboard) ────────────────────────────── */}
        {!isLoading && dashboard?.upcomingQueue?.length > 0 && activeStatus === "" && search === "" && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                <ClockCountdownIcon className="size-4 text-violet-500" weight="fill" />
                Next up (pending pre-orders)
              </span>
              <div className="flex-1 h-px bg-zinc-100" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

