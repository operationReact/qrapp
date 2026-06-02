import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  acceptPartyOrderEstimate,
  rejectPartyOrderEstimate,
  payPartyOrderAdvance,
  requestPartyOrderCallback,
  cancelMyPartyOrder,
} from "@/services/party-order-service";
import { toast } from "sonner";
import CountdownTimer from "@/components/CountdownTimer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  UsersIcon,
  MapPinIcon,
  PhoneIcon,
  CurrencyInrIcon,
  ConfettiIcon,
  NoteIcon,
} from "@phosphor-icons/react";

const ADMIN_PHONE = import.meta.env.VITE_ADMIN_PHONE || "";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCurrency(v) {
  if (v == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

const STATUS_STYLES = {
  NEW: "bg-sky-50 text-sky-700 border-sky-200",
  UNDER_REVIEW: "bg-orange-50 text-orange-700 border-orange-200",
  PENDING_ESTIMATE: "bg-amber-50 text-amber-700 border-amber-200",
  ESTIMATE_SENT: "bg-violet-50 text-violet-700 border-violet-200",
  ESTIMATE_EXPIRED: "bg-red-50 text-red-700 border-red-200",
  ADVANCE_PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-zinc-100 text-zinc-500 border-zinc-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
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
  const cls =
    STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200";
  return (
    <Badge className={cn("h-6", cls)}>
      {STATUS_LABEL[status] ?? status?.replace(/_/g, " ") ?? "—"}
    </Badge>
  );
}

const CHIP_LIMIT = 5;

export default function UserPartyOrderCard({ order }) {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState(null);
  const [showAllItems, setShowAllItems] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["my-party-orders"] });

  const acceptMut = useMutation({
    mutationFn: () => acceptPartyOrderEstimate(order.id),
    onSuccess: () => {
      invalidate();
      toast.success("Estimate accepted! Please pay the advance.");
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message || "Failed to accept estimate"),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectPartyOrderEstimate(order.id),
    onSuccess: () => {
      invalidate();
      toast.success("Estimate rejected.");
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message || "Failed to reject estimate"),
  });

  const payMut = useMutation({
    mutationFn: () => payPartyOrderAdvance(order.id),
    onSuccess: () => {
      invalidate();
      toast.success("Advance payment confirmed! Booking is now confirmed.");
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message || "Failed to process payment"),
  });

  const callbackMut = useMutation({
    mutationFn: () => requestPartyOrderCallback(order.id),
    onSuccess: () => {
      invalidate();
      toast.success("Callback requested. Our team will contact you shortly.");
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message || "Failed to request callback"),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelMyPartyOrder(order.id),
    onSuccess: () => {
      invalidate();
      toast.success("Order cancelled.");
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message || "Failed to cancel order"),
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
    accept: {
      label: "Accept Estimate",
      className:
        "touch-button rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white",
    },
    reject: {
      label: "Reject",
      className:
        "touch-button rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white",
    },
    pay: {
      label: "Confirm Payment",
      className:
        "touch-button rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white",
    },
    cancel: {
      label: "Cancel Order",
      className:
        "touch-button rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white",
    },
  };

  const menuItems = Array.isArray(order.menuItems) ? order.menuItems : [];
  const totalAmount = order.estimatedTotalAmount ?? order.estimatedAmount;
  const visibleItems = showAllItems
    ? menuItems
    : menuItems.slice(0, CHIP_LIMIT);
  const hiddenCount = menuItems.length - visibleItems.length;
  const isEstimateSent = order.status === "ESTIMATE_SENT";
  const isAdvancePending = order.status === "ADVANCE_PENDING";
  const isConfirmed = order.status === "CONFIRMED";
  const canCancel = [
    "NEW",
    "UNDER_REVIEW",
    "PENDING_ESTIMATE",
    "ESTIMATE_SENT",
  ].includes(order.status);
  const canCallAdmin =
    !!ADMIN_PHONE &&
    !isConfirmed &&
    order.status !== "CANCELLED" &&
    order.status !== "COMPLETED";

  return (
    <>
      <Card className="overflow-hidden mb-0">
        <CardHeader className="pb-2 px-4">
          <div>
            <p className="text-sm mb-2">
              <span className="text-zinc-500 text-xs">ORDER ID </span>{" "}
              <span className="font-medium">#{order.id}</span>
            </p>
            <div className="flex items-center gap-1.5 text-base font-medium">
              <ConfettiIcon
                weight="duotone"
                className="size-4 text-primary shrink-0"
              />
              {order.eventType || "Party Order"} Event
            </div>
            <div className="flex flex-wrap items-center mt-1 gap-1.5">
              <StatusBadge status={order.status} />

              {order.callbackRequested && (
                <Badge className="bg-emerald-50 border-emerald-100 text-emerald-600">
                  Callback requested ✓
                </Badge>
              )}

              {canCallAdmin && (
                <Link
                  to={`tel:${ADMIN_PHONE}`}
                  className={buttonVariants({
                    variant: "shadow-white",
                    size: "xs",
                  })}
                >
                  <PhoneIcon weight="fill" />
                  Call Admin
                </Link>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 grid grid-cols-2 place-items-start">
          {order.estimatedAmount && (
            <div className="flex items-center gap-1.5 text-sm">
              <CurrencyInrIcon
                weight="duotone"
                className="size-3.5 text-primary shrink-0"
              />
              <p className="font-medium">
                {formatCurrency(order.estimatedAmount)}
              </p>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-sm font-medium text-secondary-foreground">
            <UsersIcon
              weight="duotone"
              className="size-3.5 text-primary shrink-0"
            />
            <span>{order.numberOfPeople} people</span>
          </div>

          <div className="flex items-center gap-1.5 text-sm font-medium text-secondary-foreground">
            <CalendarIcon
              weight="duotone"
              className="size-3.5 text-primary shrink-0"
            />
            <span>{formatDate(order.eventDateTime)}</span>
          </div>

          {order.venue && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-secondary-foreground">
              <MapPinIcon
                weight="duotone"
                className="size-3.5 text-primary shrink-0"
              />
              <span className="truncate">{order.venue}</span>
            </div>
          )}

          {menuItems.length > 0 && (
            <div className="col-span-2">
              <p className="text-xs font-medium text-secondary-foreground mb-1.5">
                Menu
              </p>
              <ul className="grid pl-4 marker:text-muted-foreground/40 gap-1 list-disc">
                {visibleItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
                {!showAllItems && hiddenCount > 0 && (
                  <button
                    type="button"
                    className="inline-block w-fit rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px] font-medium leading-none hover:bg-accent transition-colors"
                    onClick={() => setShowAllItems(true)}
                  >
                    +{hiddenCount} more
                  </button>
                )}
                {showAllItems && menuItems.length > CHIP_LIMIT && (
                  <Button
                    variant="link"
                    size="xs"
                    type="button"
                    className="pl-0 w-fit"
                    onClick={() => setShowAllItems(false)}
                  >
                    Show less
                  </Button>
                )}
              </ul>
            </div>
          )}

          {isEstimateSent && totalAmount && (
            <div className="col-span-2 w-full rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary tracking-wide">
                  Estimate Ready
                </span>
              </div>
              <CountdownTimer
                targetDate={order.estimateExpiresAt}
                label="Expires in"
                expiredLabel="Expired"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-secondary-foreground">
                  Estimated Total
                </span>
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-secondary-foreground">
                  Advance (30%)
                </span>
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(totalAmount * 0.3)}
                </span>
              </div>

              {order.estimateNote && (
                <div className="bg-white/40 shadow-sm py-2 px-3 rounded-lg border">
                  <p className="text-sm mb-1 font-medium text-secondary-foreground">
                    Estimate Note
                  </p>
                  <p className="text-sm text-secondary-foreground">
                    {order.estimateNote}
                  </p>
                </div>
              )}
              <div className="flex mt-4 gap-2 pt-1">
                <AlertDialog>
                  <AlertDialogTrigger
                    disabled={acceptMut.isPending}
                    render={
                      <Button size="sm" className="flex-1">
                        Accept
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Accept Estimate?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Accept the estimate of {formatCurrency(totalAmount)} and
                        proceed to advance payment?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={acceptMut.isPending}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => acceptMut.mutate()}
                        disabled={acceptMut.isPending}
                      >
                        {acceptMut.isPending
                          ? "Accept Estimate…"
                          : "Accept Estimate"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger
                    disabled={rejectMut.isPending}
                    render={
                      <Button size="sm" variant="outline" className="flex-1">
                        Reject
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject Estimate?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reject this estimate? The order
                        will be closed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={rejectMut.isPending}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => rejectMut.mutate()}
                        disabled={rejectMut.isPending}
                        variant="destructive"
                      >
                        {rejectMut.isPending ? "Reject…" : "Reject"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {isAdvancePending && (
            <div className="col-span-2 w-full rounded-lg bg-amber-50/50 border border-amber-100 p-3 space-y-2">
              <span className="text-sm font-medium text-amber-700 tracking-wide">
                Advance Payment Due
              </span>
              <div className="flex mt-2 items-center justify-between">
                <span className="text-sm font-medium">Total Estimate</span>
                <span className="text-sm font-medium">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Advance Required (30%)
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(
                    order.advanceRequiredAmount ?? totalAmount * 0.3,
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your booking will be confirmed after advance payment.
              </p>

              <AlertDialog>
                <AlertDialogTrigger
                  disabled={payMut.isPending}
                  render={
                    <Button size="sm" className="w-full">
                      {payMut.isPending
                        ? "Processing…"
                        : `Pay Advance — ${formatCurrency(order.advanceRequiredAmount ?? totalAmount * 0.3)}`}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Confirm Advance Payment for {order.eventType} Event
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirm advance payment of{" "}
                      {formatCurrency(
                        order.advanceRequiredAmount ?? totalAmount * 0.3,
                      )}
                      ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={payMut.isPending}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => payMut.mutate()}
                      disabled={payMut.isPending}
                    >
                      {payMut.isPending ? "Processing…" : "Confirm Payment"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {isConfirmed && (
            <div className="col-span-2 w-full rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Booking Confirmed ✓
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Advance received. Our team will contact you shortly.
              </p>
              {order.eventCountdownStarted && order.eventDateTime && (
                <CountdownTimer
                  targetDate={order.eventDateTime}
                  label="Event starts in"
                  expiredLabel="Event date passed"
                />
              )}
            </div>
          )}

          {order.specialNotes && (
            <div className="border space-y-2 border-primary/10 col-span-2 w-full gap-1.5 text-xs bg-primary/5 rounded-lg px-2.5 py-2">
              <span className="flex font-medium items-center gap-2">
                <NoteIcon
                  weight="duotone"
                  className="size-3.5 text-primary shrink-0 mt-0.5"
                />
                Your Note
              </span>
              <span className="leading-relaxed text-sm">
                {order.specialNotes}
              </span>
            </div>
          )}

          <div className="flex justify-end flex-wrap col-span-2 w-full gap-2">
            {!isConfirmed &&
              order.status !== "CANCELLED" &&
              order.status !== "COMPLETED" &&
              !order.callbackRequested && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={callbackMut.isPending}
                  onClick={() => callbackMut.mutate()}
                >
                  Request Callback
                </Button>
              )}
            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger
                  disabled={cancelMut.isPending}
                  className={buttonVariants({
                    variant: "secondary",
                    size: "sm",
                  })}
                >
                  Cancel Order
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Cancel order for {order.eventType} Event
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this order?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      disabled={
                        acceptMut.isPending ||
                        rejectMut.isPending ||
                        payMut.isPending ||
                        cancelMut.isPending
                      }
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirm}
                      disabled={
                        acceptMut.isPending ||
                        rejectMut.isPending ||
                        payMut.isPending ||
                        cancelMut.isPending
                      }
                    >
                      Cancel Order
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
