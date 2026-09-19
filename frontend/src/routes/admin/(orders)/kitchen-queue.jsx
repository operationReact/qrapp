import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { liveOrdersAdminOptions } from "@/query/options/orders";
import { updateAdminOrder } from "@/services/order-service";
import { useAuth } from "@/context/AuthContext";
import { cn, isOrderPaid, formatAge } from "@/lib/utils";
import { useState, useMemo } from "react";
import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  CaretRightIcon,
  CookingPotIcon,
  ClockCountdownIcon,
  WarningCircleIcon,
  HandWavingIcon,
  SmileyIcon,
} from "@phosphor-icons/react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getStatusKey(status) {
  const s = String(status ?? "").toUpperCase();
  if (s.includes("PLACED")) return "PLACED";
  if (s.includes("PREPARING")) return "PREPARING";
  if (s.includes("READY")) return "READY";
  return null;
}

// Maps current stage → single "next primary action"
const NEXT_ACTION = {
  PLACED:    { status: "PREPARING", label: "Start Preparing", Icon: CookingPotIcon },
  PREPARING: { status: "READY",     label: "Mark Ready",      Icon: CheckCircleIcon },
  READY:     { status: "COMPLETED", label: "Hand Over",        Icon: HandWavingIcon },
};

// Visual config per status key
const STATUS_STYLE = {
  PLACED: {
    label:      "New",
    chipCls:    "bg-violet-100 text-violet-700 border-violet-200",
    dot:        "bg-violet-500",
    btnCls:     "bg-violet-600 active:bg-violet-700 text-white",
    statsBg:    "bg-violet-50",
    statsNum:   "text-violet-700",
    statsLabel: "text-violet-400",
  },
  PREPARING: {
    label:      "Preparing",
    chipCls:    "bg-orange-100 text-orange-700 border-orange-200",
    dot:        "bg-orange-500",
    btnCls:     "bg-orange-500 active:bg-orange-600 text-white",
    statsBg:    "bg-orange-50",
    statsNum:   "text-orange-700",
    statsLabel: "text-orange-400",
  },
  READY: {
    label:      "Ready",
    chipCls:    "bg-green-100 text-green-700 border-green-200",
    dot:        "bg-green-500",
    btnCls:     "bg-green-600 active:bg-green-700 text-white",
    statsBg:    "bg-green-50",
    statsNum:   "text-green-700",
    statsLabel: "text-green-400",
  },
};

