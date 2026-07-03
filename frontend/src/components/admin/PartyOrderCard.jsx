import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  CurrencyInrIcon,
  CalendarIcon,
  UsersIcon,
  MapPinIcon,
  PhoneIcon,
  ConfettiIcon,
  NoteIcon,
  UserIcon,
  ReceiptIcon,
  ChartLineIcon,
  MoneyIcon,
  CaretUpDownIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import PartyOrderEstimateDialog from "./PartyOrderEstimateDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePartyOrderStatus, markPartyOrderDelivered } from "@/services/party-order-service";
import { toast } from "sonner";
import CountdownTimer from "@/components/CountdownTimer";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

const ESTIMATABLE_STATUSES = new Set([
  "NEW",
  "UNDER_REVIEW",
  "PENDING_ESTIMATE",
  "ESTIMATE_SENT",
]);

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCurrency(amount) {
  if (amount == null) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatK(amount) {
  if (amount == null) return "—";
  if (Math.abs(amount) >= 1000) return "₹" + (amount / 1000).toFixed(0) + "k";
  return "₹" + amount;
}

const STATUS_STYLES = {
  NEW: "bg-sky-50 text-sky-700 border-sky-200",
  UNDER_REVIEW: "bg-orange-50 text-orange-700 border-orange-200",
  PENDING_ESTIMATE: "bg-amber-50 text-amber-700 border-amber-200",
  ESTIMATE_SENT: "bg-violet-50 text-violet-700 border-violet-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-zinc-100 text-zinc-500 border-zinc-200",
  DELIVERED: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
};

function StatusBadge({ status }) {
  const cls =
    STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200";
  return (
    <Badge className={`h-6 ${cls}`}>
      Status: {status?.replace(/_/g, " ") ?? "—"}
    </Badge>
  );
}

export default function PartyOrderCard({ order, onEstimateSubmitted }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["party-orders"] });

  const updateStatus = useMutation({
    mutationFn: ({ status }) => updatePartyOrderStatus(order.id, status),
    onSuccess: () => { invalidate(); toast.success("Status updated"); },
    onError: (err) =>
      toast.error(err?.response?.data?.message || "Failed to update status"),
  });

  const deliverMut = useMutation({
    mutationFn: () => markPartyOrderDelivered(order.id),
    onSuccess: () => {
      invalidate();
      toast.success("Marked as Delivered. Customer will be prompted to pay balance.");
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || "Failed to mark as delivered"),
  });

  const menuItems = Array.isArray(order.menuItems) ? order.menuItems : [];
  const CHIP_LIMIT = 5;
  const visibleItems = showAllItems ? menuItems : menuItems.slice(0, CHIP_LIMIT);
  const hiddenCount = menuItems.length - CHIP_LIMIT;

  const canEstimate = ESTIMATABLE_STATUSES.has(order.status);
  const canMarkUnderReview = order.status === "NEW";
  const canMarkDelivered = order.status === "CONFIRMED";

  const showFinancials = ["ESTIMATE_SENT", "ADVANCE_PENDING", "CONFIRMED", "DELIVERED", "COMPLETED"].includes(order.status);

  return (
    <>
      <Card className="overflow-hidden">
        {/* ── Header: customer + status ─────────────────────────── */}
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base mb-1 flex items-center gap-1 font-medium truncate">
                <UserIcon weight="duotone" className="text-muted-foreground" />{" "}
                {order.userName}
              </p>
              <div className="flex items-center gap-1">
                <StatusBadge status={order.status} />
                {order.userPhone && (
                  <Link
                    className={buttonVariants({ variant: "shadow-white", size: "xs" })}
                    to={`tel:${order.userPhone}`}
                  >
                    <PhoneIcon weight="fill" />
                    Call Customer
                  </Link>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 grid grid-cols-2 place-items-start">
          {order.estimatedAmount && (
            <div className="flex items-center gap-1.5 text-sm">
              <CurrencyInrIcon weight="duotone" className="size-3.5 text-primary shrink-0" />
              <p className="font-medium">{formatCurrency(order.estimatedAmount)}</p>
            </div>
          )}

          {order.eventType && (
            <div className="flex items-center gap-1.5 text-sm text-secondary-foreground">
              <ConfettiIcon weight="duotone" className="size-3.5 text-primary shrink-0" />
              <span className="font-medium">{order.eventType}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-sm font-medium text-secondary-foreground">
            <UsersIcon weight="duotone" className="size-3.5 text-primary shrink-0" />
            <span>{order.numberOfPeople} people</span>
          </div>

          <div className="flex items-center gap-1.5 text-sm font-medium text-secondary-foreground">
            <CalendarIcon weight="duotone" className="size-3.5 text-primary shrink-0" />
            <span>{formatDate(order.eventDateTime)}</span>
          </div>

          {order.venue && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-secondary-foreground">
              <MapPinIcon weight="duotone" className="size-3.5 text-primary shrink-0" />
              <span className="truncate">{order.venue}</span>
            </div>
          )}

          {menuItems.length > 0 && (
            <div className="col-span-full">
              <p className="text-xs font-medium text-secondary-foreground mb-1.5">Menu</p>
              <ul className="grid pl-4 marker:text-muted-foreground/40 gap-1 list-disc">
                {visibleItems.map((item, idx) => <li key={idx}>{item}</li>)}
                {!showAllItems && hiddenCount > 0 && (
                  <button
                    type="button"
                    className="inline-block rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px] font-medium leading-none hover:bg-accent transition-colors"
                    onClick={() => setShowAllItems(true)}
                  >
                    +{hiddenCount} more
                  </button>
                )}
                {showAllItems && menuItems.length > CHIP_LIMIT && (
                  <Button variant="link" size="xs" type="button" className="pl-0 w-fit" onClick={() => setShowAllItems(false)}>
                    Show less
                  </Button>
                )}
              </ul>
            </div>
          )}

          {/* ── Financial Summary collapsible ──────────────────────── */}
          {showFinancials && (
            <div className="col-span-full w-full">
              <Collapsible>
                <CollapsibleTrigger
                  className={buttonVariants({
                    variant: "secondary",
                    className: "w-full flex-start justify-between! aria-expanded:rounded-b-none",
                  })}
                >
                  <span className="text-sm font-medium">Financial Summary</span>
                  <CaretUpDownIcon />
                </CollapsibleTrigger>

                <CollapsibleContent className="bg-secondary rounded-lg p-4 pt-0 rounded-t-none data-closed:animate-collapsible-up data-open:animate-collapsible-down overflow-clip">
                  {(order.estimatedTotalAmount || order.estimatedAmount) && (
                    <div className="rounded-lg grid gap-2 bg-muted/40 py-2 text-xs space-y-1">
                      {/* Revenue */}
                      <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
                        <span className="flex items-center gap-1">
                          <CurrencyInrIcon weight="duotone" /> Revenue:
                        </span>
                        <span>{formatK(order.estimatedTotalAmount ?? order.estimatedAmount)}</span>
                      </div>

                      {order.estimatedTotalExpense != null && (
                        <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
                          <span className="flex items-center gap-0.5">
                            <ReceiptIcon weight="duotone" /> Expense:
                          </span>
                          <span>{formatK(order.estimatedTotalExpense)}</span>
                        </div>
                      )}

                      {order.estimatedTotalProfit != null && (
                        <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
                          <span className="flex items-center gap-1">
                            <ChartLineIcon weight="duotone" /> Profit:
                          </span>
                          <span className={cn("font-bold", order.estimatedTotalProfit >= 0 ? "text-emerald-600" : "text-red-500")}>
                            {order.estimatedTotalProfit >= 0 ? "+" : ""}
                            {formatK(order.estimatedTotalProfit)}
                          </span>
                        </div>
                      )}

                      {order.budgetAmount && (
                        <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
                          <span className="flex items-center gap-1">
                            <MoneyIcon weight="duotone" /> Customer Budget:
                          </span>
                          <span className="font-medium">{formatK(order.budgetAmount)}</span>
                          {order.estimatedTotalAmount && (
                            <span className={cn("font-semibold", order.estimatedTotalAmount - order.budgetAmount >= 0 ? "text-red-500" : "text-emerald-600")}>
                              ({order.estimatedTotalAmount - order.budgetAmount >= 0 ? "+" : ""}
                              {formatK(order.estimatedTotalAmount - order.budgetAmount)})
                            </span>
                          )}
                        </div>
                      )}

                      {/* ── Advance & Balance breakdown (shown after CONFIRMED) ── */}
                      {["CONFIRMED", "DELIVERED", "COMPLETED"].includes(order.status) && order.advancePaidAmount != null && (
                        <div className="mt-2 pt-2 border-t border-muted-foreground/20 space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Advance Paid (30%)</span>
                            <span className="font-semibold text-emerald-600">
                              ✓ {formatCurrency(order.advancePaidAmount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Balance Due (70%)</span>
                            <span className={cn("font-semibold", order.balancePaid ? "text-emerald-600" : "text-amber-600")}>
                              {order.balancePaid
                                ? `✓ ${formatCurrency(order.balancePaidAmount)} (Paid)`
                                : formatCurrency(
                                    order.balanceAmount ??
                                    ((order.estimatedTotalAmount ?? order.estimatedAmount ?? 0) - (order.advancePaidAmount ?? 0))
                                  )
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Countdown / status notes */}
                  {order.status === "ESTIMATE_SENT" && order.estimateExpiresAt && (
                    <CountdownTimer targetDate={order.estimateExpiresAt} label="Estimate expires in" expiredLabel="Estimate expired" className="w-fit" />
                  )}
                  {order.status === "ADVANCE_PENDING" && (
                    <p className="text-xs text-muted-foreground mt-2">Waiting for advance payment from customer.</p>
                  )}
                  {order.status === "CONFIRMED" && order.eventDateTime && (
                    <CountdownTimer targetDate={order.eventDateTime} label="Event starts in" expiredLabel="Event date passed" />
                  )}
                  {order.status === "DELIVERED" && (
                    <p className="text-xs text-amber-600 font-medium mt-2">⏳ Waiting for customer to pay balance.</p>
                  )}
                  {order.status === "COMPLETED" && (
                    <p className="text-xs text-emerald-600 font-medium mt-2">✓ Full payment received. Order complete.</p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Special notes */}
          {order.specialNotes && (
            <div className="border space-y-2 border-primary/10 col-span-2 w-full gap-1.5 text-xs bg-primary/5 rounded-lg px-2.5 py-2">
              <span className="flex font-medium items-center gap-2">
                <NoteIcon weight="duotone" className="size-3.5 text-primary shrink-0 mt-0.5" />
                Special Notes
              </span>
              <span className="leading-relaxed text-sm">{order.specialNotes}</span>
            </div>
          )}

          {/* Estimate note */}
          {order.estimateNote && (
            <div className="p-2 bg-muted/50 border border-muted w-full rounded-lg col-span-full">
              <span className="flex text-xs mb-1 font-medium items-center gap-2">
                <NoteIcon weight="duotone" className="size-3.5 shrink-0 mt-0.5" />
                Estimate Note
              </span>
              <p className="text-sm/relaxed">{order.estimateNote}</p>
            </div>
          )}

          {/* Admin actions */}
          <div className="flex flex-wrap col-span-2 w-full gap-2">
            {canMarkUnderReview && (
              <Button
                size="sm"
                variant="branded-secondary"
                className="flex-1"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ status: "UNDER_REVIEW" })}
              >
                Mark Under Review
              </Button>
            )}
            {canEstimate && (
              <Button className="flex-1" size="sm" onClick={() => setDialogOpen(true)}>
                {order.estimatedAmount ? "Update Estimate" : "Send Estimate"}
              </Button>
            )}
            {canMarkDelivered && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                disabled={deliverMut.isPending}
                onClick={() => deliverMut.mutate()}
              >
                <CheckCircleIcon weight="duotone" className="mr-1" />
                {deliverMut.isPending ? "Marking…" : "Mark Delivered"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <PartyOrderEstimateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={order}
        onSubmitted={() => {
          setDialogOpen(false);
          onEstimateSubmitted?.();
        }}
      />
    </>
  );
}
