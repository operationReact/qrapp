import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Filter,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { liveOrdersAdminOptions } from "@/query/options/orders";
import { updateAdminOrder } from "@/services/order-service";
import { useAuth } from "@/context/AuthContext";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { canAccessAdmin } from "@/lib/roles";
import { cn, isOrderPaid, formatAge } from "@/lib/utils";
import {
  CheckCircleIcon,
  CookingPotIcon,
  HandWavingIcon,
} from "@phosphor-icons/react";

const STATUS_META = {
  PLACED: {
    label: "New",
    rail: "border-l-violet-500",
    dot: "bg-violet-500",
    chip: "border-violet-200 bg-violet-50 text-violet-700",
    action: "bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800",
  },
  PREPARING: {
    label: "Cooking",
    rail: "border-l-orange-500",
    dot: "bg-orange-500",
    chip: "border-orange-200 bg-orange-50 text-orange-700",
    action: "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700",
  },
  READY: {
    label: "Ready",
    rail: "border-l-emerald-500",
    dot: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    action: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
  },
};

const NEXT_ACTION = {
  PLACED: { status: "PREPARING", label: "Start preparing", Icon: CookingPotIcon },
  PREPARING: { status: "READY", label: "Mark ready", Icon: CheckCircleIcon },
  READY: { status: "COMPLETED", label: "Hand over", Icon: HandWavingIcon },
};

const PRIMARY_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "PLACED", label: "New" },
  { key: "PREPARING", label: "Cooking" },
  { key: "READY", label: "Ready" },
];

const SECONDARY_FILTERS = [
  { key: "DELAYED", label: "Delayed" },
  { key: "PAID", label: "Paid" },
  { key: "UNPAID", label: "Unpaid" },
];

function getStatusKey(status) {
  const value = String(status ?? "").toUpperCase();
  if (value.includes("PLACED")) return "PLACED";
  if (value.includes("PREPARING")) return "PREPARING";
  if (value.includes("READY")) return "READY";
  return null;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatOrderNumber(order) {
  const value = order.orderNumber ?? order.id;
  return String(value).startsWith("#") ? String(value) : `#${value}`;
}

function VegDot({ isVeg }) {
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border-2",
        isVeg ? "border-emerald-600" : "border-red-500",
      )}
      role="img"
      aria-label={isVeg ? "Vegetarian item" : "Non-vegetarian item"}
    >
      <span className={cn("size-1.5 rounded-full", isVeg ? "bg-emerald-600" : "bg-red-500")} />
    </span>
  );
}

function StatusChip({ status, delayed }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {delayed && (
        <span className="inline-flex min-h-6 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
          <AlertTriangle size={12} aria-hidden="true" />
          Delayed
        </span>
      )}
      <span className={cn("inline-flex min-h-6 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide", meta.chip)}>
        <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
        {meta.label}
      </span>
    </span>
  );
}

