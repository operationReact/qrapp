import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseApiError } from "@/lib/api-error-parser";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import {
  ArrowCounterClockwiseIcon,
  CalendarIcon,
  ChatCircleTextIcon,
  CheckCircleIcon,
  ClockIcon,
  CookingPotIcon,
  ImageIcon,
  DotsThreeVerticalIcon,
  ReceiptIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useCart } from "@/context/CartContext";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { baseURL } from "@/services";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelMyOrder, downloadInvoice, raiseOrderSupportRequest } from "@/services/order-service";
import {
  formatOrderDate,
  formatOrderTime,
  getOrderStatusMeta,
  getPaymentStatusMeta,
  normalizeOrderStatus,
} from "./orderPresentation";

const PROGRESS_STAGES = [
  { key: "ORDER_PLACED", label: "Placed" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY", label: "Ready" },
  { key: "COMPLETED", label: "Completed" },
];

function resolveImageUrl(imageUrl) {
  if (!imageUrl) return null;
  return imageUrl.startsWith("http") ? imageUrl : `${baseURL}${imageUrl}`;
}

function OrderItemImage({ item }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = resolveImageUrl(item.imageUrl);

  if (!imageUrl || failed) {
    return (
      <span
        className="grid size-12 shrink-0 place-items-center rounded-[10px] border border-border bg-muted text-muted-foreground"
        aria-label={`No image available for ${item.name || "menu item"}`}
      >
        <ImageIcon weight="duotone" className="size-5" aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={item.name || "Menu item"}
      loading="lazy"
      className="size-12 min-w-12 shrink-0 rounded-[10px] border border-border object-cover"
      onError={() => setFailed(true)}
    />
  );
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

function StatusBadge({ status }) {
  const meta = getOrderStatusMeta(status);
  const Icon = meta.icon;

  return (
    <Badge className={cn("h-7 rounded-full px-2.5 text-xs font-semibold", meta.tone)}>
      <Icon weight="duotone" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}

function PaymentStatus({ status }) {
  const meta = getPaymentStatusMeta(status);
  const Icon = meta.icon;

  return (
    <Badge className={cn("h-7 rounded-full border px-2.5 text-xs font-semibold", meta.tone)}>
      <Icon weight="duotone" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}

function OrderProgress({ status }) {
  const normalizedStatus = normalizeOrderStatus(status);
  const statusMeta = getOrderStatusMeta(status);
  const StatusIcon = statusMeta.icon;

  if (normalizedStatus === "CANCELLED") {
    return (
      <div className="flex min-w-0 items-start gap-3 rounded-xl border border-red-200/70 bg-linear-to-br from-red-50 to-rose-50 p-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-red-100 text-red-600 ring-1 ring-red-200/70">
          <StatusIcon weight="duotone" className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-800">Order cancelled</p>
          <p className="mt-0.5 text-xs leading-relaxed text-red-700/80">This order will not be prepared.</p>
        </div>
      </div>
    );
  }

  if (normalizedStatus === "COMPLETED") {
    return (
      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-emerald-200/70 bg-linear-to-br from-emerald-50 to-teal-50 p-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200/70">
          <CheckCircleIcon weight="fill" className="size-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-emerald-800">Order completed</p>
      </div>
    );
  }

  const currentStep = statusMeta.step ?? 0;

  return (
    <div
      className="flex min-w-0 items-center gap-1 rounded-xl border border-border/70 bg-muted/30 p-3"
      aria-label={`Order progress: ${statusMeta.label}`}
    >
      {PROGRESS_STAGES.map((stage, index) => {
        const complete = index < currentStep;
        const current = index === currentStep;

        return (
          <div key={stage.key} className="flex min-w-0 flex-1 items-center gap-1">
            <div
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold",
                complete && "border-emerald-600 bg-emerald-600 text-white",
                current && "border-primary bg-primary text-primary-foreground",
                !complete && !current && "border-border bg-muted text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {complete ? "✓" : index + 1}
            </div>
            <span
              className={cn(
                "min-w-0 truncate text-[10px] font-semibold",
                current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {stage.label}
            </span>
            {index < PROGRESS_STAGES.length - 1 && (
              <span
                className={cn(
                  "mx-0.5 h-px min-w-1 flex-1",
                  index < currentStep ? "bg-emerald-500" : "bg-border",
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderItemsPreview({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const visibleItems = items.slice(0, 3);
  const remainingCount = Math.max(0, items.length - visibleItems.length);

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Item details unavailable.</p>;
  }

  return (
    <div className="min-w-0 space-y-2">
      {visibleItems.map((item, index) => (
        <div key={`${order.id}-${item.itemId ?? item.name ?? "item"}-${index}`} className="flex min-w-0 items-start gap-2">
          <OrderItemImage item={item} />
          <VegDot isVeg={item.isVeg} />
          <span className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">
            {item.name || "Menu item"} <span className="text-muted-foreground">× {item.quantity}</span>
          </span>
        </div>
      ))}
      {remainingCount > 0 && (
        <p className="text-xs font-semibold text-muted-foreground">+ {remainingCount} more items</p>
      )}
    </div>
  );
}

function OrderItemsDrawer({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full min-w-0 gap-2 rounded-xl"
          aria-label={`View items for order ${order.orderNumber}`}
        >
          <CookingPotIcon weight="duotone" aria-hidden="true" />
          View items
        </Button>
      </DrawerTrigger>
      <DrawerContent className="mx-auto w-full max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg font-semibold">Your Order</DrawerTitle>
          <DrawerDescription>{order.orderNumber}</DrawerDescription>
        </DrawerHeader>
        <div className="max-h-[55vh] overflow-y-auto px-4 pb-4">
          {items.length ? (
            <ul className="space-y-2">
              {items.map((item, index) => (
                <li key={`${order.id}-${item.itemId ?? item.name ?? "item"}-${index}`} className="flex min-w-0 items-start gap-3 rounded-xl border border-border px-3 py-2.5">
                  <OrderItemImage item={item} />
                  <VegDot isVeg={item.isVeg} />
                  <span className="min-w-0 flex-1 break-words text-sm">
                    <span className="font-semibold">{item.name || "Menu item"}</span>
                    <span className="block text-xs text-muted-foreground">Quantity: {item.quantity}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold">
                    ₹{((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Item details unavailable.</p>
          )}
        </div>
        <DrawerFooter>
          <DrawerClose className={buttonVariants({ variant: "outline", className: "min-h-11" })}>
            Close
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function OrderCardSkeleton() {
  return (
    <article className="w-full min-w-0 rounded-2xl border border-border bg-card p-4 shadow-xs" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-6 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-4 h-8 w-full animate-pulse rounded-xl bg-muted" />
      <div className="mt-4 space-y-2">
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-4 h-11 w-full animate-pulse rounded-xl bg-muted" />
    </article>
  );
}

const REFUND_DESTINATION = {
  RAZORPAY: "Original payment method",
  WALLET: "Wallet balance",
  PAY_AT_STALL: "Handled by stall team",
};

function RefundTracker({ order }) {
  const status = order.refundStatus;
  if (!status) return null;

  const refundAmount = Number(order.refundAmount ?? order.total ?? 0).toFixed(2);
  const cancelledAt = order.cancelledAt || order.createdAt;
  const cancelledLabel = cancelledAt
    ? `${formatOrderDate(cancelledAt)}, ${formatOrderTime(cancelledAt)}`
    : null;

  if (status === "NOT_REQUIRED") {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-600">
        No refund is due because no payment was collected.
      </div>
    );
  }

  const requested = status === "PENDING" || status === "MANUAL_REQUIRED" || status === "REFUNDED";
  const completed = status === "REFUNDED";
  const headline = {
    REFUNDED: { label: "Refunded", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: CheckCircleIcon },
    PENDING: { label: "Refund processing", tone: "bg-amber-50 text-amber-700 ring-amber-200", Icon: ClockIcon },
    MANUAL_REQUIRED: { label: "Awaiting stall refund", tone: "bg-rose-50 text-rose-700 ring-rose-200", Icon: WarningCircleIcon },
  }[status] ?? { label: status, tone: "bg-slate-50 text-slate-700 ring-slate-200", Icon: ClockIcon };
  const message = {
    REFUNDED: "Your refund has been completed.",
    PENDING: "We have started your refund. This page updates when it completes.",
    MANUAL_REQUIRED: "The stall team will complete this refund for you.",
  }[status];

  const steps = [
    { key: "cancelled", label: "Order cancelled", detail: cancelledLabel, state: "done" },
    { key: "requested", label: "Refund requested", detail: `₹${refundAmount}`, state: requested ? "done" : "pending" },
    {
      key: "completed",
      label: "Refund completed",
      detail: completed ? null : status === "MANUAL_REQUIRED" ? "Stall team to pay out" : "Processing",
      state: completed ? "done" : requested ? "current" : "pending",
    },
  ];

  const HeadlineIcon = headline.Icon;
  const destination = REFUND_DESTINATION[order.paymentMethod];

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Refund amount</p>
          <p className="text-lg font-bold text-slate-900">₹{refundAmount}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", headline.tone)}>
          <HeadlineIcon size={14} weight="bold" />
          {headline.label}
        </span>
      </div>

      <ol className="space-y-2.5">
        {steps.map((step) => (
          <li key={step.key} className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                step.state === "done" && "bg-emerald-500 text-white",
                step.state === "current" && "bg-amber-400 text-white",
                step.state === "pending" && "bg-slate-200",
              )}
              aria-hidden="true"
            >
              {step.state === "done" && <CheckCircleIcon size={12} weight="bold" />}
            </span>
            <div className="min-w-0">
              <p className={cn("text-xs font-semibold", step.state === "pending" ? "text-slate-400" : "text-slate-800")}>
                {step.label}
              </p>
              {step.detail && <p className="text-[11px] text-slate-500">{step.detail}</p>}
            </div>
          </li>
        ))}
      </ol>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5 text-xs">
        {destination && (
          <>
            <dt className="text-slate-500">Refund to</dt>
            <dd className="text-right font-semibold text-slate-800">{destination}</dd>
          </>
        )}
        {order.refundReference && (
          <>
            <dt className="text-slate-500">Reference</dt>
            <dd className="break-all text-right font-mono text-[11px] font-semibold text-slate-800">{order.refundReference}</dd>
          </>
        )}
        {order.cancelReason && (
          <>
            <dt className="text-slate-500">Reason</dt>
            <dd className="text-right font-semibold text-slate-800">{order.cancelReason}</dd>
          </>
        )}
      </dl>

      {message && <p className="text-xs text-slate-600">{message}</p>}
    </div>
  );
}


function CancelOrderDialog({ order, open, onOpenChange }) {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: () => cancelMyOrder(order.id),
    onSuccess: () => {
      toast.success("Your order has been cancelled.");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message || "Unable to cancel this order.");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[20px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>
            {order.orderNumber} will be cancelled.
            {order.paymentStatus === "PAID" && " Your payment will be refunded."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelMutation.isPending}>Keep order</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {cancelMutation.isPending ? "Cancelling..." : "Yes, cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SupportRequestDialog({ order, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const supportMutation = useMutation({
    mutationFn: () => raiseOrderSupportRequest(order.id, message.trim()),
    onSuccess: () => {
      toast.success("Support request raised. Our team will get back to you.");
      setMessage("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message || "Unable to raise a support request.");
    },
  });

  const trimmedLength = message.trim().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-left">Support request for {order.orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label htmlFor={`support-message-${order.id}`} className="text-sm font-medium text-gray-900">
            What went wrong?
          </label>
          <textarea
            id={`support-message-${order.id}`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Describe the issue (at least 10 characters)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500">{trimmedLength}/1000</p>
        </div>
        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={supportMutation.isPending}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => supportMutation.mutate()}
            disabled={supportMutation.isPending || trimmedLength < 10}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {supportMutation.isPending ? "Sending..." : "Send request"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MENU_TILE_TONES = {
  default: "bg-muted text-foreground",
  brand: "bg-primary/10 text-primary",
  danger: "bg-red-50 text-red-600",
};

function OrderMenuRow({ tone = "default", iconNode, title, hint, onSelect, disabled, className }) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onClick={onSelect}
      className={cn("gap-3 rounded-xl px-2 py-2", className)}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", MENU_TILE_TONES[tone])}>
        {iconNode}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold leading-tight">{title}</span>
        <span className="text-xs font-normal text-muted-foreground">{hint}</span>
      </span>
    </DropdownMenuItem>
  );
}

export default function OrderCard({ order }) {
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const { addItemsToLocationCart } = useCart();
  const { activeLocationId, setActiveLocation, availableLocations } = useActiveLocation();
  const navigate = useNavigate();
  const status = normalizeOrderStatus(order.status);
  const canDownloadInvoice = order.invoiceAvailable && status === "COMPLETED";
  const canRaiseSupport = status === "COMPLETED" || status === "CANCELLED";
  const canReorder = Array.isArray(order.items) && order.items.some((item) => item.itemId != null);
  const hasMenuActions = canDownloadInvoice || order.cancellable || canRaiseSupport;

  const confirmReorder = () => {
    const target = availableLocations.find((loc) => String(loc.id) === String(order.locationId));
    if (!target) {
      toast.error("This location is not available right now.");
      return;
    }
    const items = order.items
      .filter((item) => item.itemId != null && item.quantity > 0)
      .map((item) => ({
        id: item.itemId,
        name: item.name,
        imageUrl: item.imageUrl ?? undefined,
        price: Number(item.price),
        isVeg: item.isVeg ?? undefined,
        quantity: item.quantity,
      }));
    addItemsToLocationCart(target.id, items);
    if (String(target.id) !== String(activeLocationId)) {
      setActiveLocation(target);
    }
    setReorderOpen(false);
    toast.success(`Items added to your ${target.name} cart.`);
    navigate({ to: "/cart" });
  };

  const handleInvoiceDownload = async () => {
    if (downloadingInvoice) return;
    setDownloadingInvoice(true);
    try {
      const blob = await downloadInvoice(order.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `BroAndBro-Invoice-${order.orderNumber || order.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to download the invoice. Please try again.");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  return (
    <article className="relative box-border w-full min-w-0 max-w-full overflow-hidden rounded-[28px] border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-12px_rgba(28,25,23,0.12)] transition-shadow duration-300 hover:shadow-[0_2px_4px_rgba(28,25,23,0.05),0_16px_32px_-14px_rgba(28,25,23,0.18)] sm:p-5">
      <header className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            <StatusBadge status={status} />
            {status !== "CANCELLED" && <PaymentStatus status={order.paymentStatus} />}
          </div>
          <div className="mt-3 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Order number
            </span>
            <h2 className="min-w-0 break-words text-sm font-semibold leading-snug text-foreground sm:text-base">
              {order.orderNumber}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              <CalendarIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <time dateTime={order.createdAt}>
                {formatOrderDate(order.createdAt)}
                {formatOrderTime(order.createdAt) && ` • ${formatOrderTime(order.createdAt)}`}
              </time>
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Total</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground sm:text-xl">
            ₹{Number(order.total || 0).toFixed(2)}
          </p>
        </div>
      </header>

      <div className="mt-4 min-w-0">
        <OrderProgress status={status} />
      </div>

      {status === "CANCELLED" && <RefundTracker order={order} />}
      <section className="mt-3 min-w-0" aria-label="Order items">
        <OrderItemsPreview order={order} />
      </section>

      <footer className="mt-3 flex min-w-0 items-center gap-2 border-t border-border pt-3">
        <div className="min-w-0 flex-1">
          <OrderItemsDrawer order={order} />
        </div>
        {canReorder && (
          <Button
            type="button"
            className="h-11 shrink-0 gap-1.5 rounded-xl px-4 text-sm font-semibold shadow-sm"
            onClick={() => setReorderOpen(true)}
          >
            <ArrowCounterClockwiseIcon weight="bold" aria-hidden="true" />
            Reorder
          </Button>
        )}
        <AlertDialog open={reorderOpen} onOpenChange={setReorderOpen}>
          <AlertDialogContent className="rounded-[20px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Reorder from {order.locationName || "this location"}?</AlertDialogTitle>
              <AlertDialogDescription>
                The items from {order.orderNumber} will be added to your {order.locationName || "location"} cart.
                Your active location will switch to {order.locationName || "this location"}. Confirm to continue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Not now</AlertDialogCancel>
              <AlertDialogAction onClick={confirmReorder} className="rounded-xl">
                Confirm reorder
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {hasMenuActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0 rounded-xl"
                aria-label={`More actions for order ${order.orderNumber}`}
              >
                <DotsThreeVerticalIcon weight="bold" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 min-w-64 rounded-2xl p-1.5 shadow-xl"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="truncate px-2 pt-1.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Order {order.orderNumber}
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              {canDownloadInvoice && (
                <OrderMenuRow
                  iconNode={<ReceiptIcon weight="duotone" aria-hidden="true" />}
                  title={downloadingInvoice ? "Downloading..." : "Invoice"}
                  hint="Download PDF"
                  disabled={downloadingInvoice}
                  onSelect={handleInvoiceDownload}
                />
              )}
              {canRaiseSupport && (
                <OrderMenuRow
                  iconNode={<ChatCircleTextIcon weight="duotone" aria-hidden="true" />}
                  title="Raise support request"
                  hint="Get help with this order"
                  onSelect={() => setSupportOpen(true)}
                />
              )}
              {order.cancellable && (
                <>
                  <DropdownMenuSeparator className="my-1.5" />
                  <OrderMenuRow
                    tone="danger"
                    iconNode={<XCircleIcon weight="duotone" aria-hidden="true" />}
                    title="Cancel order"
                    hint="Available until preparation starts"
                    onSelect={() => setCancelOpen(true)}
                    className="text-red-600 focus:bg-red-50 focus:text-red-700"
                  />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </footer>

      {order.cancellable && (
        <CancelOrderDialog order={order} open={cancelOpen} onOpenChange={setCancelOpen} />
      )}
      {canRaiseSupport && (
        <SupportRequestDialog order={order} open={supportOpen} onOpenChange={setSupportOpen} />
      )}
    </article>
  );
}
