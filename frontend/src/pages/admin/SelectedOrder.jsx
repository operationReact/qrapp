import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import {
  Archive,
  BadgeInfo,
  ClockDashedHalf,
  CreditCardAlt,
  Group,
  Phone,
  Rupee,
} from "@boxicons/react";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAdminDashboard } from "@/context/AdminDashboardContext";

const STATUS_META = {
  PLACED: {
    label: "Placed",
    tone: "bg-amber-100 text-amber-800 border-amber-200",
  },
  PREPARING: {
    label: "Preparing",
    tone: "bg-sky-100 text-sky-800 border-sky-200",
  },
  READY: {
    label: "Ready",
    tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  COMPLETED: {
    label: "Completed",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

const PRIORITY_META = {
  NORMAL: {
    label: "Normal",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
  },
  HIGH: {
    label: "High",
    tone: "bg-orange-100 text-orange-700 border-orange-200",
  },
  URGENT: {
    label: "Urgent",
    tone: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

function formatCurrency(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function toneForStatus(status) {
  return STATUS_META[status] || STATUS_META.PLACED;
}

function toneForPriority(priority) {
  return PRIORITY_META[priority] || PRIORITY_META.NORMAL;
}

// function summarizeItems(order) {
//   const items = order?.items || [];
//   if (!items.length) return "No items attached";
//   return items
//     .slice(0, 3)
//     .map((item) => `${item.name || "Item"} ×${item.quantity}`)
//     .join(", ");
// }

export default function SelectedOrder() {
  const params = useParams();
  const selectedOrderId = params?.orderId;
  
  const { selectedOrder, actionLoading, handleOrderUpdate } = useAdminDashboard(selectedOrderId);

  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    if (selectedOrder) {
      setNoteDraft(selectedOrder.adminNote || "");
    }
  }, [selectedOrder]);

  return (
    <div className="h-full bg-white p-4 shadow-sm h-full">
      {(!selectedOrderId || !selectedOrder) && (
        <div className="flex text-center text-balance min-h-[320px] items-center justify-center h-full rounded-2xl border border-dashed border-slate-200 bg-primary-foreground/10 text-sm text-slate-500">
          Choose an order to open the operations panel.
        </div>
      )}
      {selectedOrder && (
        <div className="space-y-5">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium capitalize text-zinc-500">
                  Selected order
                </div>
                <h2 className="mt-0 flex gap-4 items-center text-2xl font-semibold">
                  Order #{selectedOrder.id}
                  <div className="flex gap-2">
                    <Badge
                      className={`${toneForStatus(selectedOrder.status).tone}`}
                    >
                      <Archive pack="filled" />
                      {toneForStatus(selectedOrder.status).label}
                    </Badge>
                    <Badge
                      className={`${toneForPriority(selectedOrder.priority).tone}`}
                    >
                      {toneForPriority(selectedOrder.priority).label}
                    </Badge>
                  </div>
                </h2>

                <p className="mt-2 text-sm text-slate-500 gap-1 flex items-center">
                  <Button asChild variant="secondary">
                    <a href={`tel:+91${selectedOrder.phone}`}>
                      <Phone />
                      {selectedOrder.phone}
                    </a>
                  </Button>
                  <span>•</span> Created{" "}
                  {formatDateTime(selectedOrder.createdAt)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-1 text-sm text-slate-600 xl:grid-cols-4">
              <div className="rounded-l-xl rounded-bl-none xl:rounded-bl-xl p-2 bg-primary-foreground/30 border border-primary-foreground">
                <div className="text-xs flex gap-1 items-center font-semibold capitalize text-primary">
                  <Rupee className="size-4" /> Total
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  {formatCurrency(selectedOrder.total)}
                </div>
              </div>
              <div className="rounded-tr-xl xl:rounded-tr-none p-2 border bg-primary-foreground/30 border border-primary-foreground">
                <div className="text-xs flex gap-1 items-center font-semibold capitalize text-primary">
                  <CreditCardAlt pack="filled" className="size-4" /> Payment
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  {selectedOrder.paymentStatus || "Pending"}
                </div>
              </div>
              <div className="p-2 rounded-bl-xl xl:rounded-bl-none border bg-primary-foreground/30 border border-primary-foreground">
                <div className="text-xs flex gap-1 items-center font-semibold capitalize text-primary">
                  <ClockDashedHalf pack="filled" className="size-4" /> Age
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  {selectedOrder.ageMinutes} min
                </div>
              </div>
              <div className="rounded-r-xl rounded-tr-none xl:rounded-tr-xl p-2 border bg-primary-foreground/30 border border-primary-foreground">
                <div className="text-xs flex gap-1 items-center font-semibold capitalize text-primary">
                  <Group pack="filled" className="size-4" /> Assigned
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  {selectedOrder.assignedAdmin || "Unassigned"}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium capitalize">Workflow Actions</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {(selectedOrder.availableTransitions || []).map((nextStatus) => (
                <Button
                  variant="outline"
                  className="text-sm! font-medium! rounded-md"
                  key={`detail-${selectedOrder.id}-${nextStatus}`}
                  onClick={() =>
                    handleOrderUpdate(selectedOrder.id, {
                      status: nextStatus,
                    })
                  }
                  disabled={actionLoading}
                >
                  Move to {toneForStatus(nextStatus).label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium capitalize">Priority</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {["NORMAL", "HIGH", "URGENT"].map((priority) => (
                <Badge
                  asChild
                  key={priority}
                  className={`text-sm! font-medium! rounded-md ${toneForPriority(priority).tone}`}
                >
                  <Button
                    disabled={actionLoading}
                    onClick={() =>
                      handleOrderUpdate(selectedOrder.id, { priority })
                    }
                  >
                    {toneForPriority(priority).label}
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium capitalize">Kitchen note</h3>
            </div>
            <InputGroup className="mt-3">
              <InputGroupTextarea
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={4}
                className="text-sm!"
                placeholder="Capture service instructions, escalation details, or pickup notes for the team."
              />
              <InputGroupAddon align="block-end">
                <div className="flex gap-1.5 ml-auto">
                  <InputGroupButton
                    variant="ghost"
                    onClick={() =>
                      handleOrderUpdate(selectedOrder.id, { adminNote: "" })
                    }
                    disabled={actionLoading}
                    className="text-xs font-medium ml-auto h-8"
                  >
                    Clear Note
                  </InputGroupButton>

                  <InputGroupButton
                    variant="outline"
                    onClick={() => setNoteDraft(selectedOrder.adminNote || "")}
                    className="text-xs font-medium ml-auto h-8"
                  >
                    Reset
                  </InputGroupButton>

                  <InputGroupButton
                    variant="default"
                    onClick={() =>
                      handleOrderUpdate(selectedOrder.id, {
                        adminNote: noteDraft,
                      })
                    }
                    disabled={actionLoading}
                    className="text-xs font-medium ml-auto h-8"
                  >
                    Save Note
                  </InputGroupButton>
                </div>
              </InputGroupAddon>
            </InputGroup>

            {/* <div className="mt-3 flex flex-wrap gap-2"> */}
            {/*   <button */}
            {/*     onClick={() => */}
            {/*       handleOrderUpdate(selectedOrder.id, { */}
            {/*         adminNote: "noteDraft", */}
            {/*       }) */}
            {/*     } */}
            {/*     // disabled={actionLoading} */}
            {/*     className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50" */}
            {/*   > */}
            {/*     Save note */}
            {/*   </button> */}
            {/*   <button */}
            {/*     onClick={() => */}
            {/*       handleOrderUpdate(selectedOrder.id, { adminNote: "" }) */}
            {/*     } */}
            {/*     // disabled={actionLoading} */}
            {/*     className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" */}
            {/*   > */}
            {/*     Clear note */}
            {/*   </button> */}
            {/* </div> */}
          </div>

          <div>
            <h3 className="text-sm font-medium capitalize">Items</h3>
            <div className="mt-3 space-y-3">
              <ul className="pl-4 marker:text-muted-foreground/50 rounded-xl list-disc">
                {(selectedOrder.items || []).map((item, index) => (
                  <li
                    key={`${index}-${selectedOrder.id}-${item.name}`}
                    className="py-2 bg-white shadow-sm border-b last:border-b-0 group/item first:rounded-t-xl last:rounded-b-xl px-4"
                  >
                    <div
                      key={`${selectedOrder.id}-${item.itemId || index}`}
                      className="flex gap-3 items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            ` bg-transparent border-2 rounded-sm font-medium p-1`,
                            item.isVeg
                              ? "text-accent-400 border-accent-400"
                              : "text-red-500 border-red-500",
                          )}
                        >
                          <span>{item.isVeg ? "VEG" : "NONVEG/NA"}</span>
                        </Badge>

                        <div className="text-base">
                          <span className="font-medium group-hover/item:text-primary transition duration-100">
                            {item.quantity}x •{" "}
                          </span>
                          {item.isVeg ? "Veg " : "Non Veg "}
                          {item.name || "Menu Item"}
                        </div>
                      </div>
                      <div className="text-base font-semibold">
                        {formatCurrency(
                          item.subtotal ||
                            (item.price || 0) * (item.quantity || 0),
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium capitalize">Status history</h3>
            <div className="mt-3 space-y-3">
              {(selectedOrder.history || []).length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No workflow events recorded yet.
                </div>
              )}
              {(selectedOrder.history || []).map((entry, index) => (
                <div
                  key={`${selectedOrder.id}-history-${index}`}
                  className="rounded-xl shadow-sm shadow-primary/10 border border-zinc-200 bg-white"
                >
                  {entry.note && (
                    <div className="text-sm justify-between border-b px-2 rounded-b-none py-2 bg-zinc-100 rounded-md text-zinc-700 flex gap-2 items-center">
                      <span className="flex gap-1 items-center font-medium">
                        <BadgeInfo pack="filled" className="size-4 shrink-0" />
                        {entry.note}
                      </span>
                      <div className="text-sm font-medium text-xs text-zinc-600">
                        Updated by {entry.changedBy || "system"} on{" "}
                        {formatDateTime(entry.changedAt)}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 p-2">
                    <div className="text-sm rounded-xl font-semibold text-slate-900 flex items-center">
                      <span className="border rounded-l-lg p-2 border-zinc-200 bg-zinc-100">
                        {entry.previousStatus || "NEW"}
                      </span>
                      <span className="border-y border-zinc-100 p-2">→</span>
                      <span className="border rounded-r-lg p-2 border-primary/10 text-primary bg-primary/10">
                        {entry.newStatus}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
