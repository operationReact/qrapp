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
    chip: "border-[#E9D5FF] bg-[#F5F3FF] text-[#7C3AED]",
    action: "bg-[#7C3AED] text-white hover:bg-[#6D28D9] active:bg-[#5B21B6]",
  },
  PREPARING: {
    label: "Cooking",
    rail: "border-l-[#EA580C]",
    dot: "bg-[#EA580C]",
    chip: "border-[#FED7AA] bg-[#FFF7E6] text-[#EA580C]",
    action: "bg-[#EA580C] text-white hover:bg-[#C2410C] active:bg-[#9A3412]",
  },
  READY: {
    label: "Ready",
    rail: "border-l-[#16A34A]",
    dot: "bg-[#16A34A]",
    chip: "border-[#BBF7D0] bg-[#ECFDF3] text-[#16A34A]",
    action: "bg-[#16A34A] text-white hover:bg-[#15803D] active:bg-[#166534]",
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

function OrderItemImage({ item }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = item.imageUrl
    ? item.imageUrl.startsWith("http")
      ? item.imageUrl
      : `${baseURL}${item.imageUrl}`
    : null;

  if (!imageUrl || failed) {
    return (
      <span
        className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#E8E2DD] bg-[#F8F6F3] text-[#A39B94]"
        aria-label={`No image available for ${item.name || "menu item"}`}
      >
        <ImageIcon size={17} aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={item.name || "Menu item"}
      loading="lazy"
      className="size-10 shrink-0 rounded-lg border border-[#E8E2DD] object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function StatusChip({ status, delayed }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      {delayed && (
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-600">
          <AlertTriangle size={12} aria-hidden="true" />
          Delayed
        </span>
      )}
      <span className={cn("inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide", meta.chip.split(" ").pop())}>
        <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
        {meta.label}
      </span>
    </span>
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
        "box-border w-full min-w-0 max-w-full border-l-4 rounded-[14px] border border-[#E8E2DD] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] cursor-pointer",
        delayed ? "border-l-[#DC2626]" : meta?.rail,
        isPending && "opacity-70",
      )}
      aria-busy={isPending}
      onClick={() => onExpand(order.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onExpand(order.id);
        }
      }}
    >
      <div className="p-3.5 sm:p-4">
        <header className="min-w-0 space-y-1.5">
          <h2
            className="min-w-0 max-w-full truncate text-[13px] font-extrabold leading-tight tracking-tight text-[#171717]"
            title={formatOrderNumber(order)}
          >
            {formatOrderNumber(order)}
          </h2>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <StatusChip status={status} delayed={delayed} />
            <div
              className={cn(
                "flex shrink-0 items-center gap-1 text-xs font-bold tabular-nums",
                delayed ? "text-[#DC2626]" : "text-[#6B6B6B]",
              )}
              aria-label={`${formatAge(order.stageAgeMinutes)} in current stage`}
            >
              <Clock3 size={14} aria-hidden="true" />
              {formatAge(order.stageAgeMinutes)}
            </div>
          </div>
        </header>

        <section className="mt-3 min-w-0" aria-label="Order items">
          <ul className="space-y-1.5">
            {(order.items ?? []).slice(0, 3).map((item, index) => (
              <li key={`${order.id}-${index}-${item.itemId ?? "item"}`} className="flex min-w-0 items-start gap-2">
                <OrderItemImage item={item} />
                <span className="min-w-[1.5rem] text-sm font-extrabold tabular-nums text-[#171717]">
                  {item.quantity}×
                </span>
                <VegDot isVeg={item.isVeg} />
                <span className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-[#171717]">
                  {item.name || "Menu item"}
                </span>
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

        <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-[#EEE9E5] pt-3">
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#171717]">
            {order.userName || "Guest"}
          </span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-[#171717]">
            {formatCurrency(order.total)}
          </span>
          <span className="shrink-0 text-[#D8D2CC]" aria-hidden="true">·</span>
          <span
            className={cn(
              "shrink-0 text-[10px] font-bold uppercase tracking-wide",
              paid
                ? "text-[#16A34A]"
                : "text-[#D97706]",
            )}
          >
            {paid ? "Paid" : "Unpaid"}
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-3 min-w-0 space-y-2">
          {/* Mark as Paid button for unpaid READY orders */}
          {!paid && order.status === "READY" && onPayment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPayment(order.id);
              }}
              disabled={isPending}
              className="min-h-11 w-full flex items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-[13px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40 active:scale-[.99] disabled:cursor-not-allowed bg-green-100 text-green-700 hover:bg-green-200 active:bg-green-300 disabled:opacity-70"
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
                "min-h-11 w-full flex items-center gap-2 rounded-[22px] px-4 py-3 text-[13px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[.99] disabled:cursor-not-allowed",
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
            <p className="flex min-w-0 items-start gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-600">
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
    <div className="rounded-[14px] border border-[#E8E2DD] bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" aria-hidden="true">
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
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 w-full min-w-0 max-w-full flex-col bg-[#f7f6f3]">
      <header className="sticky top-0 z-20 min-w-0 max-w-full shrink-0 border-b border-[#E8E2DD] bg-white/95 px-4 py-2.5 backdrop-blur sm:px-6">
        <div className="flex h-[52px] min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-[#171717]">Kitchen</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#16A34A]">
                <span className="size-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
                Live
              </span>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-[#6B6B6B]" aria-live="polite">
              {isFetching && !isLoading ? "Updating…" : `${orders.length} active`}
              {delayedOrders.length > 0 && ` · ${delayedOrders.length} delayed`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#E8E2DD] bg-white text-[#6B6B6B] transition-colors hover:bg-[#F8F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2438]/30 active:scale-95 disabled:opacity-50"
            aria-label={isFetching ? "Updating kitchen queue" : "Refresh kitchen queue"}
            title={isFetching ? "Updating…" : "Refresh queue"}
          >
            <RefreshCw size={17} className={cn(isFetching && "animate-spin")} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-1 min-w-0">
          <LocationSelector header className="h-10 min-h-10 w-full rounded-[10px] shadow-none" />
        </div>

        {/* Active/Completed Tabs */}
        <div className="mt-2 flex min-w-0 gap-1 border-b border-[#E8E2DD]">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={cn(
              "min-h-10 px-4 text-sm font-bold transition-colors relative",
              activeTab === "active"
                ? "text-[#171717]"
                : "text-[#6B6B6B] hover:text-[#171717]"
            )}
          >
            Active
            {activeTab === "active" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#171717]" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={cn(
              "min-h-10 px-4 text-sm font-bold transition-colors relative",
              activeTab === "completed"
                ? "text-[#171717]"
                : "text-[#6B6B6B] hover:text-[#171717]"
            )}
          >
            Completed
            {activeTab === "completed" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#171717]" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Status Filter Nav - Only show on Active tab */}
        {activeTab === "active" && (
          <div className="mt-2 flex min-w-0 max-w-full items-center gap-2">
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
                    "flex h-11 min-w-[64px] shrink-0 flex-col items-center justify-center rounded-xl border px-3 py-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2438]/30 active:scale-[.98]",
                    activeFilter === filter.key
                      ? "border-[#171717] bg-[#171717] text-white"
                      : filter.key === "PLACED"
                        ? "border-[#E9D5FF] bg-[#F5F3FF] text-[#7C3AED]"
                        : filter.key === "PREPARING"
                          ? "border-[#FED7AA] bg-[#FFF7E6] text-[#EA580C]"
                          : filter.key === "READY"
                            ? "border-[#BBF7D0] bg-[#ECFDF3] text-[#16A34A]"
                            : filter.key === "DELAYED"
                              ? "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                              : "border-[#E8E2DD] bg-white text-[#171717]",
                  )}
                >
                  <span className="text-sm font-bold leading-none tabular-nums">{isLoading ? "—" : counts[filter.key]}</span>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-wide leading-none">{filter.label}</span>
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
                "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2438]/30",
                paymentFilter !== "ALL"
                  ? "border-[#171717] bg-[#171717] text-white"
                  : "border-[#E8E2DD] bg-white text-[#6B6B6B]",
              )}
            >
              <Filter size={15} aria-hidden="true" />
              <span className="hidden min-[380px]:inline">
                Filter{paymentFilter !== "ALL" && ` · ${paymentFilter === "PAID" ? "Paid" : "Unpaid"}`}
              </span>
            </button>
          </div>
        )}

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

      <main className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] [touch-action:pan-y] sm:px-6 sm:py-5">
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
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
              <div className="grid min-w-0 grid-cols-1 items-start gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
