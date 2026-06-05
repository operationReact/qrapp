import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { liveOrdersAdminOptions } from "@/query/options/orders";
import { updateAdminOrder } from "@/services/order-service";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import {
  CaretRightIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  CookingPotIcon,
  PackageIcon,
  WarningCircleIcon,
  ArrowCounterClockwiseIcon,
  BroadcastIcon,
} from "@phosphor-icons/react";

// ── Constants ──────────────────────────────────────────────────────────────
const STAGES = [
  {
    key: "PLACED",
    label: "New Orders",
    shortLabel: "New",
    icon: PackageIcon,
    headerBg: "bg-amber-50 border-amber-200",
    iconBg: "bg-amber-100 text-amber-700",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    cardBorder: "border-amber-200",
    emptyText: "No new orders",
    dot: "bg-amber-400",
  },
  {
    key: "PREPARING",
    label: "Preparing",
    shortLabel: "Cooking",
    icon: CookingPotIcon,
    headerBg: "bg-sky-50 border-sky-200",
    iconBg: "bg-sky-100 text-sky-700",
    badge: "bg-sky-100 text-sky-800 border-sky-200",
    cardBorder: "border-sky-200",
    emptyText: "Nothing cooking",
    dot: "bg-sky-400",
  },
  {
    key: "READY",
    label: "Ready",
    shortLabel: "Ready",
    icon: CheckCircleIcon,
    headerBg: "bg-emerald-50 border-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    cardBorder: "border-emerald-200",
    emptyText: "Nothing ready yet",
    dot: "bg-emerald-400",
  },
];

function useElapsed(createdAt) {
  const [mins, setMins] = useState(() =>
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000),
  );
  useEffect(() => {
    const id = setInterval(
      () =>
        setMins(Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)),
      30000,
    );
    return () => clearInterval(id);
  }, [createdAt]);
  return mins;
}

function ElapsedBadge({ createdAt, stageAgeMinutes, delayed }) {
  const totalMins = useElapsed(createdAt);
  const isWarn  = stageAgeMinutes >= 10 && stageAgeMinutes < 20;
  const isAlert = stageAgeMinutes >= 20 || delayed;

  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        isAlert ? "bg-rose-100 text-rose-700" :
        isWarn  ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-600",
      )}
    >
      <ClockCountdownIcon weight={isAlert ? "fill" : "regular"} className="size-3" />
      {stageAgeMinutes}m in stage · {totalMins}m total
      {isAlert && <WarningCircleIcon weight="fill" className="size-3 ml-0.5" />}
    </span>
  );
}

// ── Veg dot ───────────────────────────────────────────────────────────────
function VegDot({ isVeg }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 h-3 w-3 rounded-sm border-2 items-center justify-center mt-0.5",
        isVeg ? "border-green-600" : "border-red-500",
      )}
    >
      <span className={cn("block h-1.5 w-1.5 rounded-full", isVeg ? "bg-green-600" : "bg-red-500")} />
    </span>
  );
}

