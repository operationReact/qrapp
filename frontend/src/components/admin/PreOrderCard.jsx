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
} from "@phosphor-icons/react";
import { cn, isOrderPaid } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────

/** "Today · 06:30 AM" / "Tomorrow · 02:00 PM" / "Mon, 8 Jun · 06:30 AM" */
function formatScheduled(dt) {
  if (!dt) return "Not scheduled";
  const d   = new Date(dt);
  const now = new Date();
  const tmw = new Date(now); tmw.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  if (d.toDateString() === now.toDateString()) return `Today · ${time}`;
  if (d.toDateString() === tmw.toDateString()) return `Tomorrow · ${time}`;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) + ` · ${time}`;
}

function formatCurrency(v) { return `₹${Number(v || 0).toFixed(0)}`; }

// ── Veg dot — identical to Kitchen Queue ──────────────────────────────────
function VegDot({ isVeg }) {
  return (
    <span className={cn(
      "shrink-0 inline-flex h-3 w-3 rounded-sm border-2 items-center justify-center mt-px",
      isVeg ? "border-green-600" : "border-red-500",
    )}>
      <span className={cn("block h-1.5 w-1.5 rounded-full", isVeg ? "bg-green-600" : "bg-red-500")} />
    </span>
  );
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CFG = {
  PRE_ORDERED:  { label: "Pending",   dot: "bg-violet-500", chipCls: "bg-violet-100 text-violet-700 border-violet-200",  strip: "bg-violet-500",  btnCls: "bg-violet-600 active:bg-violet-700 text-white" },
  ORDER_PLACED: { label: "Accepted",  dot: "bg-amber-400",  chipCls: "bg-amber-100 text-amber-800 border-amber-200",     strip: "bg-amber-400",   btnCls: "bg-amber-500 active:bg-amber-600 text-white" },
  PREPARING:    { label: "Preparing", dot: "bg-orange-500", chipCls: "bg-orange-100 text-orange-700 border-orange-200",  strip: "bg-orange-500",  btnCls: "bg-orange-500 active:bg-orange-600 text-white" },
  READY:        { label: "Ready",     dot: "bg-green-500",  chipCls: "bg-green-100 text-green-700 border-green-200",     strip: "bg-green-500",   btnCls: "bg-green-600 active:bg-green-700 text-white" },
  COMPLETED:    { label: "Completed", dot: "bg-slate-400",  chipCls: "bg-slate-100 text-slate-600 border-slate-200",     strip: "bg-slate-300",   btnCls: null },
  CANCELLED:    { label: "Cancelled", dot: "bg-gray-400",   chipCls: "bg-gray-100 text-gray-500 border-gray-200",        strip: "bg-gray-300",    btnCls: null },
};

const NEXT_ACTION = {
  PRE_ORDERED:  { label: "Accept",           Icon: CheckCircleIcon },
  ORDER_PLACED: { status: "PREPARING",       label: "Start Preparing", Icon: CookingPotIcon  },
  PREPARING:    { status: "READY",           label: "Mark Ready",      Icon: CheckCircleIcon },
  READY:        { status: "COMPLETED",       label: "Hand Over",       Icon: HandWavingIcon  },
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

  const isOverdue = order.status === "PRE_ORDERED" && order.scheduledAt && new Date(order.scheduledAt) < new Date();
  const isDone    = ["COMPLETED", "CANCELLED"].includes(order.status);
  const loading   = acceptMut.isPending || updateMut.isPending || noteMut.isPending;
  const isPaid    = isOrderPaid(order);

  const cfg = isOverdue
    ? { label: "Overdue", dot: "bg-red-500", chipCls: "bg-red-100 text-red-700 border-red-200", strip: "bg-red-500", btnCls: "bg-red-600 active:bg-red-700 text-white" }
    : (STATUS_CFG[order.status] ?? STATUS_CFG.PRE_ORDERED);

  const nextAction = NEXT_ACTION[order.status];

  const handlePrimary = () => {
    if (loading) return;
    if (order.status === "PRE_ORDERED") {
      acceptMut.mutate({ id: order.id, note: noteInput || undefined });
    } else if (nextAction?.status) {
      const msgs = { PREPARING: "Preparation started", READY: "Order marked ready", COMPLETED: "Order handed over" };
      updateMut.mutate({ id: order.id, status: nextAction.status, msg: msgs[nextAction.status] });
    }
  };

  return (
    <div className={cn(
      "bg-white rounded-2xl border overflow-hidden transition-opacity",
      isOverdue ? "border-red-300 ring-1 ring-red-200" : "border-gray-100 shadow-sm",
      (isDone || loading) && "opacity-60",
    )}>
      {/* Colored top strip */}
      <div className={cn("h-[3px] w-full", cfg.strip)} />

      <div className="px-3.5 pt-3 pb-3.5 flex flex-col gap-2.5">

        {/* ── Row 1: Order # + status chip + scheduled badge ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-black text-gray-900 tracking-tight leading-none">
            {order.orderNumber ?? `#${order.id}`}
          </span>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border", cfg.chipCls)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
            {cfg.label}
          </span>
          {/* Scheduled time badge */}
          <span className={cn(
            "ml-auto shrink-0 flex items-center gap-0.5 text-[11px] font-semibold tabular-nums rounded-full px-2 py-0.5",
            isOverdue ? "bg-red-100 text-red-700" : "bg-violet-50 text-violet-600",
          )}>
            <CalendarCheckIcon weight={isOverdue ? "fill" : "regular"} className="size-3" />
            {formatScheduled(order.scheduledAt)}
          </span>
        </div>

        {/* ── Row 2: Items ── */}
        <div className="space-y-1.5">
          {(order.items ?? []).map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <VegDot isVeg={item.isVeg} />
              <span className="flex-1 text-[13px] font-semibold text-gray-800 leading-tight truncate">{item.name}</span>
              <span className="shrink-0 text-[12px] font-bold text-gray-400 tabular-nums">×{item.quantity}</span>
            </div>
          ))}
          {(!order.items || order.items.length === 0) && (
            <span className="text-[12px] text-gray-400 italic">No items</span>
          )}
        </div>

        {/* ── Row 3: Customer + amount + payment pill ── */}
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-50">
          <span className="flex-1 text-[11px] text-gray-400 truncate">
            {order.userName
              ? `${order.userName}${order.phone ? ` · ${order.phone}` : ""}`
              : (order.phone ?? "Guest")}
          </span>
          <span className="text-[12px] font-bold text-gray-700 shrink-0">{formatCurrency(order.total)}</span>
          <span className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold border",
            isPaid ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200",
          )}>
            {isPaid ? "Paid" : "Unpaid"}
          </span>
        </div>

        {/* ── Admin note (read-only) ── */}
        {order.adminNote && !showNote && (
          <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
            <NoteIcon className="size-3.5 mt-0.5 shrink-0 text-amber-500" weight="fill" />
            <span className="leading-relaxed">{order.adminNote}</span>
          </div>
        )}

        {/* ── Note input ── */}
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
              <button
                disabled={loading}
                onClick={() => noteMut.mutate({ id: order.id, note: noteInput })}
                className="flex-1 h-8 rounded-lg bg-violet-600 text-white text-xs font-bold disabled:opacity-50 active:bg-violet-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowNote(false)}
                className="h-8 px-4 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
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
                "flex-1 flex items-center gap-2 rounded-xl py-3 px-4 text-[13px] font-bold transition-all select-none",
                isOverdue ? "bg-red-600 active:bg-red-700 text-white" : (cfg.btnCls ?? "bg-gray-700 text-white"),
                loading && "opacity-50 cursor-not-allowed",
              )}
            >
              <nextAction.Icon weight="bold" className="size-4 shrink-0" />
              <span className="flex-1 text-left">{nextAction.label}</span>
              <CaretRightIcon weight="bold" className="size-3.5 shrink-0" />
            </button>

            {/* Reject button — icon only */}
            {["PRE_ORDERED", "ORDER_PLACED", "PREPARING"].includes(order.status) && (
              <button
                disabled={loading}
                onClick={() => {
                  if (window.confirm("Cancel this pre-order?")) {
                    updateMut.mutate({ id: order.id, status: "CANCELLED", msg: "Pre-order cancelled" });
                  }
                }}
                className="flex items-center justify-center w-11 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50"
              >
                <XCircleIcon weight="bold" className="size-5" />
              </button>
            )}

            {/* Note button — icon only */}
            {!showNote && (
              <button
                onClick={() => { setNoteInput(order.adminNote ?? ""); setShowNote(true); }}
                className="flex items-center justify-center w-11 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <NoteIcon className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

