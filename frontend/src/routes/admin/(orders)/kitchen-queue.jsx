import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ChefHat,
  CircleAlert,
  Clock3,
  Filter,
  LoaderCircle,
  MapPin,
  RefreshCw,
  User,
  Wallet,
  Phone,
  UtensilsCrossed,
} from "lucide-react";
import { LocationSelector } from "@/components/LocationSelector";
import { liveOrdersAdminOptions } from "@/query/options/orders";
import { updateOrderStatusAdmin } from "@/services/order-service";
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

// Full class names are spelled out so Tailwind can detect them at build time.
const PILL = {
  "kq-new": "border-[color-mix(in_srgb,var(--kq-new)_30%,transparent)] bg-[color-mix(in_srgb,var(--kq-new)_10%,var(--kq-surface))] text-[var(--kq-new)]",
  "kq-cooking": "border-[color-mix(in_srgb,var(--kq-cooking)_30%,transparent)] bg-[color-mix(in_srgb,var(--kq-cooking)_10%,var(--kq-surface))] text-[var(--kq-cooking)]",
  "kq-ready": "border-[color-mix(in_srgb,var(--kq-ready)_30%,transparent)] bg-[color-mix(in_srgb,var(--kq-ready)_10%,var(--kq-surface))] text-[var(--kq-ready)]",
  "kq-delayed": "border-[color-mix(in_srgb,var(--kq-delayed)_30%,transparent)] bg-[color-mix(in_srgb,var(--kq-delayed)_10%,var(--kq-surface))] text-[var(--kq-delayed)]",
  "kq-paid": "border-[color-mix(in_srgb,var(--kq-paid)_30%,transparent)] bg-[color-mix(in_srgb,var(--kq-paid)_10%,var(--kq-surface))] text-[var(--kq-paid)]",
  "kq-unpaid": "border-[color-mix(in_srgb,var(--kq-unpaid)_30%,transparent)] bg-[color-mix(in_srgb,var(--kq-unpaid)_10%,var(--kq-surface))] text-[var(--kq-unpaid)]",
};
const pill = (v) => PILL[v];
const ACTION = {
  "kq-new": "bg-[var(--kq-new)] text-white shadow-[0_6px_16px_rgba(109,40,217,0.3)] hover:brightness-110",
  "kq-cooking": "bg-[var(--kq-cooking)] text-white shadow-[0_6px_16px_rgba(212,90,10,0.3)] hover:brightness-110",
  "kq-ready": "bg-[var(--kq-ready)] text-white shadow-[0_6px_16px_rgba(6,122,69,0.3)] hover:brightness-110",
};
const solidAction = (v) => ACTION[v];
const STATUS_META = {
  PLACED: { label: "New", dot: "bg-[var(--kq-new)]", badge: pill("kq-new"), action: solidAction("kq-new") },
  PREPARING: { label: "Cooking", dot: "bg-[var(--kq-cooking)]", badge: pill("kq-cooking"), action: solidAction("kq-cooking") },
  READY: { label: "Ready", dot: "bg-[var(--kq-ready)]", badge: pill("kq-ready"), action: solidAction("kq-ready") },
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
  ALL: { idle: "border-[var(--kq-hairline)] bg-[var(--kq-surface)] text-[var(--kq-text-primary)]", on: "border-[var(--kq-text-primary)] bg-[var(--kq-text-primary)] text-white" },
  PLACED: { idle: pill("kq-new"), on: "border-[var(--kq-new)] bg-[var(--kq-new)] text-white" },
  PREPARING: { idle: pill("kq-cooking"), on: "border-[var(--kq-cooking)] bg-[var(--kq-cooking)] text-white" },
  READY: { idle: pill("kq-ready"), on: "border-[var(--kq-ready)] bg-[var(--kq-ready)] text-white" },
  DELAYED: { idle: pill("kq-delayed"), on: "border-[var(--kq-delayed)] bg-[var(--kq-delayed)] text-white" },
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
  const resolve = (url) => (url ? (/^(https?:|data:|blob:)/.test(url) ? url : `${baseURL}${url}`) : null);
  const sources = [resolve(item.imageUrl), resolve(item.categoryImageUrl)].filter(Boolean);
  const [failedCount, setFailedCount] = useState(0);
  const src = sources[failedCount];

  return (
    <span className="relative inline-flex size-[60px] shrink-0">
      {!src ? (
        <span
          className="grid size-[60px] place-items-center rounded-[16px] bg-[var(--kq-surface-subtle)] text-[var(--kq-cooking)]"
          role="img"
          aria-label={`No image available for ${item.name || "menu item"}`}
        >
          <UtensilsCrossed size={22} aria-hidden="true" />
        </span>
      ) : (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          className="size-[60px] rounded-[16px] bg-[var(--kq-surface-subtle)] object-cover shadow-[0_4px_12px_rgba(60,40,20,0.16)]"
          onError={() => setFailedCount((n) => n + 1)}
        />
      )}
      <span className="absolute -bottom-1 -right-1 rounded-[6px] bg-white shadow-[0_2px_6px_rgba(15,23,42,0.18)]">
        <VegDot isVeg={item.isVeg} overlay />
      </span>
    </span>
  );
}

