import { useState } from "react";
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
  CalendarIcon,
  CheckCircleIcon,
  CookingPotIcon,
  ImageIcon,
} from "@phosphor-icons/react";
import { baseURL } from "@/services";
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
    <div className={cn("flex min-w-0 items-center gap-1.5 text-sm font-semibold", meta.tone)}>
      <Icon weight="duotone" className="size-4 shrink-0" aria-hidden="true" />
      <span>{meta.label}</span>
    </div>
  );
}

function OrderProgress({ status }) {
  const normalizedStatus = normalizeOrderStatus(status);
  const statusMeta = getOrderStatusMeta(status);
  const StatusIcon = statusMeta.icon;

  if (normalizedStatus === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        <StatusIcon weight="duotone" className="size-4 shrink-0" aria-hidden="true" />
        <span>This order was cancelled.</span>
      </div>
    );
  }

  if (normalizedStatus === "COMPLETED") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
        <CheckCircleIcon weight="fill" className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
        <span>Order completed</span>
      </div>
    );
  }

  const currentStep = statusMeta.step ?? 0;

  return (
    <div
      className="flex min-w-0 items-center gap-1"
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
          className="min-h-11 flex-1 gap-2 rounded-xl"
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

export default function OrderCard({ order }) {
  const status = normalizeOrderStatus(order.status);
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;

  return (
    <article className="box-border w-full min-w-0 max-w-full rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md sm:p-4">
      <header className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <StatusBadge status={status} />
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

      <div className="mt-4 min-w-0 rounded-xl border border-border/70 bg-muted/30 p-3">
        <OrderProgress status={status} />
      </div>

      <section className="mt-4 min-w-0" aria-label="Order items">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Items</h3>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
        <OrderItemsPreview order={order} />
      </section>

      <div className="mt-4 flex min-w-0 items-center justify-between gap-3 border-t border-border pt-3">
        <PaymentStatus status={order.paymentStatus} />
        <OrderItemsDrawer order={order} />
      </div>
    </article>
  );
}
