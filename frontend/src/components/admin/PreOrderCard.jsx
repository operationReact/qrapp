import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { acceptPreOrder, updatePreOrder } from "@/services/order-service";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockCountdownIcon,
  UserIcon,
  PhoneIcon,
  NoteIcon,
  CurrencyInrIcon,
  ShoppingBagIcon,
  CaretDownIcon,
  WarningCircleIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ── Helpers ────────────────────────────────────────────────────────────────
function formatScheduled(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function getCountdownLabel(dt) {
  if (!dt) return null;
  const diff = new Date(dt).getTime() - Date.now();
  const absMin = Math.abs(Math.floor(diff / 60000));
  const isPast = diff < 0;

  if (absMin < 60) return { text: `${absMin}m`, past: isPast };
  if (absMin < 1440) return { text: `${Math.floor(absMin / 60)}h ${absMin % 60}m`, past: isPast };
  const days = Math.floor(absMin / 1440);
  return { text: `${days}d ${Math.floor((absMin % 1440) / 60)}h`, past: isPast };
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_STYLES = {
  PRE_ORDERED: { label: "Pre-Ordered", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  ORDER_PLACED: { label: "Accepted", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  PREPARING:   { label: "Preparing", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  READY:       { label: "Ready", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  COMPLETED:   { label: "Completed", cls: "bg-green-50 text-green-700 border-green-200" },
  CANCELLED:   { label: "Cancelled", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_STYLES[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600" };
  return <Badge className={cn("h-6 text-xs font-medium border", cfg.cls)}>{cfg.label}</Badge>;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function PreOrderCard({ order, onUpdated }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [noteInput, setNoteInput] = useState(order.adminNote ?? "");
  const [showNoteBox, setShowNoteBox] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pre-orders", "admin"] });
    onUpdated?.();
  };

  const acceptMutation = useMutation({
    mutationFn: ({ id, note }) => acceptPreOrder(id, note),
    onSuccess: () => { toast.success("Pre-order accepted and moved to queue"); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Failed to accept"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => updatePreOrder(id, { status: "CANCELLED" }),
    onSuccess: () => { toast.success("Pre-order cancelled"); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Failed to cancel"),
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, note }) => updatePreOrder(id, { adminNote: note }),
    onSuccess: () => { toast.success("Note saved"); setShowNoteBox(false); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Failed to save note"),
  });

  const isPending = order.status === "PRE_ORDERED";
  const isActive  = !["CANCELLED", "COMPLETED", "PRE_ORDERED"].includes(order.status);
  const countdown = getCountdownLabel(order.scheduledAt);
  const isOverdue = countdown?.past && isPending;
  const loading = acceptMutation.isPending || cancelMutation.isPending || noteMutation.isPending;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border transition-shadow hover:shadow-md",
        isOverdue && "border-red-300 bg-red-50/30",
        isPending && !isOverdue && "border-violet-200",
        order.status === "CANCELLED" && "opacity-60",
      )}
    >
      {/* Accent bar */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
          isOverdue ? "bg-red-400" :
          isPending ? "bg-violet-400" :
          isActive  ? "bg-amber-400" : "bg-zinc-300",
        )}
      />

      <CardHeader className="pl-5 pb-2 pt-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          {/* Left: order number + status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5">
              {order.orderNumber ?? `#${order.id}`}
            </span>
            <StatusBadge status={order.status} />
            {isOverdue && (
              <Badge className="bg-red-100 text-red-700 border-red-200 h-6 text-xs gap-1">
                <WarningCircleIcon className="size-3" weight="fill" />
                Overdue
              </Badge>
            )}
          </div>
          {/* Right: countdown + scheduled */}
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {countdown && (
              <span
                className={cn(
                  "flex items-center gap-1 font-semibold rounded-full px-2 py-0.5 border text-xs",
                  countdown.past
                    ? "bg-red-50 text-red-600 border-red-200"
                    : "bg-violet-50 text-violet-700 border-violet-200",
                )}
              >
                <ClockCountdownIcon className="size-3" weight="fill" />
                {countdown.past ? "overdue by " : "in "}{countdown.text}
              </span>
            )}
          </div>
        </div>

        {/* Scheduled time */}
        <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-zinc-700">
          <CalendarCheckIcon className="size-4 text-violet-500" weight="fill" />
          <span>Scheduled for: {formatScheduled(order.scheduledAt)}</span>
        </div>
      </CardHeader>

      <CardContent className="pl-5">
        {/* Customer info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 mb-3">
          {order.userName && (
            <span className="flex items-center gap-1">
              <UserIcon className="size-3.5 text-zinc-400" weight="fill" />
              {order.userName}
            </span>
          )}
          {order.phone && (
            <span className="flex items-center gap-1">
              <PhoneIcon className="size-3.5 text-zinc-400" weight="fill" />
              {order.phone}
            </span>
          )}
          <span className="flex items-center gap-1 font-semibold text-zinc-800">
            <CurrencyInrIcon className="size-3.5 text-emerald-500" weight="fill" />
            {formatCurrency(order.total)}
          </span>
          <span className="flex items-center gap-1">
            <ShoppingBagIcon className="size-3.5 text-zinc-400" weight="fill" />
            {order.totalItems} {order.totalItems === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Admin note */}
        {order.adminNote && !showNoteBox && (
          <div className="mb-3 flex items-start gap-1.5 text-xs text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-200">
            <NoteIcon className="size-3.5 mt-0.5 shrink-0 text-amber-500" weight="fill" />
            <span>{order.adminNote}</span>
          </div>
        )}

        {/* Note input */}
        {showNoteBox && (
          <div className="mb-3 space-y-1.5">
            <textarea
              className="w-full rounded-lg border border-zinc-200 text-sm p-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
              rows={2}
              placeholder="Add an internal note…"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={loading}
                onClick={() => noteMutation.mutate({ id: order.id, note: noteInput })}
              >Save note</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNoteBox(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Items collapsible */}
        {order.items?.length > 0 && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 mb-2 transition-colors">
                <CaretDownIcon
                  className={cn("size-3 transition-transform", expanded && "rotate-180")}
                />
                {expanded ? "Hide" : "Show"} items ({order.items.length})
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mb-3 rounded-lg border border-zinc-100 divide-y divide-zinc-100 text-sm overflow-hidden">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="size-8 rounded object-cover shrink-0" />
                    ) : (
                      <div className="size-8 rounded bg-zinc-100 shrink-0" />
                    )}
                    <span className="flex-1 text-zinc-700 font-medium truncate">{item.name}</span>
                    <span className="text-zinc-400 text-xs">×{item.quantity}</span>
                    <span className="text-zinc-600 font-medium text-xs ml-1">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-1">
          {isPending && (
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold"
              disabled={loading}
              onClick={() => acceptMutation.mutate({ id: order.id, note: noteInput || undefined })}
            >
              <CheckCircleIcon className="size-3.5" weight="fill" />
              Accept &amp; Queue
            </Button>
          )}
          {(isPending || isActive) && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 text-xs"
              disabled={loading}
              onClick={() => {
                if (window.confirm("Cancel this pre-order?")) cancelMutation.mutate(order.id);
              }}
            >
              <XCircleIcon className="size-3.5" weight="fill" />
              Cancel
            </Button>
          )}
          {!showNoteBox && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs text-zinc-500 hover:text-zinc-700"
              onClick={() => { setNoteInput(order.adminNote ?? ""); setShowNoteBox(true); }}
            >
              <NoteIcon className="size-3.5" />
              {order.adminNote ? "Edit note" : "Add note"}
            </Button>
          )}
          {isActive && (
            <span className="ml-auto flex items-center gap-1 text-xs text-zinc-400">
              <ArrowRightIcon className="size-3" />
              In kitchen queue
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

