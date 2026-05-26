import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  acceptPartyOrderEstimate,
  rejectPartyOrderEstimate,
  payPartyOrderAdvance,
  requestPartyOrderCallback,
  cancelMyPartyOrder,
} from "@/services/party-order-service";
import { toast } from "sonner";
import CountdownTimer from "@/components/CountdownTimer";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  CalendarIcon, UsersIcon, MapPinIcon, PhoneIcon,
} from "@phosphor-icons/react";

const ADMIN_PHONE = import.meta.env.VITE_ADMIN_PHONE || "";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function formatCurrency(v) {
  if (v == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

const STATUS_STYLES = {
  NEW:              "bg-sky-50 text-sky-700 border-sky-200",
  UNDER_REVIEW:     "bg-orange-50 text-orange-700 border-orange-200",
  PENDING_ESTIMATE: "bg-amber-50 text-amber-700 border-amber-200",
  ESTIMATE_SENT:    "bg-violet-50 text-violet-700 border-violet-200",
  ESTIMATE_EXPIRED: "bg-red-50 text-red-700 border-red-200",
  ADVANCE_PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED:         "bg-red-50 text-red-700 border-red-200",
  CANCELLED:        "bg-zinc-100 text-zinc-500 border-zinc-200",
  COMPLETED:        "bg-green-50 text-green-700 border-green-200",
};

const STATUS_LABEL = {
  NEW: "Submitted",
  UNDER_REVIEW: "Under Review",
  PENDING_ESTIMATE: "Awaiting Estimate",
  ESTIMATE_SENT: "Estimate Ready",
  ESTIMATE_EXPIRED: "Estimate Expired",
  ADVANCE_PENDING: "Advance Pending",
  CONFIRMED: "Booking Confirmed",
  REJECTED: "Estimate Rejected",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200";
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {STATUS_LABEL[status] ?? status?.replace(/_/g, " ") ?? "—"}
    </span>
  );
}

export default function UserPartyOrderCard({ order }) {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState(null); // { type, title, description }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["my-party-orders"] });

  const acceptMut = useMutation({
    mutationFn: () => acceptPartyOrderEstimate(order.id),
    onSuccess: () => { invalidate(); toast.success("Estimate accepted! Please pay the advance."); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to accept estimate"),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectPartyOrderEstimate(order.id),
    onSuccess: () => { invalidate(); toast.success("Estimate rejected."); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to reject estimate"),
  });

  const payMut = useMutation({
    mutationFn: () => payPartyOrderAdvance(order.id),
    onSuccess: () => { invalidate(); toast.success("Advance payment confirmed! Booking is now confirmed."); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to process payment"),
  });

  const callbackMut = useMutation({
    mutationFn: () => requestPartyOrderCallback(order.id),
    onSuccess: () => { invalidate(); toast.success("Callback requested. Our team will contact you shortly."); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to request callback"),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelMyPartyOrder(order.id),
    onSuccess: () => { invalidate(); toast.success("Order cancelled."); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to cancel order"),
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "accept") acceptMut.mutate();
    else if (confirmAction.type === "reject") rejectMut.mutate();
    else if (confirmAction.type === "pay") payMut.mutate();
    else if (confirmAction.type === "cancel") cancelMut.mutate();
    setConfirmAction(null);
  };

  const CONFIRM_STYLES = {
    accept: { label: "Accept Estimate", className: "touch-button rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white" },
    reject: { label: "Reject", className: "touch-button rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white" },
    pay:    { label: "Confirm Payment", className: "touch-button rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white" },
    cancel: { label: "Cancel Order", className: "touch-button rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white" },
  };

  const menuItems = Array.isArray(order.menuItems) ? order.menuItems : [];
  const totalAmount = order.estimatedTotalAmount ?? order.estimatedAmount;
  const isEstimateSent = order.status === "ESTIMATE_SENT";
  const isAdvancePending = order.status === "ADVANCE_PENDING";
  const isConfirmed = order.status === "CONFIRMED";
  const canCancel = ["NEW", "UNDER_REVIEW", "PENDING_ESTIMATE", "ESTIMATE_SENT"].includes(order.status);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{order.eventType || "Party Order"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">#{order.id}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-2.5 px-4 pb-4">
          {/* Event date */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarIcon weight="bold" className="size-3.5 text-primary shrink-0" />
            <span>{formatDate(order.eventDateTime)}</span>
          </div>

          {/* Head count */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UsersIcon weight="bold" className="size-3.5 text-primary shrink-0" />
            <span>{order.numberOfPeople} people</span>
          </div>

          {/* Venue */}
          {order.venue && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPinIcon weight="bold" className="size-3.5 text-primary shrink-0" />
              <span className="truncate">{order.venue}</span>
            </div>
          )}

          {/* Menu chips */}
          {menuItems.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {menuItems.slice(0, 6).map((item, i) => (
                <span key={i} className="inline-block rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-medium">
                  {item}
                </span>
              ))}
              {menuItems.length > 6 && (
                <span className="inline-block rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px] font-medium">
                  +{menuItems.length - 6} more
                </span>
              )}
            </div>
          )}

          {/* ── ESTIMATE SENT state ─────────────────────────────────────── */}
          {isEstimateSent && totalAmount && (
            <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Estimate Ready</span>
                <CountdownTimer
                  targetDate={order.estimateExpiresAt}
                  label="Expires in"
                  expiredLabel="Expired"
                  className="text-violet-700"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated Total</span>
                <span className="text-base font-bold text-foreground">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Advance (30%)</span>
                <span className="text-sm font-semibold text-amber-700">
                  {formatCurrency(totalAmount * 0.3)}
                </span>
              </div>
              {order.estimateNote && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-violet-300 pl-2">
                  {order.estimateNote}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={acceptMut.isPending}
                  onClick={() => setConfirmAction({ type: "accept", title: "Accept Estimate?", description: `Accept the estimate of ${formatCurrency(totalAmount)} and proceed to advance payment?` })}>
                  Accept
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  disabled={rejectMut.isPending}
                  onClick={() => setConfirmAction({ type: "reject", title: "Reject Estimate?", description: "Are you sure you want to reject this estimate? The order will be closed." })}>
                  Reject
                </Button>
              </div>
            </div>
          )}

          {/* ── ADVANCE PENDING state ───────────────────────────────────── */}
          {isAdvancePending && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Advance Payment Due</span>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Estimate</span>
                <span className="text-sm font-semibold">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-amber-800">Advance Required (30%)</span>
                <span className="text-base font-bold text-amber-700">
                  {formatCurrency(order.advanceRequiredAmount ?? totalAmount * 0.3)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Your booking will be confirmed after advance payment.</p>
              <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={payMut.isPending}
                onClick={() => setConfirmAction({ type: "pay", title: "Pay Advance?", description: `Confirm advance payment of ${formatCurrency(order.advanceRequiredAmount ?? totalAmount * 0.3)}?` })}>
                {payMut.isPending ? "Processing…" : `Pay Advance — ${formatCurrency(order.advanceRequiredAmount ?? totalAmount * 0.3)}`}
              </Button>
            </div>
          )}

          {/* ── CONFIRMED state ─────────────────────────────────────────── */}
          {isConfirmed && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Booking Confirmed ✓</span>
              </div>
              <p className="text-xs text-muted-foreground">Advance received. Our team will contact you shortly.</p>
              {order.eventCountdownStarted && order.eventDateTime && (
                <CountdownTimer
                  targetDate={order.eventDateTime}
                  label="Event starts in"
                  expiredLabel="Event date passed"
                  className="text-emerald-700"
                />
              )}
            </div>
          )}

          {/* ── Call admin button ───────────────────────────────────────── */}
          {ADMIN_PHONE && !isConfirmed && order.status !== "CANCELLED" && order.status !== "COMPLETED" && (
            <a href={`tel:${ADMIN_PHONE}`} className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-input py-2 text-sm text-foreground hover:bg-muted transition-colors">
              <PhoneIcon weight="bold" className="size-4 text-primary" />
              Call Admin
            </a>
          )}

          {/* ── Callback request ────────────────────────────────────────── */}
          {!isConfirmed && order.status !== "CANCELLED" && order.status !== "COMPLETED" && !order.callbackRequested && (
            <Button size="sm" variant="outline" className="w-full text-xs"
              disabled={callbackMut.isPending}
              onClick={() => callbackMut.mutate()}>
              Request Callback
            </Button>
          )}
          {order.callbackRequested && (
            <p className="text-xs text-muted-foreground text-center">Callback requested ✓</p>
          )}

          {/* ── Cancel ─────────────────────────────────────────────────── */}
          {canCancel && (
            <Button size="sm" variant="ghost" className="w-full text-xs text-destructive hover:bg-destructive/10"
              disabled={cancelMut.isPending}
              onClick={() => setConfirmAction({ type: "cancel", title: "Cancel Order?", description: "Are you sure you want to cancel this party order?" })}>
              Cancel Order
            </Button>
          )}
        </CardContent>
      </Card>

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.description}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirm}
          pending={acceptMut.isPending || rejectMut.isPending || payMut.isPending || cancelMut.isPending}
          confirmLabel={CONFIRM_STYLES[confirmAction.type]?.label}
          confirmClassName={CONFIRM_STYLES[confirmAction.type]?.className}
        />
      )}
    </>
  );
}

