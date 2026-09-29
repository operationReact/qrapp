import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChefHat,
  CircleAlert,
  Clock3,
  Filter,
  LoaderCircle,
  MapPin,
  RefreshCw,
  User,
  Wallet,
  Image as ImageIcon,
} from "lucide-react";
import { LocationSelector } from "@/components/LocationSelector";
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { KitchenQueueOrderDetailPanel } from "@/components/admin/kitchen-queue/OrderDetailPanel";
import { CompletedOrdersView } from "@/components/admin/kitchen-queue/CompletedOrdersView";
import { useMarkOrderAsPaid } from "@/hooks/useOrderMutations";
import { parseApiError, getBusinessErrorMessage } from "@/lib/api-error-parser";
import { baseURL } from "@/services";

const STATUS_META = {
  PLACED: {
    label: "New",
    rail: "border-l-[#7C3AED]",
    dot: "bg-[#7C3AED]",
    badge: "border-[#E9D5FF] bg-[#F5F3FF] text-[#7C3AED]",
    filter: "border-[#E9D5FF] bg-[#F5F3FF] text-[#7C3AED]",
    action: "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_18px_rgba(109,40,217,0.24)] hover:brightness-[1.04] active:brightness-95",
  },
  PREPARING: {
    label: "Cooking",
    rail: "border-l-[#EA580C]",
    dot: "bg-[#EA580C]",
    badge: "border-[#FED7AA] bg-[#FFF7E6] text-[#EA580C]",
    filter: "border-[#FED7AA] bg-[#FFF7E6] text-[#EA580C]",
    action: "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_24px_rgba(234,88,12,0.24)] hover:brightness-[1.04] active:brightness-95",
  },
  READY: {
    label: "Ready",
    rail: "border-l-[#16A34A]",
    dot: "bg-[#16A34A]",
    badge: "border-[#BBF7D0] bg-[#ECFDF3] text-[#16A34A]",
    filter: "border-[#BBF7D0] bg-[#ECFDF3] text-[#16A34A]",
    action: "bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_24px_rgba(22,163,74,0.24)] hover:brightness-[1.04] active:brightness-95",
  },
};

const NEXT_ACTION = {
  PLACED: { status: "PREPARING", label: "Start Preparing", Icon: CookingPotIcon },
  PREPARING: { status: "READY", label: "Mark Ready", Icon: CheckCircleIcon },
  READY: { status: "COMPLETED", label: "Hand Over", Icon: HandWavingIcon },
};

const PRIMARY_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "PLACED", label: "New" },
  { key: "PREPARING", label: "Cooking" },
  { key: "READY", label: "Ready" },
  { key: "DELAYED", label: "Delayed" },
];

const FILTER_META = {
  ALL: "border-[#191919] bg-[#191919] text-white",
  PLACED: "border-[#E9D5FF] bg-[#F5F3FF] text-[#7C3AED]",
  PREPARING: "border-[#FED7AA] bg-[#FFF7E6] text-[#EA580C]",
  READY: "border-[#BBF7D0] bg-[#ECFDF3] text-[#16A34A]",
  DELAYED: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]",
};

const PAYMENT_FILTERS = [
  { key: "ALL", label: "All" },
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

function VegDot({ isVeg, overlay = false }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[6px] border-2 bg-white",
        overlay ? "size-4" : "mt-0.5 size-3.5",
        isVeg ? "border-emerald-600" : "border-red-500",
      )}
      role="img"
      aria-label={isVeg ? "Vegetarian item" : "Non-vegetarian item"}
    >
      <span className={cn("rounded-full", overlay ? "size-2" : "size-1.5", isVeg ? "bg-emerald-600" : "bg-red-500")} />
    </span>
  );
}