// ── Single order card ──────────────────────────────────────────────────────
function KitchenCard({ order, stageMeta, onAction }) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border shadow-sm flex flex-col gap-3 p-4 transition-all",
        order.delayed ? "border-rose-300 shadow-rose-100 ring-1 ring-rose-300" : stageMeta.cardBorder,
      )}
    >
      {/* ── Header row ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-extrabold leading-none text-gray-900">
              {order.orderNumber ?? `#${order.id}`}
            </span>
          </div>
          <span className="text-[12px] text-gray-400 mt-0.5">{order.userName ? `${order.userName} · ${order.phone}` : order.phone}</span>
        </div>
        <span className="shrink-0 text-[13px] font-bold text-gray-700">
          ₹{Number(order.total).toFixed(0)}
        </span>
      </div>

      {/* ── Elapsed time ── */}
      <ElapsedBadge
        createdAt={order.createdAt}
        stageAgeMinutes={order.stageAgeMinutes ?? 0}
        delayed={order.delayed}
      />

      {/* ── Items list — full, not truncated ── */}
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 divide-y divide-gray-100">
        {(order.items || []).map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2">
            <VegDot isVeg={item.isVeg} />
            <span className="flex-1 text-[13px] font-medium text-gray-800 leading-snug">
              {item.name}
            </span>
            <span className="shrink-0 text-[13px] font-bold text-gray-900">
              ×{item.quantity}
            </span>
          </div>
        ))}
        {(!order.items || order.items.length === 0) && (
          <div className="px-3 py-2 text-[12px] text-gray-400 italic">No items</div>
        )}
      </div>

      {/* ── Action buttons ── */}
      {order.availableTransitions?.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {order.availableTransitions.slice(0, 2).map((nextStatus) => {
            const next = STAGES.find((s) => s.key === nextStatus);
            const isPrimary = order.availableTransitions.indexOf(nextStatus) === 0;
            return (
              <Button
                key={nextStatus}
                size="sm"
                variant={isPrimary ? "default" : "outline"}
                className={cn("flex-1 gap-1.5 h-10 rounded-xl font-semibold text-sm")}
                onClick={() => onAction(order.id, nextStatus)}
              >
                {next?.icon && <next.icon weight="bold" className="size-4" />}
                {next ? next.label : nextStatus}
                <CaretRightIcon weight="bold" className="size-3.5" />
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────
function KitchenColumn({ stage, orders, onAction, loading }) {
  const Icon = stage.icon;
  return (
    <div className="flex flex-col gap-3">
      {/* Column header */}
      <div
        className={cn(
          "flex items-center justify-between rounded-2xl border px-4 py-3",
          stage.headerBg,
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", stage.iconBg)}>
            <Icon weight="bold" className="size-4" />
          </span>
          <span className="font-bold text-gray-900">{stage.label}</span>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[12px] font-bold border",
            stage.badge,
          )}
        >
          {loading ? "—" : orders.length}
        </span>
      </div>

      {/* Cards */}
      {loading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100" />
        ))
      ) : orders.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
          <Icon className="size-6 opacity-40" />
          <span className="text-[12px]">{stage.emptyText}</span>
        </div>
      ) : (
        orders.map((order) => (
          <KitchenCard
            key={order.id}
            order={order}
            stageMeta={stage}
            onAction={onAction}
          />
        ))
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/admin/(orders)/kitchen-queue")({
  component: KitchenQueuePage,
});

function KitchenQueuePage() {
  const { isAdmin, isSuperUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("PLACED");
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const intervalRef = useRef(null);

  // ── Live orders query — refetches every 15 s automatically ──
  const { data: liveOrders = [], isLoading, isFetching } = useQuery({
    ...liveOrdersAdminOptions(50),
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    onSuccess: () => setLastRefreshed(new Date()),
  });

  // ── Update mutation ──
  const mutation = useMutation({
    mutationFn: ({ orderId, status }) => updateAdminOrder(orderId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "admin", "live"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
    },
  });

  const handleAction = (orderId, status) => mutation.mutate({ orderId, status });

  const manualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["orders", "admin", "live"] });
    setLastRefreshed(new Date());
  };

  // ── Group orders by status ──
  const grouped = STAGES.reduce((acc, s) => {
    acc[s.key] = liveOrders.filter((o) => String(o.status).includes(s.key));
    return acc;
  }, {});

  const totalLive = liveOrders.length;
  const activeStage = STAGES.find((s) => s.key === activeTab);

  if (!isAdmin && !isSuperUser) {
    return <Navigate to="/login" replace />;
  }

  const refreshedStr = lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col min-h-0">
      <AdminHeader
        title="Kitchen Queue"
        description="Live order stream for kitchen staff. Auto-refreshes every 15 seconds."
        actions={
          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">
                {totalLive} live
              </span>
            </div>

            {/* Last refreshed */}
            <span className="hidden sm:block text-[11px] text-gray-400">
              Updated {refreshedStr}
            </span>

            {/* Manual refresh */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-xl text-xs"
              onClick={manualRefresh}
              disabled={isFetching}
            >
              <ArrowCounterClockwiseIcon
                weight="bold"
                className={cn("size-3.5", isFetching && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        }
      />

      {/* ── Mobile tab switcher (hidden on lg) ── */}
      <div className="lg:hidden sticky top-0 z-10 bg-white border-b px-4 pt-3 pb-0">
        <div className="flex gap-1">
          {STAGES.map((s) => {
            const count = grouped[s.key]?.length ?? 0;
            const isActive = activeTab === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActiveTab(s.key)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 pb-2 pt-1 border-b-2 transition-colors text-[12px] font-semibold",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-400 hover:text-gray-600",
                )}
              >
                <div className="flex items-center gap-1">
                  {s.shortLabel}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0 text-[10px] font-bold",
                      count > 0
                        ? isActive ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
                        : "bg-gray-100 text-gray-400",
                    )}
                  >
                    {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pb-6 pt-4 overflow-y-auto">
        {/* Mobile: single active column */}
        <div className="lg:hidden">
          {activeStage && (
            <KitchenColumn
              stage={activeStage}
              orders={grouped[activeStage.key] ?? []}
              onAction={handleAction}
              loading={isLoading}
            />
          )}
        </div>

        {/* Desktop: 3-column grid */}
        <div className="hidden lg:grid grid-cols-3 gap-5">
          {STAGES.map((stage) => (
            <KitchenColumn
              key={stage.key}
              stage={stage}
              orders={grouped[stage.key] ?? []}
              onAction={handleAction}
              loading={isLoading}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