function OrderCard({ order, onAction, isPending }) {
  const status = getStatusKey(order.status);
  const meta = STATUS_META[status];
  const nextAction = NEXT_ACTION[status];
  const ActionIcon = nextAction?.Icon;
  const delayed = Boolean(order.delayed);
  const paid = isOrderPaid(order);

  return (
    <article
      className={cn(
        "border-l-4 bg-white shadow-[0_4px_16px_rgba(24,24,27,.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(24,24,27,.07)]",
        "rounded-2xl border border-zinc-200/80",
        delayed ? "border-l-red-500 ring-1 ring-red-100" : meta?.rail,
        isPending && "opacity-70",
      )}
      aria-busy={isPending}
    >
      <div className="p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 break-words text-lg font-black leading-tight tracking-tight text-zinc-950">
                {formatOrderNumber(order)}
              </h2>
              <StatusChip status={status} delayed={delayed} />
            </div>
          </div>

          <div
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold tabular-nums",
              delayed ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-700",
            )}
            aria-label={`${formatAge(order.stageAgeMinutes)} in current stage`}
          >
            <Clock3 size={14} aria-hidden="true" />
            {formatAge(order.stageAgeMinutes)}
          </div>
        </header>

        <section className="mt-4 border-t border-zinc-100 pt-3" aria-label="Order items">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Items
          </p>
          <ul className="space-y-2">
            {(order.items ?? []).map((item, index) => (
              <li key={`${order.id}-${index}-${item.itemId ?? "item"}`} className="flex items-start gap-2">
                <span className="min-w-[2rem] text-sm font-black tabular-nums text-zinc-950">
                  {item.quantity}×
                </span>
                <VegDot isVeg={item.isVeg} />
                <span className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-zinc-800">
                  {item.name || "Menu item"}
                </span>
              </li>
            ))}
            {(!order.items || order.items.length === 0) && (
              <li className="text-sm italic text-zinc-400">No items attached</li>
            )}
          </ul>
        </section>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-zinc-100 pt-3">
          <span className="min-w-0 flex-1 break-words text-xs text-zinc-500">
            {order.userName || "Guest"}
            {order.phone && <span className="text-zinc-400"> · {order.phone}</span>}
          </span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-800">
            {formatCurrency(order.total)}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
              paid
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700",
            )}
          >
            {paid ? "Paid" : "Unpaid"}
          </span>
        </div>

        {nextAction && (
          <button
            type="button"
            onClick={() => onAction(order.id, nextAction.status)}
            disabled={isPending}
            className={cn(
              "mt-4 flex min-h-11 w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[.99] disabled:cursor-not-allowed",
              delayed ? "bg-red-600 text-white hover:bg-red-700 active:bg-red-800" : meta?.action,
            )}
            aria-label={`${nextAction.label} for ${formatOrderNumber(order)}`}
          >
            {isPending ? (
              <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <ActionIcon weight="bold" className="size-[18px]" aria-hidden="true" />
            )}
            <span className="flex-1 text-left">{isPending ? "Updating…" : nextAction.label}</span>
            {!isPending && <ArrowRight size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
    </article>
  );
}

function QueueSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5" aria-hidden="true">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded-md bg-zinc-100" />
          <div className="h-3 w-24 animate-pulse rounded-md bg-zinc-100" />
        </div>
        <div className="h-7 w-14 animate-pulse rounded-lg bg-zinc-100" />
      </div>
      <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4">
        <div className="h-3 w-10 animate-pulse rounded bg-zinc-100" />
        <div className="h-5 w-4/5 animate-pulse rounded bg-zinc-100" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="mt-5 h-11 animate-pulse rounded-xl bg-zinc-100" />
    </div>
  );
}

function FilterChip({ filter, count, active, onClick, attention }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        active
          ? "border-zinc-950 bg-zinc-950 text-white"
          : attention
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950",
      )}
    >
      {filter.label}
      <span className={cn("tabular-nums", active ? "text-white/70" : attention ? "text-red-600" : "text-zinc-400")}>
        {count}
      </span>
    </button>
  );
}

export const Route = createFileRoute("/admin/(orders)/kitchen-queue")({
  component: KitchenQueuePage,
});