function OrderItemImage({ item }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = item.imageUrl
    ? item.imageUrl.startsWith("http")
      ? item.imageUrl
      : `${baseURL}${item.imageUrl}`
    : null;

  return (
    <span className="relative inline-flex size-16 shrink-0">
      {!imageUrl || failed ? (
        <span
          className="grid size-16 shrink-0 place-items-center rounded-2xl border border-[#E8E2DD] bg-[#F4F0EB] text-[#A39B94] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
          aria-label={`No image available for ${item.name || "menu item"}`}
        >
          <ImageIcon size={20} aria-hidden="true" />
        </span>
      ) : (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="size-16 shrink-0 rounded-2xl border border-[#E8E2DD] object-cover shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
          onError={() => setFailed(true)}
        />
      )}
      <span className="absolute -bottom-1 -right-1 rounded-[6px] shadow-[0_2px_6px_rgba(15,23,42,0.18)]">
        <VegDot isVeg={item.isVeg} overlay />
      </span>
    </span>
  );
}

function StatusChip({ status, delayed, stageAgeMinutes }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span
        className={cn(
          "inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
          meta.badge,
        )}
      >
        <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
        {meta.label}
      </span>
      {delayed && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#DC2626]">
          <AlertTriangle size={12} aria-hidden="true" />
          Delayed
        </span>
      )}
    </div>
  );
}

