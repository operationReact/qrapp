import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { acceptPreOrder, updatePreOrder } from "@/services/order-service";
import {
  CheckCircleIcon,
  XCircleIcon,
  CookingPotIcon,
  NoteIcon,
  CaretRightIcon,
  CalendarCheckIcon,
  HandWavingIcon,
  DotIcon,
  PencilLineIcon,
  PencilSimpleLineIcon,
} from "@phosphor-icons/react";
import { cn, isOrderPaid } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

// ── Helpers ────────────────────────────────────────────────────────────────

/** "Today · 06:30 AM" / "Tomorrow · 02:00 PM" / "Mon, 8 Jun · 06:30 AM" */
function formatScheduled(dt) {
  if (!dt) return "Not scheduled";
  const d = new Date(dt);
  const now = new Date();
  const tmw = new Date(now);
  tmw.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  if (d.toDateString() === now.toDateString()) return `Today · ${time}`;
  if (d.toDateString() === tmw.toDateString()) return `Tomorrow · ${time}`;
  return (
    d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }) + ` · ${time}`
  );
}

function formatCurrency(v) {
  return `₹${Number(v || 0).toFixed(0)}`;
}

// ── Veg dot — identical to Kitchen Queue ──────────────────────────────────
function VegDot({ isVeg }) {
  return (
    <span
      className={cn(
        "shrink-0 inline-flex size-4 rounded-[4px] border-2 items-center justify-center",
        isVeg ? "border-green-600" : "border-red-500",
      )}
    >
      <span
        className={cn(
          "block size-1.5 rounded-full",
          isVeg ? "bg-green-600" : "bg-red-500",
        )}
      />
    </span>
  );
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CFG = {
  PRE_ORDERED: {
    label: "Pending",
    dot: "bg-violet-500",
    chipCls: "bg-violet-100 text-violet-700 border-violet-200",
    strip: "bg-violet-500",
    btnCls: "bg-violet-600 active:bg-violet-700 text-white",
  },
  ORDER_PLACED: {
    label: "Accepted",
    dot: "bg-amber-400",
    chipCls: "bg-amber-100 text-amber-800 border-amber-200",
    strip: "bg-amber-400",
    btnCls: "bg-amber-500 active:bg-amber-600 text-white",
  },
  PREPARING: {
    label: "Preparing",
    dot: "bg-orange-500",
    chipCls: "bg-orange-100 text-orange-700 border-orange-200",
    strip: "bg-orange-500",
    btnCls: "bg-orange-500 active:bg-orange-600 text-white",
  },
  READY: {
    label: "Ready",
    dot: "bg-green-500",
    chipCls: "bg-green-100 text-green-700 border-green-200",
    strip: "bg-green-500",
    btnCls: "bg-green-600 active:bg-green-700 text-white",
  },
  COMPLETED: {
    label: "Completed",
    dot: "bg-slate-400",
    chipCls: "bg-slate-100 text-slate-600 border-slate-200",
    strip: "bg-slate-300",
    btnCls: null,
  },
  CANCELLED: {
    label: "Cancelled",
    dot: "bg-gray-400",
    chipCls: "bg-gray-100 text-gray-500 border-gray-200",
    strip: "bg-gray-300",
    btnCls: null,
  },
};

const NEXT_ACTION = {
  PRE_ORDERED: { label: "Accept", Icon: CheckCircleIcon },
  ORDER_PLACED: {
    status: "PREPARING",
    label: "Start Preparing",
    Icon: CookingPotIcon,
  },
  PREPARING: { status: "READY", label: "Mark Ready", Icon: CheckCircleIcon },
  READY: { status: "COMPLETED", label: "Hand Over", Icon: HandWavingIcon },
};

// ── Component ──────────────────────────────────────────────────────────────
export default function PreOrderCard({ order, onUpdated }) {
  const qc = useQueryClient();
  const [showNote, setShowNote] = useState(false);
  const [noteInput, setNoteInput] = useState(order.adminNote ?? "");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pre-orders", "admin"] });
    onUpdated?.();
  };

  const acceptMut = useMutation({
    mutationFn: ({ id, note }) => acceptPreOrder(id, note),
    onSuccess: () => {
      toast.success("Accepted — moved to kitchen queue");
      invalidate();
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message ?? "Failed to accept"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }) => updatePreOrder(id, { status }),
    onSuccess: (_, { msg }) => {
      toast.success(msg ?? "Updated");
      invalidate();
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message ?? "Failed to update"),
  });

  const noteMut = useMutation({
    mutationFn: ({ id, note }) => updatePreOrder(id, { adminNote: note }),
    onSuccess: () => {
      toast.success("Note saved");
      setShowNote(false);
      invalidate();
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message ?? "Failed to save note"),
  });

  const isOverdue =
    order.status === "PRE_ORDERED" &&
    order.scheduledAt &&
    new Date(order.scheduledAt) < new Date();
  const isDone = ["COMPLETED", "CANCELLED"].includes(order.status);
  const loading =
    acceptMut.isPending || updateMut.isPending || noteMut.isPending;
  const isPaid = isOrderPaid(order);

  const cfg = isOverdue
    ? {
        label: "Overdue",
        dot: "bg-red-500",
        chipCls: "bg-red-100 text-red-700 border-red-200",
        strip: "bg-red-500",
        btnCls: "bg-red-600 active:bg-red-700 text-white",
      }
    : (STATUS_CFG[order.status] ?? STATUS_CFG.PRE_ORDERED);

  const nextAction = NEXT_ACTION[order.status];

  const handlePrimary = () => {
    if (loading) return;
    if (order.status === "PRE_ORDERED") {
      acceptMut.mutate({ id: order.id, note: noteInput || undefined });
    } else if (nextAction?.status) {
      const msgs = {
        PREPARING: "Preparation started",
        READY: "Order marked ready",
        COMPLETED: "Order handed over",
      };
      updateMut.mutate({
        id: order.id,
        status: nextAction.status,
        msg: msgs[nextAction.status],
      });
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-lg rounded-t-none border transition-opacity",
        isOverdue
          ? "border-red-300 ring-1 ring-red-200"
          : "border-gray-100 shadow-sm",
        (isDone || loading) && "opacity-60",
      )}
    >
      {/* Colored top strip */}
      <div className={cn("h-[2px] rounded-t w-full", cfg.strip)} />

      <div className="px-3.5 pt-3 pb-3.5 flex flex-col gap-2.5">
        {/* ── Row 1: Order # + status chip + scheduled badge ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-md font-semibold leading-none">
            {order.orderNumber ?? `#${order.id}`}
          </span>
          <Badge className={cn(cfg.chipCls)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
            {cfg.label}
          </Badge>
          {/* Scheduled time badge */}
          <Badge
            className={cn(
              "sm:ml-auto",
              isOverdue
                ? "bg-red-100 text-red-700"
                : "bg-violet-50 text-violet-700",
            )}
          >
            <CalendarCheckIcon
              weight={isOverdue ? "fill" : "bold"}
              className="size-3"
            />
            {formatScheduled(order.scheduledAt)}
          </Badge>
        </div>

        {/* ── Row 2: Items ── */}
        <div className="space-y-1.5">
          {(order.items ?? []).map((item, i) => (
            <div key={i} className="flex w-fit items-center gap-0">
              <div className="flex items-center gap-2">
                <VegDot isVeg={item.isVeg} />
                <span className="flex-1 text-sm font-semibold text-secondary-foreground leading-tight truncate">
                  {item.name}
                </span>
              </div>
              <DotIcon className="size-6" />
              <span className="shrink-0 text-sm font-medium text-zinc-600 tabular-nums">
                ×{item.quantity}
              </span>
            </div>
          ))}
          {(!order.items || order.items.length === 0) && (
            <span className="text-[12px] text-gray-400 italic">No items</span>
          )}
        </div>

        {/* ── Row 3: Customer + amount + payment pill ── */}
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-50">
          <span className="flex-1 text-sm text-zinc-600 truncate">
            {order.userName
              ? `${order.userName}${order.phone ? ` · ${order.phone}` : ""}`
              : (order.phone ?? "Guest")}
          </span>
          <span className="text-sm font-semibold text-zinc-700 shrink-0">
            {formatCurrency(order.total)}
          </span>
          <Badge
            className={cn(
              isPaid
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200",
            )}
          >
            {isPaid ? "Paid" : "Unpaid"}
          </Badge>
        </div>

        {/* ── Admin note (read-only) ── */}
        {order.adminNote && !showNote && (
          <div className="flex relative items-start gap-2 text-primary text-sm bg-primary/5 rounded-sm pl-3 pr-10 py-3 border border-primary/10 flex-1">
            <NoteIcon className="size-4 shrink-0 mt-0.5" weight="fill" />
            <span className="leading-relaxed font-medium">
              {order.adminNote}
            </span>

            {!showNote && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setNoteInput(order.adminNote ?? "");
                  setShowNote(true);
                }}
                title="Edit note"
                className="absolute right-1 top-1.5"
              >
                <PencilSimpleLineIcon weight="fill" />
              </Button>
            )}
          </div>
        )}

        {/* ── Note input ── */}
        {showNote && (
          <div className="space-y-2">
            <Textarea
              rows={2}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Add an internal note…"
              className="resize-none bg-muted/50"
            />
            <div className="flex gap-2">
              <Button
                disabled={loading}
                onClick={() =>
                  noteMut.mutate({ id: order.id, note: noteInput })
                }
              >
                Save
              </Button>
              <Button onClick={() => setShowNote(false)} variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Actions: primary button + reject + note ── */}
        {!isDone && nextAction && (
          <div className="flex gap-2">
            <button
              onClick={handlePrimary}
              disabled={loading}
              className={cn(
                "flex-1 flex items-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-all select-none",
                isOverdue
                  ? "bg-red-600 active:bg-red-700 text-white"
                  : (cfg.btnCls ?? "bg-gray-700 text-white"),
                loading && "opacity-50 cursor-not-allowed",
              )}
            >
              <nextAction.Icon weight="bold" className="size-4 shrink-0" />
              <span className="flex-1 text-left">{nextAction.label}</span>
              <CaretRightIcon weight="bold" className="size-3.5 shrink-0" />
            </button>

            {/* Reject button — icon only */}
            {["PRE_ORDERED", "ORDER_PLACED", "PREPARING"].includes(
              order.status,
            ) && (
              <Button
                disabled={loading}
                variant="destructive"
                size="icon-lg"
                onClick={() => {
                  if (window.confirm("Cancel this pre-order?")) {
                    updateMut.mutate({
                      id: order.id,
                      status: "CANCELLED",
                      msg: "Pre-order cancelled",
                    });
                  }
                }}
              >
                <XCircleIcon weight="bold" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