function KitchenQueuePage() {
  const { user, isAdmin, isSuperUser } = useAuth();
  const { activeLocationId } = useActiveLocation();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [pendingId, setPendingId] = useState(null);

  const {
    data: liveOrders = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    ...liveOrdersAdminOptions(50, activeLocationId),
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  const mutation = useMutation({
    mutationFn: ({ orderId, status }) => updateAdminOrder(orderId, { status }, activeLocationId),
    onMutate: ({ orderId }) => setPendingId(orderId),
    onError: () => toast.error("Couldn't update the kitchen order. Try again."),
    onSettled: () => setPendingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "admin", "live"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
    },
  });

  const orders = useMemo(
    () => liveOrders.filter((order) => !order.preOrder),
    [liveOrders],
  );

  const delayedOrders = useMemo(
    () => orders.filter((order) => order.delayed),
    [orders],
  );

  const counts = useMemo(() => ({
    ALL: orders.length,
    PLACED: orders.filter((order) => getStatusKey(order.status) === "PLACED").length,
    PREPARING: orders.filter((order) => getStatusKey(order.status) === "PREPARING").length,
    READY: orders.filter((order) => getStatusKey(order.status) === "READY").length,
    DELAYED: delayedOrders.length,
    PAID: orders.filter((order) => isOrderPaid(order)).length,
    UNPAID: orders.filter((order) => !isOrderPaid(order)).length,
  }), [orders, delayedOrders]);

  const filteredOrders = useMemo(() => {
    switch (activeFilter) {
      case "DELAYED":
        return delayedOrders;
      case "PAID":
        return orders.filter((order) => isOrderPaid(order));
      case "UNPAID":
        return orders.filter((order) => !isOrderPaid(order));
      case "PLACED":
      case "PREPARING":
      case "READY":
        return orders.filter((order) => getStatusKey(order.status) === activeFilter);
      default:
        return orders;
    }
  }, [activeFilter, delayedOrders, orders]);

  if (!canAccessAdmin(user) && !isAdmin && !isSuperUser) {
    return <Navigate to="/login" replace />;
  }

  const secondaryVisible = showMoreFilters || !PRIMARY_FILTERS.some((filter) => filter.key === activeFilter);
  const emptyLabel = activeFilter === "ALL"
    ? "Kitchen is clear"
    : `No ${[...PRIMARY_FILTERS, ...SECONDARY_FILTERS].find((filter) => filter.key === activeFilter)?.label ?? ""} orders`;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col bg-[#f7f6f3]">
      <header className="sticky top-0 z-20 shrink-0 border-b border-zinc-200/80 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-zinc-950 sm:text-2xl">Kitchen</h1>
              <span className="sr-only">Kitchen Queue</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Live
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-zinc-500" aria-live="polite">
              {isFetching && !isLoading ? "Updating queue…" : `${orders.length} active ${orders.length === 1 ? "order" : "orders"}`}
              {delayedOrders.length > 0 && (
                <span className="font-bold text-red-600"> · {delayedOrders.length} need attention</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95 disabled:opacity-50"
            aria-label={isFetching ? "Updating kitchen queue" : "Refresh kitchen queue"}
            title={isFetching ? "Updating…" : "Refresh queue"}
          >
            <RefreshCw size={17} className={cn(isFetching && "animate-spin")} aria-hidden="true" />
          </button>
        </div>

        <div className={cn("mt-3 grid gap-2", delayedOrders.length > 0 ? "grid-cols-4" : "grid-cols-3")}>
          {PRIMARY_FILTERS.slice(1).map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(activeFilter === filter.key ? "ALL" : filter.key)}
              aria-pressed={activeFilter === filter.key}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center rounded-xl border px-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[.98]",
                activeFilter === filter.key
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-100 bg-zinc-50 text-zinc-800 hover:border-zinc-200",
              )}
            >
              <span className="text-lg font-black leading-none tabular-nums">{isLoading ? "—" : counts[filter.key]}</span>
              <span className={cn("mt-1 text-[10px] font-bold uppercase tracking-wide", activeFilter === filter.key ? "text-white/70" : "text-zinc-400")}>
                {filter.label}
              </span>
            </button>
          ))}
          {delayedOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === "DELAYED" ? "ALL" : "DELAYED")}
              aria-pressed={activeFilter === "DELAYED"}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center rounded-xl border px-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:scale-[.98]",
                activeFilter === "DELAYED"
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-red-100 bg-red-50 text-red-700",
              )}
            >
              <span className="text-lg font-black leading-none tabular-nums">{counts.DELAYED}</span>
              <span className={cn("mt-1 text-[10px] font-bold uppercase tracking-wide", activeFilter === "DELAYED" ? "text-white/80" : "text-red-500")}>
                Delayed
              </span>
            </button>
          )}
        </div>

        <div className="mt-3 flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-2">
              <FilterChip
                filter={PRIMARY_FILTERS[0]}
                count={counts.ALL}
                active={activeFilter === "ALL"}
                onClick={() => setActiveFilter("ALL")}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowMoreFilters((value) => !value)}
            aria-expanded={secondaryVisible}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              secondaryVisible || SECONDARY_FILTERS.some((filter) => filter.key === activeFilter)
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-200 bg-white text-zinc-600",
            )}
          >
            <Filter size={14} aria-hidden="true" />
            More
          </button>
        </div>

        {secondaryVisible && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECONDARY_FILTERS.map((filter) => (
              <FilterChip
                key={filter.key}
                filter={filter}
                count={counts[filter.key]}
                active={activeFilter === filter.key}
                attention={filter.key === "DELAYED" && counts.DELAYED > 0}
                onClick={() => setActiveFilter(filter.key)}
              />
            ))}
          </div>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] [touch-action:pan-y] sm:px-6 sm:py-5">
        {isError && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-red-800" role="alert">
            <CircleAlert size={18} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{orders.length ? "Queue connection interrupted" : "Couldn't load the kitchen queue"}</p>
              <p className="mt-0.5 text-xs text-red-700/80">
                {orders.length ? "Showing the last available orders." : "Try again to retrieve live orders."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="min-h-9 shrink-0 rounded-lg px-2 text-xs font-bold text-red-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Try again
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 6 }, (_, index) => <QueueSkeleton key={index} />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex min-h-[min(26rem,55vh)] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white/60 px-6 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={24} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-bold text-zinc-800">{emptyLabel}</h2>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-zinc-500">
              {activeFilter === "ALL" ? "No live orders are waiting for kitchen action." : "Try another filter to view more orders."}
            </p>
            <p className="mt-3 text-xs font-medium text-zinc-400">
              {isFetching ? "Updating…" : "Updated just now"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={(orderId, status) => mutation.mutate({ orderId, status })}
                isPending={pendingId === order.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