function OrderCard({ order, onAction, onExpand, isPending, onPayment }) {
  const status = getStatusKey(order.status);
  const meta = STATUS_META[status];
  const nextAction = NEXT_ACTION[status];
  const ActionIcon = nextAction?.Icon;
  const delayed = Boolean(order.delayed);
  const paid = isOrderPaid(order);

  return (
    <article
      className={cn(
        "box-border w-full min-w-0 max-w-full cursor-pointer rounded-[18px] border border-[#E8E2DD] border-l-4 bg-[#FAF9F7] shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_24px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_34px_rgba(15,23,42,0.08)]",
        delayed ? "border-l-[#DC2626]" : meta?.rail,
        isPending && "opacity-70",
      )}
      aria-busy={isPending}
      onClick={() => onExpand(order.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onExpand(order.id);
        }
      }}
    >
      <div className="space-y-3.5 p-3.5 sm:p-4">
        <header className="min-w-0 space-y-2.5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <h2
              className="min-w-0 max-w-full truncate text-[14px] font-extrabold leading-tight tracking-[0.01em] text-[#171717]"
              title={formatOrderNumber(order)}
            >
              {formatOrderNumber(order)}
            </h2>
            <div
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
                delayed
                  ? "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                  : "border-[#E8E2DD] bg-white text-[#5B5753]",
              )}
              aria-label={delayed ? `Delayed, ${formatAge(order.stageAgeMinutes)} in current stage` : `${formatAge(order.stageAgeMinutes)} in current stage`}
            >
              {delayed ? <AlertTriangle size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}
              {delayed ? "Delayed" : formatAge(order.stageAgeMinutes)}
              {delayed && (
                <>
                  <span aria-hidden="true">•</span>
                  <Clock3 size={12} aria-hidden="true" />
                  {formatAge(order.stageAgeMinutes)}
                </>
              )}
            </div>
          </div>

          <StatusChip status={status} delayed={delayed} stageAgeMinutes={order.stageAgeMinutes} />
        </header>

        <section className="min-w-0 space-y-2" aria-label="Order items">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A8580]">Items</p>
          <ul className="space-y-2.5">
            {(order.items ?? []).slice(0, 3).map((item, index) => (
              <li key={`${order.id}-${index}-${item.itemId ?? "item"}`} className="flex min-w-0 items-center gap-3">
                <OrderItemImage item={item} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <VegDot isVeg={item.isVeg} />
                    <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-[#171717]">
                      {item.quantity}×
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-snug text-[#171717]">
                      {item.name || "Menu item"}
                    </span>
                  </div>
                </div>
              </li>
            ))}
            {(order.items ?? []).length > 3 && (
              <li className="text-xs font-semibold text-[#6B6B6B]">+{order.items.length - 3} more items</li>
            )}
            {(!order.items || order.items.length === 0) && (
              <li className="text-sm italic text-[#8A8580]">No items attached</li>
            )}
          </ul>
        </section>

        <section className="grid min-w-0 grid-cols-2 gap-3 rounded-[16px] border border-[#EEE9E5] bg-white/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A8580]">Customer</p>
            <p className="mt-1 truncate text-[13px] font-semibold text-[#171717]">
              {order.userName || "Guest"}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A8580]">Amount</p>
            <p className="mt-1 text-[15px] font-extrabold tabular-nums text-[#171717]">
              {formatCurrency(order.total)}
            </p>
            <p
              className={cn(
                "mt-1 text-[10px] font-bold uppercase tracking-[0.16em]",
                paid ? "text-[#16A34A]" : "text-[#D97706]",
              )}
            >
              {paid ? "Paid" : "Pending"}
            </p>
          </div>
        </section>

        {/* Action buttons */}
        <div className="min-w-0 space-y-2.5">
          {/* Mark as Paid button for unpaid READY orders */}
          {!paid && order.status === "READY" && onPayment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPayment(order.id);
              }}
              disabled={isPending}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[24px] border border-[#BBF7D0] bg-gradient-to-r from-[#F0FDF4] to-[#DCFCE7] px-4 py-3 text-[13px] font-bold text-[#15803D] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_18px_rgba(34,197,94,0.14)] transition-all hover:brightness-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-70"
              aria-label={`Mark ${formatOrderNumber(order)} as paid`}
              aria-busy={isPending}
            >
              Mark as Paid
            </button>
          )}

          {/* Hand Over / Stage action button */}
          {nextAction && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAction(order.id, nextAction.status);
              }}
              disabled={isPending || (order.status === "READY" && !paid)}
              className={cn(
                "flex min-h-[46px] w-full items-center gap-2 rounded-[24px] px-4 py-3 text-[13px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[.98] disabled:cursor-not-allowed",
                order.status === "READY" && !paid
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                  : meta?.action,
              )}
              aria-label={`${nextAction.label} for ${formatOrderNumber(order)}`}
              aria-busy={isPending}
              title={order.status === "READY" && !paid ? "Mark as Paid before hand over" : undefined}
            >
              {isPending ? (
                <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <ActionIcon weight="bold" className="size-[18px]" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 break-words text-left">{isPending ? "Updating…" : nextAction.label}</span>
              {!isPending && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          )}

          {/* Helper text for disabled hand over */}
          {order.status === "READY" && !paid && (
            <p className="flex min-w-0 items-start gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle size={12} aria-hidden="true" />
              <span className="min-w-0 break-words">Payment required before hand over</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function QueueSkeleton() {
  return (
    <div className="rounded-[18px] border border-[#E8E2DD] bg-[#FAF9F7] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_24px_rgba(15,23,42,0.06)]" aria-hidden="true">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-5 w-20 animate-pulse rounded-md bg-[#F0ECE8]" />
          <div className="h-3 w-24 animate-pulse rounded-md bg-[#F0ECE8]" />
        </div>
        <div className="h-3 w-10 animate-pulse rounded-md bg-[#F0ECE8]" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-4/5 animate-pulse rounded bg-[#F0ECE8]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-[#F0ECE8]" />
      </div>
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-[#F0ECE8]" />
      <div className="mt-3 h-12 animate-pulse rounded-xl bg-[#F0ECE8]" />
    </div>
  );
}

export const Route = createFileRoute("/admin/(orders)/kitchen-queue")({
  component: KitchenQueuePage,
});

function KitchenQueuePage() {
  const { user, isAdmin, isSuperUser } = useAuth();
  const { activeLocationId } = useActiveLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [draftPaymentFilter, setDraftPaymentFilter] = useState("ALL");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

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
    mutationFn: ({ orderId, status }) =>
      updateAdminOrder(orderId, { status }, activeLocationId),
    onError: (error) => {
      const parsedError = parseApiError(error);
      const message = parsedError.isBusinessError
        ? getBusinessErrorMessage(parsedError.code, parsedError.message)
        : parsedError.message;
      toast.error(message);
    },
    onSettled: () => setPendingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "admin", "live"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
    },
  });

  const paymentMutation = useMarkOrderAsPaid(activeLocationId);

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

  const paymentFilteredOrders = useMemo(() => {
    if (paymentFilter === "PAID") return filteredOrders.filter((order) => isOrderPaid(order));
    if (paymentFilter === "UNPAID") return filteredOrders.filter((order) => !isOrderPaid(order));
    return filteredOrders;
  }, [filteredOrders, paymentFilter]);

  if (!canAccessAdmin(user) && !isAdmin && !isSuperUser) {
    return <Navigate to="/login" replace />;
  }

  const emptyLabel = activeFilter === "ALL"
    ? "Kitchen is clear"
    : `No ${PRIMARY_FILTERS.find((filter) => filter.key === activeFilter)?.label ?? ""} orders`;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-[#F5F1EB]">
      <header className="sticky top-0 z-20 min-w-0 max-w-full shrink-0 border-b border-[#ECE4DB] bg-[#F5F1EB]/95 px-3.5 py-3 backdrop-blur sm:px-4">
        <div className="space-y-3">
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-[20px] border border-white/70 bg-white/90 px-3.5 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#FFE8CC] to-[#FFD3A3] text-[#B45309] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_14px_rgba(180,83,9,0.16)]">
                <ChefHat size={22} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold tracking-tight text-[#171717]">Kitchen</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#16A34A]">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#16A34A] opacity-60" aria-hidden="true" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
                    </span>
                    Live
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-[#5B5753]" aria-live="polite">
                  {isFetching && !isLoading ? "Updating…" : `${orders.length} active`}
                  {delayedOrders.length > 0 && ` · ${delayedOrders.length} delayed`}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8A8580]">Real-time order preparation</p>
              </div>
            </div>
            <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[#E8E2DD] bg-[#FAF9F7] text-[#6B6B6B] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all hover:bg-white hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2438]/30 active:scale-95 disabled:opacity-50"
            aria-label={isFetching ? "Updating kitchen queue" : "Refresh kitchen queue"}
            title={isFetching ? "Updating…" : "Refresh queue"}
            >
            <RefreshCw size={17} className={cn(isFetching && "animate-spin")} aria-hidden="true" />
            </button>
          </div>

          <div className="flex min-w-0 items-center gap-2.5 rounded-[20px] border border-white/70 bg-white/90 p-3 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] text-[#6D28D9] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_6px_14px_rgba(109,40,217,0.14)]">
              <Building2 size={18} aria-hidden="true" />
            </span>
            <LocationSelector header className="h-auto min-h-11 flex-1 rounded-[14px] border-none bg-transparent p-0 shadow-none" />
          </div>

          {/* Active/Completed Tabs */}
          <div className="flex min-w-0 rounded-full border border-[#E8E2DD] bg-white/80 p-1 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
            <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={cn(
              "flex h-10 flex-1 items-center justify-center rounded-full px-4 text-sm font-bold transition-all",
              activeTab === "active"
                ? "bg-[#171717] text-white shadow-[0_8px_16px_rgba(23,23,23,0.18)]"
                : "bg-[#F5F1EB] text-[#6B6B6B] hover:text-[#171717]",
            )}
            >
            Active{orders.length > 0 && ` (${orders.length})`}
            </button>
            <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={cn(
              "flex h-10 flex-1 items-center justify-center rounded-full px-4 text-sm font-bold transition-all",
              activeTab === "completed"
                ? "bg-[#171717] text-white shadow-[0_8px_16px_rgba(23,23,23,0.18)]"
                : "bg-[#F5F1EB] text-[#6B6B6B] hover:text-[#171717]",
            )}
            >
            Completed
            </button>
          </div>

          {/* Status Filter Nav - Only show on Active tab */}
          {activeTab === "active" && (
            <div className="flex min-w-0 max-w-full items-center gap-2">
            <nav
              className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Kitchen order status"
            >
              {PRIMARY_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  aria-pressed={activeFilter === filter.key}
                  className={cn(
                    "flex h-14 min-w-[76px] shrink-0 flex-col items-center justify-center rounded-[20px] border px-3 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2438]/30 active:scale-[.98]",
                    activeFilter === filter.key
                      ? "border-[#171717] bg-[#171717] text-white shadow-[0_10px_20px_rgba(23,23,23,0.18)]"
                      : FILTER_META[filter.key],
                  )}
                >
                  <span className="text-base font-bold leading-none tabular-nums">{isLoading ? "—" : counts[filter.key]}</span>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] leading-none">{filter.label}</span>
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => {
                setDraftPaymentFilter(paymentFilter);
                setFilterOpen(true);
              }}
              aria-label="Filter kitchen orders"
              aria-expanded={filterOpen}
              className={cn(
                "inline-flex h-14 shrink-0 items-center justify-center gap-1.5 rounded-[20px] border px-3 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2438]/30",
                paymentFilter !== "ALL"
                  ? "border-[#171717] bg-[#171717] text-white shadow-[0_10px_20px_rgba(23,23,23,0.18)]"
                  : "border-[#E8E2DD] bg-white text-[#6B6B6B] shadow-[0_8px_18px_rgba(15,23,42,0.05)]",
              )}
            >
              <Filter size={15} aria-hidden="true" />
              <span className="hidden min-[380px]:inline">
                Filter{paymentFilter !== "ALL" && ` · ${paymentFilter === "PAID" ? "Paid" : "Unpaid"}`}
              </span>
            </button>
            </div>
          )}
        </div>

        <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
          <DrawerContent className="rounded-t-[20px] px-5 pb-[env(safe-area-inset-bottom)]">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="text-lg font-bold text-[#171717]">Filter Orders</DrawerTitle>
              <DrawerDescription>Choose which payment statuses to show.</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8A8580]">Payment</p>
              {PAYMENT_FILTERS.map((filter) => (
                <label key={filter.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#E8E2DD] px-3 text-sm font-semibold text-[#171717]">
                  <input
                    type="radio"
                    name="payment-filter"
                    value={filter.key}
                    checked={draftPaymentFilter === filter.key}
                    onChange={() => setDraftPaymentFilter(filter.key)}
                    className="size-4 accent-[#FF2438]"
                  />
                  {filter.label}
                </label>
              ))}
            </div>
            <DrawerFooter className="grid grid-cols-2 gap-2 px-0">
              <DrawerClose asChild>
                <button
                  type="button"
                  onClick={() => {
                    setDraftPaymentFilter("ALL");
                    setPaymentFilter("ALL");
                  }}
                  className="min-h-11 rounded-xl border border-[#E8E2DD] bg-white text-sm font-bold text-[#6B6B6B]"
                >
                  Clear
                </button>
              </DrawerClose>
              <button
                type="button"
                onClick={() => {
                  setPaymentFilter(draftPaymentFilter);
                  setFilterOpen(false);
                }}
                className="min-h-11 rounded-xl bg-[#171717] text-sm font-bold text-white"
              >
                Apply
              </button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </header>

      <main className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3.5 py-3.5 pb-[calc(1rem+env(safe-area-inset-bottom))] [touch-action:pan-y] sm:px-4 sm:py-4">
        {activeTab === "active" ? (
          <>
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
                {Array.from({ length: 4 }, (_, index) => <QueueSkeleton key={index} />)}
              </div>
            ) : paymentFilteredOrders.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#E8E2DD] bg-white/60 px-6 text-center">
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
              <div className="grid min-w-0 grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {paymentFilteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAction={(orderId, status) => {
                      setPendingId(orderId);
                      mutation.mutate({ orderId, status });
                    }}
                    onPayment={(orderId) => {
                      setPendingId(orderId);
                      paymentMutation.mutate(orderId);
                    }}
                    onExpand={setExpandedOrderId}
                    isPending={pendingId === order.id && (mutation.isPending || paymentMutation.isPending)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <CompletedOrdersView
            activeLocationId={activeLocationId}
            expandedOrderId={expandedOrderId}
            onExpandOrder={setExpandedOrderId}
          />
        )}
      </main>

      {/* Expanded Order Detail Panel */}
      <KitchenQueueOrderDetailPanel
        orderId={expandedOrderId}
        isOpen={!!expandedOrderId}
        onOpenChange={(open) => {
          if (!open) {
            setExpandedOrderId(null);
          }
        }}
        locationId={activeLocationId}
      />
    </div>
  );
}