const FILTER_LIST = [
  { key: "ALL",       label: "All" },
  { key: "PLACED",    label: "New" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY",     label: "Ready" },
  { key: "DELAYED",   label: "Delayed" },
  { key: "PAID",      label: "Paid" },
  { key: "UNPAID",    label: "Unpaid" },
];


// ─────────────────────────────────────────────────────────────────────────────
// VegDot
// ─────────────────────────────────────────────────────────────────────────────
function VegDot({ isVeg }) {
  return (
    <span
      className={cn(
        "shrink-0 inline-flex h-3 w-3 rounded-sm border-2 items-center justify-center mt-px",
        isVeg ? "border-green-600" : "border-red-500",
      )}
    >
      <span className={cn("block h-1.5 w-1.5 rounded-full", isVeg ? "bg-green-600" : "bg-red-500")} />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderCard
// ─────────────────────────────────────────────────────────────────────────────
function OrderCard({ order, onAction, isPending }) {
  const stageKey  = getStatusKey(order.status);
  const nextAction = NEXT_ACTION[stageKey];
  const style      = STATUS_STYLE[stageKey];
  const isDelayed  = order.delayed;
  const isPaid     = isOrderPaid(order);

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border overflow-hidden transition-opacity",
        isDelayed ? "border-red-300 ring-1 ring-red-200" : "border-gray-100 shadow-sm",
        isPending && "opacity-60",
      )}
    >
      {/* Colored top strip */}
      <div className={cn("h-[3px] w-full", isDelayed ? "bg-red-500" : (style?.dot ?? "bg-gray-200"))} />

      <div className="px-3.5 pt-3 pb-3.5 flex flex-col gap-2.5">

        {/* ── Row 1: Order ID + Status chip + Time badge ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="min-w-0 break-words text-[15px] font-black text-gray-900 tracking-tight leading-tight">
            {order.orderNumber ?? `#${order.id}`}
          </span>

          {isDelayed ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border bg-red-100 text-red-700 border-red-200">
              <WarningCircleIcon weight="fill" className="size-3" />
              Delayed
            </span>
          ) : style ? (
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border", style.chipCls)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
              {style.label}
            </span>
          ) : null}

          {/* Time in stage */}
          <span
            className={cn(
              "ml-auto shrink-0 flex items-center gap-0.5 text-[11px] font-semibold tabular-nums rounded-full px-2 py-0.5",
              isDelayed
                ? "bg-red-100 text-red-700"
                : (order.stageAgeMinutes ?? 0) >= 10
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-500",
            )}
          >
            <ClockCountdownIcon weight={isDelayed ? "fill" : "regular"} className="size-3" />
            {formatAge(order.stageAgeMinutes)}
          </span>
        </div>

        {/* ── Row 2: Items (primary content) ── */}
        <div className="space-y-1.5">
          {(order.items ?? []).map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <VegDot isVeg={item.isVeg} />
              <span className="min-w-0 flex-1 break-words text-[13px] font-semibold text-gray-800 leading-tight">
                {item.name}
              </span>
              <span className="shrink-0 text-[12px] font-bold text-gray-400 tabular-nums">
                ×{item.quantity}
              </span>
            </div>
          ))}
          {(!order.items || order.items.length === 0) && (
            <span className="text-[12px] text-gray-400 italic">No items</span>
          )}
        </div>

        {/* ── Row 3: Customer + Amount + Payment (secondary) ── */}
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-50">
          <span className="min-w-0 flex-1 break-words text-[11px] text-gray-400">
            {order.userName
              ? `${order.userName}${order.phone ? ` · ${order.phone}` : ""}`
              : (order.phone ?? "Guest")}
          </span>
          <span className="text-[12px] font-bold text-gray-700 shrink-0">
            ₹{Number(order.total ?? 0).toFixed(0)}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold border",
              isPaid
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200",
            )}
          >
            {isPaid ? "Paid" : "Unpaid"}
          </span>
        </div>

        {/* ── Action Button (next valid step only) ── */}
        {nextAction && (
          <button
            onClick={() => !isPending && onAction(order.id, nextAction.status)}
            disabled={isPending}
            className={cn(
              "w-full flex items-center gap-2 rounded-xl py-3 px-4 text-[13px] font-bold transition-all select-none",
              isDelayed
                ? "bg-red-600 active:bg-red-700 text-white"
                : (style?.btnCls ?? "bg-gray-700 text-white"),
              isPending && "opacity-50 cursor-not-allowed",
            )}
          >
            <nextAction.Icon weight="bold" className="size-4 shrink-0" />
            <span className="flex-1 text-left">{nextAction.label}</span>
            <CaretRightIcon weight="bold" className="size-3.5 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NeedsAttentionBanner — sticky top of content scroll area
// ─────────────────────────────────────────────────────────────────────────────
function NeedsAttentionBanner({ orders, onAction, pendingId }) {
  const [open, setOpen] = useState(true);
  if (!orders.length) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/90 overflow-hidden mb-3 sticky top-0 z-10 backdrop-blur-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left active:bg-red-100/50 transition-colors"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <span className="flex-1 text-[12px] font-black text-red-700 uppercase tracking-wider">
          Needs Attention
        </span>
        <span className="rounded-full bg-red-500 text-white text-[10px] font-black px-2 py-0.5 leading-none">
          {orders.length}
        </span>
        <span className="text-red-400 text-[11px] font-bold">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAction={onAction}
              isPending={pendingId === order.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterChips
// ─────────────────────────────────────────────────────────────────────────────
const FILTER_ACTIVE_CLS = {
  ALL:       "bg-gray-900  border-gray-900  text-white",
  PLACED:    "bg-violet-600 border-violet-600 text-white",
  PREPARING: "bg-orange-500 border-orange-500 text-white",
  READY:     "bg-green-600  border-green-600  text-white",
  DELAYED:   "bg-red-600    border-red-600    text-white",
  PAID:      "bg-gray-900  border-gray-900  text-white",
  UNPAID:    "bg-gray-900  border-gray-900  text-white",
};

function FilterChips({ active, onChange, counts }) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-0.5"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
    >
      {FILTER_LIST.map((f) => {
        const count    = counts[f.key] ?? 0;
        const isActive = active === f.key;
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={cn(
              "shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold border transition-all whitespace-nowrap",
              isActive
                ? FILTER_ACTIVE_CLS[f.key]
                : f.key === "DELAYED" && count > 0
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-white border-gray-200 text-gray-600",
            )}
          >
            {f.label}
            {count > 0 && (
              <span
                className={cn(
                  "rounded-full text-[10px] font-black px-1.5 py-0.5 leading-none",
                  isActive
                    ? "bg-white/25 text-inherit"
                    : f.key === "DELAYED"
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-500",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/admin/(orders)/kitchen-queue")({
  component: KitchenQueuePage,
});

function KitchenQueuePage() {
  const { isAdmin, isSuperUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [pendingId, setPendingId] = useState(null);

  // ── Live query — auto-refetches every 15 s ──
  const { data: liveOrders = [], isLoading, isFetching } = useQuery({
    ...liveOrdersAdminOptions(50),
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  // ── Update mutation ──
  const mutation = useMutation({
    mutationFn: ({ orderId, status }) => updateAdminOrder(orderId, { status }),
    onMutate:   ({ orderId }) => setPendingId(orderId),
    onSettled:  () => setPendingId(null),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "admin", "live"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
    },
  });

  const handleAction  = (orderId, status) => mutation.mutate({ orderId, status });
  const manualRefresh = () => queryClient.invalidateQueries({ queryKey: ["orders", "admin", "live"] });

  // ── Derived data ──
  const nonPreOrders = useMemo(
    () => liveOrders.filter((o) => !o.preOrder),
    [liveOrders],
  );

  const delayedOrders = useMemo(
    () => nonPreOrders.filter((o) => o.delayed),
    [nonPreOrders],
  );

  const counts = useMemo(() => ({
    ALL:       nonPreOrders.length,
    PLACED:    nonPreOrders.filter((o) => getStatusKey(o.status) === "PLACED").length,
    PREPARING: nonPreOrders.filter((o) => getStatusKey(o.status) === "PREPARING").length,
    READY:     nonPreOrders.filter((o) => getStatusKey(o.status) === "READY").length,
    DELAYED:   delayedOrders.length,
    PAID:      nonPreOrders.filter((o) => isOrderPaid(o)).length,
    UNPAID:    nonPreOrders.filter((o) => !isOrderPaid(o)).length,
  }), [nonPreOrders, delayedOrders]);

  const filteredOrders = useMemo(() => {
    switch (activeFilter) {
      case "DELAYED":   return delayedOrders;
      case "PAID":      return nonPreOrders.filter((o) => String(o.paymentStatus ?? "").toUpperCase() === "PAID");
      case "UNPAID":    return nonPreOrders.filter((o) => String(o.paymentStatus ?? "").toUpperCase() !== "PAID");
      case "PLACED":
      case "PREPARING":
      case "READY":     return nonPreOrders.filter((o) => getStatusKey(o.status) === activeFilter);
      default:          return nonPreOrders;
    }
  }, [nonPreOrders, delayedOrders, activeFilter]);

  // Show attention banner only when NOT already filtering by DELAYED
  const attentionOrders = useMemo(
    () => (activeFilter === "DELAYED" ? [] : delayedOrders),
    [delayedOrders, activeFilter],
  );

  if (!isAdmin && !isSuperUser) {
    return <Navigate to="/login" replace />;
  }

  // ── Summary stats chips ──
  const STATS = [
    {
      key:    "PLACED",
      label:  "New",
      bg:     "bg-violet-50",
      numCls: "text-violet-700",
      lblCls: "text-violet-400",
    },
    {
      key:    "PREPARING",
      label:  "Cooking",
      bg:     "bg-orange-50",
      numCls: "text-orange-700",
      lblCls: "text-orange-400",
    },
    {
      key:    "READY",
      label:  "Ready",
      bg:     "bg-green-50",
      numCls: "text-green-700",
      lblCls: "text-green-400",
    },
    {
      key:    "DELAYED",
      label:  "Delayed",
      bg:     delayedOrders.length > 0 ? "bg-red-50"  : "bg-gray-50",
      numCls: delayedOrders.length > 0 ? "text-red-700" : "text-gray-300",
      lblCls: delayedOrders.length > 0 ? "text-red-400" : "text-gray-300",
    },
  ];

  const emptyLabel = activeFilter === "ALL"
    ? "Queue is clear"
    : `No ${FILTER_LIST.find((f) => f.key === activeFilter)?.label ?? ""} orders`;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col bg-gray-50">

      {/* ════════════════════════════════════════════════════
          Sticky header — title + stats chips + filter chips
          ════════════════════════════════════════════════════ */}
      <div className="bg-white border-b sticky top-0 z-20 px-4 pt-3 pb-3 space-y-3">

        {/* ── Title row ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-black text-gray-900 tracking-tight">
              Kitchen Queue
            </span>
            {/* Live pulse while fetching */}
            {isFetching && !isLoading && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>

          <button
            onClick={manualRefresh}
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

        {/* ── Compact status summary chips (tap to filter) ── */}
        <div className="grid grid-cols-4 gap-2">
          {STATS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveFilter(s.key)}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl py-2 px-1 transition-all active:scale-95",
                s.bg,
                activeFilter === s.key && "ring-2 ring-current ring-offset-1",
              )}
            >
              <span className={cn("text-[20px] font-black leading-none tabular-nums", s.numCls)}>
                {isLoading ? "—" : counts[s.key]}
              </span>
              <span className={cn("text-[10px] font-semibold mt-0.5 leading-none", s.lblCls)}>
                {s.label}
              </span>
            </button>
          ))}
        </div>

        {/* ── Inline filter chips ── */}
        <FilterChips active={activeFilter} onChange={setActiveFilter} counts={counts} />
      </div>

      {/* ════════════════════════════════════════════════════
          Scrollable content
          ════════════════════════════════════════════════════ */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] [touch-action:pan-y]">

        {/* Needs Attention — sticky within scroll area */}
        {!isLoading && attentionOrders.length > 0 && (
          <NeedsAttentionBanner
            orders={attentionOrders}
            onAction={handleAction}
            pendingId={pendingId}
          />
        )}

        {/* Main order list */}
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-gray-200" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <SmileyIcon weight="thin" className="size-14 text-gray-300" />
            <span className="text-[13px] font-semibold text-gray-400">{emptyLabel}</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={handleAction}
                isPending={pendingId === order.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