function shortOrderId(order) {
  const raw = String(order.orderNumber ?? order.id ?? "");
  const match = raw.match(/^(.+)-\d{8}-(\d{4})$/);
  return match ? `#${match[1]}-${match[2]}` : formatOrderNumber(order);
}

function formatPhone(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (local.length === 10) return { label: `+91 ${local.slice(0, 5)} ${local.slice(5)}`, href: `tel:+91${local}` };
  if (digits.length > 5) return { label: String(phone).trim(), href: `tel:+${digits}` };
  return null;
}

function OrderCard({ order, onAction, onExpand, isPending, onPayment }) {
  const status = getStatusKey(order.status);
  const meta = STATUS_META[status];
  const nextAction = NEXT_ACTION[status];
  const ActionIcon = nextAction?.Icon;
  const delayed = Boolean(order.delayed);
  const paid = isOrderPaid(order);
  const handoverBlocked = order.status === "READY" && !paid;
  const items = order.items ?? [];
  const visibleItems = items.slice(0, 2);
  const hiddenCount = items.length - visibleItems.length;
  const age = formatAge(order.stageAgeMinutes);
  const phone = formatPhone(order.phone);

  const copyId = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(formatOrderNumber(order));
      toast.success("Order ID copied");
    } catch {
      toast.error("Couldn't copy order ID");
    }
  };

  return (
    <article
      className={cn(
        "relative box-border w-full min-w-0 max-w-full cursor-pointer overflow-hidden rounded-[20px] border border-[var(--kq-hairline)] bg-[var(--kq-surface)] shadow-[var(--kq-shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--kq-shadow-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kq-text-primary)]/40 active:scale-[.99]",
        isPending && "opacity-70",
      )}
      aria-busy={isPending}
      onClick={() => onExpand(order.id)}
      role="button"
      tabIndex={0}
      aria-label={`Open order ${formatOrderNumber(order)}`}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onExpand(order.id);
        }
      }}
    >
      <span
        className={cn("absolute inset-y-4 left-0 w-[3px] rounded-r-full", delayed ? "bg-[var(--kq-delayed)]" : meta?.dot)}
        aria-hidden="true"
      />
      <div className="space-y-3 p-3.5 pl-4">
        <header className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <h2
              className="min-w-0 truncate text-[16px] font-[650] leading-tight tracking-tight text-[var(--kq-text-primary)]"
              title={formatOrderNumber(order)}
            >
              {shortOrderId(order)}
            </h2>
            <button
              type="button"
              onClick={copyId}
              className="-mr-1.5 grid size-11 shrink-0 place-items-center rounded-xl text-[var(--kq-text-secondary)] transition-colors duration-150 hover:bg-[var(--kq-surface-subtle)] hover:text-[var(--kq-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kq-text-primary)]/40 active:bg-[var(--kq-hairline)]"
              aria-label={`Copy order ID ${formatOrderNumber(order)}`}
              title="Copy full order ID"
            >
              <Copy size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="-mt-3 flex min-w-0 flex-wrap items-center gap-1.5">
            {meta && (
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-[650] uppercase tracking-[0.06em]", meta.badge)}>
                <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
                {meta.label}
              </span>
            )}
            {delayed ? (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-[650] uppercase tracking-[0.06em] ${pill("kq-delayed")}`}>
                <AlertTriangle size={12} aria-hidden="true" />
                Delayed · {age}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--kq-surface-subtle)] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--kq-text-secondary)]">
                <Clock3 size={12} aria-hidden="true" />
                {age}
              </span>
            )}
          </div>
        </header>

        <ul className="space-y-2" aria-label="Order items">
          {visibleItems.map((item, index) => (
            <li key={`${order.id}-${index}-${item.itemId ?? "item"}`} className="flex min-w-0 items-center gap-3">
              <OrderItemImage item={item} />
              <span className="shrink-0 text-[15px] font-[650] tabular-nums text-[var(--kq-text-secondary)]">{item.quantity}×</span>
              <span className="min-w-0 flex-1 truncate text-[16px] font-[600] text-[var(--kq-text-primary)]">{item.name || "Menu item"}</span>
            </li>
          ))}
          {hiddenCount > 0 && (
            <li className="text-xs font-semibold text-[var(--kq-text-secondary)]">+{hiddenCount} more {hiddenCount === 1 ? "item" : "items"}</li>
          )}
          {items.length === 0 && <li className="text-sm italic text-[var(--kq-text-secondary)]">No items attached</li>}
        </ul>

        <div className="flex min-w-0 items-center justify-between gap-3 border-t border-[var(--kq-hairline)] pt-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--kq-text-secondary)]">Customer</p>
            <p className="truncate text-[14px] font-[600] text-[var(--kq-text-primary)]">{order.userName || "Guest"}</p>
            {phone && (
              <a
                href={phone.href}
                onClick={(e) => e.stopPropagation()}
                className="-my-2 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-lg text-[13px] font-medium tabular-nums text-[var(--kq-text-secondary)] hover:text-[var(--kq-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kq-text-primary)]/40"
                aria-label={`Call customer ${phone.label}`}
              >
                <Phone size={14} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{phone.label}</span>
              </a>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--kq-text-secondary)]">Amount</p>
            <p className="text-[18px] font-[650] tabular-nums text-[var(--kq-text-primary)]">{formatCurrency(order.total)}</p>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-[650] uppercase tracking-[0.06em]",
                paid ? pill("kq-paid") : pill("kq-unpaid"),
              )}
            >
              {paid ? "Paid" : "Unpaid"}
            </span>
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          {!paid && order.status === "READY" && onPayment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPayment(order.id);
              }}
              disabled={isPending}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[14px] border border-[var(--kq-paid)] bg-transparent px-4 text-[14px] font-[650] text-[var(--kq-paid)] transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--kq-paid)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kq-paid)]/40 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-70"
              aria-label={`Mark ${formatOrderNumber(order)} as paid`}
              aria-busy={isPending}
            >
              <Wallet size={16} aria-hidden="true" />
              Mark as Paid
            </button>
          )}

          {nextAction && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAction(order.id, nextAction.status);
              }}
              disabled={isPending || handoverBlocked}
              className={cn(
                "flex min-h-[48px] w-full items-center gap-2 rounded-[16px] px-4 text-[15px] font-[650] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[.98] disabled:cursor-not-allowed",
                handoverBlocked ? "bg-[var(--kq-surface-subtle)] text-[var(--kq-text-secondary)]" : meta?.action,
              )}
              aria-label={`${nextAction.label} for ${formatOrderNumber(order)}`}
              aria-busy={isPending}
              title={handoverBlocked ? "Payment required before handover" : undefined}
            >
              {isPending ? (
                <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <ActionIcon weight="bold" className="size-5" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 text-left">{isPending ? "Updating…" : nextAction.label}</span>
              {!isPending && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          )}

          {handoverBlocked && (
            <p className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[var(--kq-unpaid)]">
              <AlertTriangle size={12} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0">Payment required before handover.</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function QueueSkeleton() {
  return (
    <div className="rounded-[18px] border border-[var(--kq-hairline)] bg-[var(--kq-surface)] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_24px_rgba(15,23,42,0.06)]" aria-hidden="true">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-5 w-20 animate-pulse rounded-md bg-[var(--kq-surface-subtle)]" />
          <div className="h-3 w-24 animate-pulse rounded-md bg-[var(--kq-surface-subtle)]" />
        </div>
        <div className="h-3 w-10 animate-pulse rounded-md bg-[var(--kq-surface-subtle)]" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-4/5 animate-pulse rounded bg-[var(--kq-surface-subtle)]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--kq-surface-subtle)]" />
      </div>
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-[var(--kq-surface-subtle)]" />
      <div className="mt-3 h-12 animate-pulse rounded-xl bg-[var(--kq-surface-subtle)]" />
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
      updateOrderStatusAdmin(orderId, { status }, activeLocationId),
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
    <div className="kq-root flex h-[calc(100dvh-3.5rem)] min-h-0 w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-[var(--kq-page)]">
      <header className="sticky top-0 z-20 min-w-0 max-w-full shrink-0 bg-[color-mix(in_srgb,var(--kq-page)_96%,transparent)] px-3 py-2 backdrop-blur sm:px-4">
        <div className="space-y-2">
          <div className="flex min-w-0 items-center justify-between gap-2.5 rounded-[18px] bg-[var(--kq-surface)] px-3 py-2.5 shadow-[var(--kq-shadow)]">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--kq-text-primary)] text-white">
                <ChefHat size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-semibold leading-none tracking-tight text-[var(--kq-text-primary)]">Kitchen</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--kq-ready)] px-2.5 py-1 text-[10px] font-[650] uppercase tracking-[0.12em] text-white">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-60" aria-hidden="true" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-white" aria-hidden="true" />
                    </span>
                    Live
                  </span>
                </div>
                <p className="mt-1.5 truncate text-[12px] font-medium text-[var(--kq-text-primary)]" aria-live="polite">
                  {isFetching && !isLoading ? "Updating…" : `${orders.length} active`}
                  {delayedOrders.length > 0 && ` · ${delayedOrders.length} delayed`}
                  <span className="font-normal text-[var(--kq-text-secondary)]"> · <span className="hidden min-[430px]:inline">Real-time order preparation</span><span className="min-[430px]:hidden">Real-time</span></span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--kq-surface-subtle)] text-[var(--kq-text-primary)] transition-all duration-150 hover:bg-[var(--kq-hairline)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kq-brand)]/40 active:scale-95 disabled:opacity-50"
              aria-label={isFetching ? "Updating kitchen queue" : "Refresh kitchen queue"}
              title={isFetching ? "Updating…" : "Refresh queue"}
            >
              <RefreshCw size={18} className={cn(isFetching && "animate-spin")} aria-hidden="true" />
            </button>
          </div>

          <LocationSelector header className="h-auto min-h-11 w-full rounded-[16px] border-transparent bg-[var(--kq-surface)] shadow-[0_1px_2px_rgba(60,40,20,0.05)]" />

          <div className="flex min-w-0 rounded-full bg-[var(--kq-surface-subtle)] p-0.5 md:max-w-sm">
            {[
              { key: "active", label: `Active${orders.length > 0 ? ` (${orders.length})` : ""}` },
              { key: "completed", label: "Completed" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={activeTab === tab.key}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center whitespace-nowrap rounded-full px-4 text-[14px] font-[650] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kq-brand)]/40",
                  activeTab === tab.key
                    ? "bg-[var(--kq-text-primary)] text-white shadow-[0_6px_14px_rgba(28,25,23,0.25)]"
                    : "text-[var(--kq-text-secondary)] hover:text-[var(--kq-text-primary)]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "active" && (
            <div className="flex min-w-0 max-w-full items-center gap-2">
              <nav
                className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scroll-smooth pr-6 [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label="Kitchen order status"
              >
                {PRIMARY_FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    aria-pressed={activeFilter === filter.key}
                    className={cn(
                      "inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[13px] font-[650] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kq-brand)]/40 active:scale-[.97]",
                      activeFilter === filter.key
                        ? `${FILTER_META[filter.key].on} shadow-[0_6px_14px_rgba(60,40,20,0.2)]`
                        : FILTER_META[filter.key].idle,
                    )}
                  >
                    {filter.label}
                    <span className="tabular-nums">{isLoading ? "—" : counts[filter.key]}</span>
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
                  "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-[13px] font-[650] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kq-brand)]/40",
                  paymentFilter !== "ALL"
                    ? "border-[var(--kq-text-primary)] bg-[var(--kq-text-primary)] text-white"
                    : "border-[var(--kq-hairline)] bg-[var(--kq-surface)] text-[var(--kq-text-secondary)]",
                )}
              >
                <Filter size={15} aria-hidden="true" />
                <span>{paymentFilter !== "ALL" ? (paymentFilter === "PAID" ? "Paid" : "Unpaid") : "Filter"}</span>
              </button>
            </div>
          )}
        </div>

        <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
          <DrawerContent className="rounded-t-[20px] px-5 pb-[env(safe-area-inset-bottom)]">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="text-lg font-bold text-[var(--kq-text-primary)]">Filter Orders</DrawerTitle>
              <DrawerDescription>Choose which payment statuses to show.</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--kq-text-secondary)]">Payment</p>
              {PAYMENT_FILTERS.map((filter) => (
                <label key={filter.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--kq-hairline)] px-3 text-sm font-semibold text-[var(--kq-text-primary)]">
                  <input
                    type="radio"
                    name="payment-filter"
                    value={filter.key}
                    checked={draftPaymentFilter === filter.key}
                    onChange={() => setDraftPaymentFilter(filter.key)}
                    className="size-4 accent-[var(--kq-brand)]"
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
                  className="min-h-11 rounded-xl border border-[var(--kq-hairline)] bg-white text-sm font-bold text-[var(--kq-text-secondary)]"
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
                className="min-h-11 rounded-xl bg-[var(--kq-text-primary)] text-sm font-bold text-white"
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
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--kq-hairline)] bg-white/60 px-6 text-center">
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
