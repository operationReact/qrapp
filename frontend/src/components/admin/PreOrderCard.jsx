import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { acceptPreOrder, updatePreOrder } from "@/services/order-service";
import { Button } from "@/components/ui/button";
import {
  CheckCircleIcon,
  XCircleIcon,
  CookingPotIcon,
  NoteIcon,
  CaretRightIcon,
  CalendarCheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────

/** "Mon, 8 Jun · 06:30 AM" */
function formatScheduled(dt) {
  if (!dt) return "Not scheduled";
  const d = new Date(dt);
  return (
    d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

// ── Veg dot — matches Kitchen Queue exactly ────────────────────────────────
function VegDot({ isVeg }) {
  return (
    <span className={cn(
      "inline-flex shrink-0 h-3 w-3 rounded-sm border-2 items-center justify-center mt-0.5",
      isVeg ? "border-green-600" : "border-red-500",
    )}>
      <span className={cn("block h-1.5 w-1.5 rounded-full", isVeg ? "bg-green-600" : "bg-red-500")} />
    </span>
  );
}

// ── Status config — mirrors Kitchen Queue stage colours ─────────────────────
const STATUS_CFG = {
  PRE_ORDERED:  {
    label: "Pending",
    pill: "bg-violet-100 text-violet-700",
    cardBorder: "border-violet-200",
  },
  ORDER_PLACED: {
    label: "Accepted",
    pill: "bg-amber-100 text-amber-800",
    cardBorder: "border-amber-200",
  },
  PREPARING:    {
    label: "Preparing",
    pill: "bg-sky-100 text-sky-800",
    cardBorder: "border-sky-200",
  },
  READY:        {
    label: "Ready",
    pill: "bg-emerald-100 text-emerald-800",
    cardBorder: "border-emerald-200",
  },
  COMPLETED:    { label: "Completed", pill: "bg-green-100 text-green-700",  cardBorder: "border-gray-200" },
  CANCELLED:    { label: "Cancelled", pill: "bg-gray-100 text-gray-500",    cardBorder: "border-gray-200" },
};

// ── Component ──────────────────────────────────────────────────────────────
export default function PreOrderCard({ order, onUpdated }) {
  const qc = useQueryClient();
  const [showNote,  setShowNote]  = useState(false);
  const [noteInput, setNoteInput] = useState(order.adminNote ?? "");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pre-orders", "admin"] });
    onUpdated?.();
  };

  const acceptMut = useMutation({
    mutationFn: ({ id, note }) => acceptPreOrder(id, note),
    onSuccess: () => { toast.success("Accepted — moved to kitchen queue"); invalidate(); },
    onError:   (e) => toast.error(e?.response?.data?.message ?? "Failed to accept"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }) => updatePreOrder(id, { status }),
    onSuccess: (_, { msg }) => { toast.success(msg ?? "Updated"); invalidate(); },
    onError:   (e) => toast.error(e?.response?.data?.message ?? "Failed to update"),
  });

  const noteMut = useMutation({
    mutationFn: ({ id, note }) => updatePreOrder(id, { adminNote: note }),
    onSuccess: () => { toast.success("Note saved"); setShowNote(false); invalidate(); },
    onError:   (e) => toast.error(e?.response?.data?.message ?? "Failed to save note"),
  });

  const isPending   = order.status === "PRE_ORDERED";
  const isAccepted  = order.status === "ORDER_PLACED";
  const isPreparing = order.status === "PREPARING";
  const isReady     = order.status === "READY";
  const isDone      = ["COMPLETED", "CANCELLED"].includes(order.status);
  const isOverdue   = isPending && order.scheduledAt && new Date(order.scheduledAt) < new Date();
  const loading     = acceptMut.isPending || updateMut.isPending || noteMut.isPending;

  const cfg = isOverdue
    ? { label: "Overdue", pill: "bg-rose-100 text-rose-700", cardBorder: "border-rose-300" }
    : (STATUS_CFG[order.status] ?? STATUS_CFG.PRE_ORDERED);

  const hasActions = !isDone;

  return (
    <div className={cn(
      "bg-white rounded-2xl border shadow-sm flex flex-col gap-3 p-4 transition-all",
      isOverdue
        ? "border-rose-300 shadow-rose-100 ring-1 ring-rose-200"
        : cfg.cardBorder,
      isDone && "opacity-60",
    )}>

      {/* ── Header row — order number + customer + amount ─────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-extrabold leading-none text-gray-900">
              {order.orderNumber ?? `#${order.id}`}
            </span>
            {/* Status pill */}
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none border",
              cfg.pill,
              isOverdue ? "border-rose-200" : "border-transparent",
            )}>
              {cfg.label}
            </span>
            {isOverdue && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-rose-600">
                <WarningCircleIcon weight="fill" className="size-3" />
                Overdue
              </span>
            )}
          </div>
          {/* Customer */}
          <span className="text-[12px] text-gray-400 mt-0.5">
            {[order.userName, order.phone].filter(Boolean).join(" · ")}
          </span>
        </div>
        <span className="shrink-0 text-[13px] font-bold text-gray-700">
          {formatCurrency(order.total)}
        </span>
      </div>

      {/* ── Scheduled metadata — secondary, compact ────────────────────── */}
      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
        <CalendarCheckIcon className="size-3 shrink-0" weight="fill" />
        <span>Scheduled: {formatScheduled(order.scheduledAt)}</span>
        <span className="text-gray-300">·</span>
        <span>{order.totalItems ?? 0} item{(order.totalItems ?? 0) !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Items list — dashed border, same as KitchenCard ─────────────── */}
      {order.items?.length > 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 divide-y divide-gray-100">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <VegDot isVeg={item.isVeg} />
              <span className="flex-1 text-[13px] font-medium text-gray-800 leading-snug truncate">
                {item.name}
              </span>
              <span className="shrink-0 text-[13px] font-bold text-gray-900">
                ×{item.quantity}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Admin note ──────────────────────────────────────────────────── */}
      {order.adminNote && !showNote && (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
          <NoteIcon className="size-3.5 mt-0.5 shrink-0 text-amber-500" weight="fill" />
          <span className="leading-relaxed">{order.adminNote}</span>
        </div>
      )}

      {/* ── Note input ──────────────────────────────────────────────────── */}
      {showNote && (
        <div className="space-y-2">
          <textarea
            rows={2}
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Add an internal note…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white transition-all"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 text-xs bg-violet-600 hover:bg-violet-700"
              disabled={loading}
              onClick={() => noteMut.mutate({ id: order.id, note: noteInput })}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowNote(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Action buttons — same h-10 rounded-xl pattern as KitchenCard ── */}
      {hasActions && (
        <div className="flex flex-wrap gap-2 pt-1">

          {isPending && (
            <Button
              size="sm"
              variant="default"
              disabled={loading}
              className="flex-1 gap-1.5 h-10 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-700"
              onClick={() => acceptMut.mutate({ id: order.id, note: noteInput || undefined })}
            >
              <CheckCircleIcon weight="bold" className="size-4" />
              Accept
              <CaretRightIcon weight="bold" className="size-3.5" />
            </Button>
          )}

          {isAccepted && (
            <Button
              size="sm"
              variant="default"
              disabled={loading}
              className="flex-1 gap-1.5 h-10 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-600"
              onClick={() => updateMut.mutate({ id: order.id, status: "PREPARING", msg: "Preparation started" })}
            >
              <CookingPotIcon weight="bold" className="size-4" />
              Start Preparation
              <CaretRightIcon weight="bold" className="size-3.5" />
            </Button>
          )}

          {isPreparing && (
            <Button
              size="sm"
              variant="default"
              disabled={loading}
              className="flex-1 gap-1.5 h-10 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700"
              onClick={() => updateMut.mutate({ id: order.id, status: "READY", msg: "Order marked ready" })}
            >
              <CheckCircleIcon weight="bold" className="size-4" />
              Mark Ready
              <CaretRightIcon weight="bold" className="size-3.5" />
            </Button>
          )}

          {isReady && (
            <div className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
              <CheckCircleIcon weight="fill" className="size-4" />
              Ready to Serve
            </div>
          )}

          {/* Reject — secondary outline, only when still actionable */}
          {(isPending || isAccepted || isPreparing) && (
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              className="gap-1.5 h-10 rounded-xl font-semibold text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              onClick={() => {
                if (window.confirm("Cancel this pre-order?")) {
                  updateMut.mutate({ id: order.id, status: "CANCELLED", msg: "Pre-order cancelled" });
                }
              }}
            >
              <XCircleIcon weight="bold" className="size-4" />
              Reject
            </Button>
          )}

          {/* Note icon button */}
          {!showNote && (
            <Button
              size="sm"
              variant="ghost"
              title={order.adminNote ? "Edit note" : "Add note"}
              className="h-10 w-10 p-0 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              onClick={() => { setNoteInput(order.adminNote ?? ""); setShowNote(true); }}
            >
              <NoteIcon className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

