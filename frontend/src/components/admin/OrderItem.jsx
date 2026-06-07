import { cn, isOrderPaid } from "@/lib/utils";
import {
  ClockCountdownIcon,
  CreditCardIcon,
  WarningCircleIcon,
  CheckCircleIcon,
  CookingPotIcon,
  PackageIcon,
  XCircleIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { Button } from "../ui/button";

const STATUS_CONFIG = {
  PLACED: {
    label: "New Order",
    timeLabel: "Waiting",
    accent: "border-l-violet-500",
    bg: "bg-violet-50/60",
    badgeCls: "bg-violet-100 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    Icon: PackageIcon,
  },
  PREPARING: {
    label: "Preparing",
    timeLabel: "Cooking",
    accent: "border-l-orange-500",
    bg: "bg-orange-50/50",
    badgeCls: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
    Icon: CookingPotIcon,
  },
  READY: {
    label: "Ready",
    timeLabel: "Ready",
    accent: "border-l-emerald-500",
    bg: "bg-emerald-50/50",
    badgeCls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    Icon: CheckCircleIcon,
  },
  COMPLETED: {
    label: "Completed",
    timeLabel: "Done",
    accent: "border-l-slate-400",
    bg: "",
    badgeCls: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    Icon: CheckCircleIcon,
  },
  CANCELLED: {
    label: "Cancelled",
    timeLabel: "",
    accent: "border-l-rose-400",
    bg: "bg-rose-50/30",
    badgeCls: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "bg-rose-400",
    Icon: XCircleIcon,
  },
};
STATUS_CONFIG.ORDER_PLACED = STATUS_CONFIG.PLACED;

// Operational labels for transition buttons
const TRANSITION_LABELS = {
  PREPARING: { label: "Start Preparing", icon: CookingPotIcon },
  READY: { label: "Mark Ready", icon: CheckCircleIcon },
  COMPLETED: { label: "Hand Over", icon: ArrowRightIcon },
  CANCELLED: { label: "Cancel", icon: XCircleIcon },
};

function configFor(status) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.PLACED;
}

/** Convert raw minutes → "15m" / "2h" / "1d 3h" */
function formatAge(minutes) {
  const m = minutes ?? 0;
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

function elapsedLabel(config, minutes) {
  if (!config.timeLabel) return null;
  return `${config.timeLabel} ${formatAge(minutes)}`;
}

// ── Component ──────────────────────────────────────────────────────────────
/**
 * OrderItem — operational card for the queue list.
 *
 * onAction(orderId, nextStatus) — optional. When provided, renders quick-action
 * buttons that stop propagation so the parent <Link> is not triggered.
 */
export default function OrderItem({ order, className, onAction }) {
  const config = configFor(order.status);
  const isDelayed = order.delayed;

  const totalItems = (order.items || []).reduce(
    (s, i) => s + (i.quantity || 1),
    0,
  );

  return (
    <article
      className={cn(
        "border-l-4 rounded-r-lg rounded-l-none px-3 py-3 transition-colors",
        config.accent,
        config.bg,
        isDelayed && "ring-1 ring-red-500/40",
        className,
      )}
    >
      {/* ── Row 1: order number + status chip + time ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold leading-none">
            {order.orderNumber ?? `#${order.id}`}
          </span>

          {/* Status chip */}
          <span
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              config.badgeCls,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
            {config.label}
          </span>
        </div>

        {/* Elapsed time — operational language */}
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
            isDelayed
              ? "bg-rose-100 text-rose-700"
              : order.stageAgeMinutes >= 10
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600",
          )}
        >
          {isDelayed && <WarningCircleIcon weight="fill" className="size-3" />}
          <ClockCountdownIcon weight="bold" className="size-3" />
          {isDelayed
            ? `Delayed ${formatAge(order.stageAgeMinutes)}`
            : elapsedLabel(config, order.stageAgeMinutes)}
        </span>
      </div>

      {/* ── Row 2: customer info + meta ── */}
      <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-gray-500">
        {order.userName && (
          <>
            <span className="font-semibold text-zinc-800">
              {order.userName}
            </span>
            <span>·</span>
          </>
        )}
        <span className="font-medium text-zinc-700">{order.phone}</span>
        <span>·</span>
        <span>
          {totalItems} item{totalItems !== 1 ? "s" : ""}
        </span>
        <span>·</span>
        <span className="font-semibold text-foreground">
          ₹{Number(order.total || 0).toFixed(0)}
        </span>
        <span>·</span>
        {isOrderPaid(order) ? (
          <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
            <CreditCardIcon weight="fill" className="size-3" /> Paid
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-amber-600 font-medium">
            <CreditCardIcon weight="duotone" className="size-3" /> Unpaid
          </span>
        )}
      </div>

      {/* ── Row 3: item names preview ── */}
      {order.items?.length > 0 && (
        <p className="mt-1.5 line-clamp-1 text-[12px] text-gray-500 leading-snug">
          {order.items
            .slice(0, 3)
            .map((i) => `${i.name} ×${i.quantity}`)
            .join(" · ")}
          {order.items.length > 3 && ` +${order.items.length - 3} more`}
        </p>
      )}

      {/* ── Row 4: quick action buttons (optional) ── */}
      {onAction && order.availableTransitions?.length > 0 && (
        <div
          className="mt-2.5 flex flex-wrap gap-1.5"
          onClick={(e) => e.preventDefault()}
        >
          {order.availableTransitions.slice(0, 3).map((nextStatus, idx) => {
            const meta = TRANSITION_LABELS[nextStatus];
            const BtnIcon = meta?.icon ?? ArrowRightIcon;
            const isPrimary = idx === 0;
            return (
              <Button
                size="sm"
                variant={isPrimary ? "" : "outline"}
                key={nextStatus}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAction(order.id, nextStatus);
                }}
                className={
                  isPrimary && "bg-zinc-900 text-background hover:bg-zinc-700"
                }
              >
                <BtnIcon weight="bold" className="size-3.5" />
                {meta?.label ?? `→ ${nextStatus}`}
              </Button>
            );
          })}
        </div>
      )}
    </article>
  );
}
