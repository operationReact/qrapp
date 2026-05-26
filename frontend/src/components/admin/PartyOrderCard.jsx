import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CurrencyInrIcon, CalendarIcon, UsersIcon, MapPinIcon,
  PhoneIcon, ConfettiIcon, NoteIcon,
} from "@phosphor-icons/react";
import PartyOrderEstimateDialog from "./PartyOrderEstimateDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePartyOrderStatus } from "@/services/party-order-service";
import { toast } from "sonner";

const ESTIMATABLE_STATUSES = new Set(["NEW", "UNDER_REVIEW", "PENDING_ESTIMATE"]);

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

const STATUS_STYLES = {
  NEW:              "bg-sky-50 text-sky-700 border-sky-200",
  UNDER_REVIEW:     "bg-orange-50 text-orange-700 border-orange-200",
  PENDING_ESTIMATE: "bg-amber-50 text-amber-700 border-amber-200",
  ESTIMATE_SENT:    "bg-violet-50 text-violet-700 border-violet-200",
  CONFIRMED:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED:         "bg-red-50 text-red-700 border-red-200",
  CANCELLED:        "bg-zinc-100 text-zinc-500 border-zinc-200",
  COMPLETED:        "bg-green-50 text-green-700 border-green-200",
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200";
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {status?.replace(/_/g, " ") ?? "—"}
    </span>
  );
}

export default function PartyOrderCard({ order, onEstimateSubmitted }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ status }) => updatePartyOrderStatus(order.id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["party-orders"] }); toast.success("Status updated"); },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to update status"),
  });

  const menuItems = Array.isArray(order.menuItems) ? order.menuItems : [];
  const CHIP_LIMIT = 5;
  const visibleItems = showAllItems ? menuItems : menuItems.slice(0, CHIP_LIMIT);
  const hiddenCount = menuItems.length - CHIP_LIMIT;

  const canEstimate = ESTIMATABLE_STATUSES.has(order.status);
  const canMarkUnderReview = order.status === "NEW";
  const canMarkCompleted = order.status === "CONFIRMED";

  return (
    <>
      <Card className="overflow-hidden">
        {/* ── Header: customer + status ─────────────────────────── */}
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {order.userName && (
                <p className="text-sm font-semibold truncate">{order.userName}</p>
              )}
              {order.userPhone && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <PhoneIcon weight="bold" className="size-3 shrink-0" />
                  {order.userPhone}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge status={order.status} />
              {order.estimatedAmount && (
                <Badge variant="default" className="bg-emerald-600 text-[10px]">
                  <CurrencyInrIcon weight="bold" className="mr-0.5 size-3" />
                  {formatCurrency(order.estimatedAmount)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2.5 px-4 pb-4">
          {/* Event type */}
          {order.eventType && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ConfettiIcon weight="bold" className="size-3.5 text-primary shrink-0" />
              <span className="font-medium text-foreground">{order.eventType}</span>
            </div>
          )}

          {/* Head count */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UsersIcon weight="bold" className="size-3.5 text-primary shrink-0" />
            <span>{order.numberOfPeople} people</span>
          </div>

          {/* Event date */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarIcon weight="bold" className="size-3.5 text-primary shrink-0" />
            <span>{formatDate(order.eventDateTime)}</span>
          </div>

          {/* Venue */}
          {order.venue && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPinIcon weight="bold" className="size-3.5 text-primary shrink-0" />
              <span className="truncate">{order.venue}</span>
            </div>
          )}

          {/* Menu items chips */}
          {menuItems.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Menu</p>
              <div className="flex flex-wrap gap-1">
                {visibleItems.map((item, idx) => (
                  <span key={idx} className="inline-block rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-medium leading-none">
                    {item}
                  </span>
                ))}
                {!showAllItems && hiddenCount > 0 && (
                  <button type="button"
                    className="inline-block rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px] font-medium leading-none hover:bg-accent transition-colors"
                    onClick={() => setShowAllItems(true)}>
                    +{hiddenCount} more
                  </button>
                )}
                {showAllItems && menuItems.length > CHIP_LIMIT && (
                  <button type="button"
                    className="inline-block rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px] font-medium leading-none hover:bg-accent transition-colors"
                    onClick={() => setShowAllItems(false)}>
                    Show less
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Special notes */}
          {order.specialNotes && (
            <div className="flex gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-2">
              <NoteIcon weight="bold" className="size-3.5 text-primary shrink-0 mt-0.5" />
              <span className="leading-relaxed">{order.specialNotes}</span>
            </div>
          )}

          {/* Estimate note */}
          {order.estimateNote && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
              {order.estimateNote}
            </p>
          )}

          {/* Admin actions */}
          <div className="flex flex-col gap-1.5 pt-1">
            {canMarkUnderReview && (
              <Button size="sm" variant="outline"
                className="w-full text-orange-700 border-orange-300 hover:bg-orange-50"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ status: "UNDER_REVIEW" })}>
                Mark Under Review
              </Button>
            )}
            {canEstimate && (
              <Button size="sm" className="w-full" onClick={() => setDialogOpen(true)}>
                {order.estimatedAmount ? "Update Estimate" : "Send Estimate"}
              </Button>
            )}
            {canMarkCompleted && (
              <Button size="sm" variant="outline"
                className="w-full text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ status: "COMPLETED" })}>
                Mark Completed
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <PartyOrderEstimateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        orderId={order.id}
        onSubmitted={() => { setDialogOpen(false); onEstimateSubmitted?.(); }}
      />
    </>
  );
}
