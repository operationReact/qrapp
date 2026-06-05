import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { cn, formatDate } from "@/lib/utils";
import {
  ArchiveIcon,
  ClockCountdownIcon,
  CreditCardIcon,
  CurrencyInrIcon,
  PhoneIcon,
  SealWarningIcon,
  UsersIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";

const STATUS_META = {
  PLACED:    { label: "Placed",    tone: "bg-amber-100 text-amber-800 border-amber-200" },
  PREPARING: { label: "Preparing", tone: "bg-sky-100 text-sky-800 border-sky-200" },
  READY:     { label: "Ready",     tone: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  COMPLETED: { label: "Completed", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  CANCELLED: { label: "Cancelled", tone: "bg-rose-100 text-rose-700 border-rose-200" },
};
STATUS_META.ORDER_PLACED = STATUS_META.PLACED;

function formatCurrency(v) { return `₹${Number(v || 0).toFixed(2)}`; }
function formatDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
function toneForStatus(s) { return STATUS_META[s] || STATUS_META.PLACED; }

/**
 * OrderDetailPanel
 *
 * Shared detail content used by:
 *   • Desktop right pane  ($orderId.jsx)
 *   • Mobile bottom drawer (MobileOrderDrawer via operational-queue.jsx)
 *
 * Props:
 *   order         — AdminOrderResponse
 *   actionLoading — boolean
 *   onUpdate      — (payload) => void   e.g. onUpdate({ status: "PREPARING" })
 */
export default function OrderDetailPanel({ order, actionLoading, onUpdate }) {
  const [noteDraft, setNoteDraft] = useState(order?.adminNote || "");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setNoteDraft(order?.adminNote || "");
  }, [order?.id]);

  if (!order) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-primary-foreground/10 text-center text-sm text-slate-500">
        Choose an order to open the operations panel.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-medium capitalize text-zinc-500">Selected order</div>
            <h2 className="mt-0 flex flex-wrap gap-2 items-center text-2xl font-semibold">
              {order.orderNumber ?? `#${order.id}`}
              <div className="flex gap-2">
                <Badge className={toneForStatus(order.status)?.tone}>
                  <ArchiveIcon weight="fill" />
                  {toneForStatus(order.status).label}
                </Badge>
              </div>
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {order.userName && (
                <span className="font-semibold text-slate-700">{order.userName}</span>
              )}
              <Button
                variant="secondary"
                size="sm"
                nativeButton={false}
                render={
                  <a href={`tel:+91${order.phone}`}>
                    <PhoneIcon />
                    {order.phone}
                  </a>
                }
              />
              <span>•</span>
              Created {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="mt-4 grid grid-cols-2 gap-1 text-sm text-slate-600 xl:grid-cols-4">
          {[
            { label: "Total",    renderIcon: () => <CurrencyInrIcon weight="fill" className="size-4" />,    value: formatCurrency(order.total) },
            { label: "Payment",  renderIcon: () => <CreditCardIcon weight="fill" className="size-4" />,     value: order.paymentStatus || "Pending" },
            { label: "Age",      renderIcon: () => <ClockCountdownIcon weight="fill" className="size-4" />, value: `${order.ageMinutes} min` },
            { label: "Assigned", renderIcon: () => <UsersIcon weight="fill" className="size-4" />,          value: order.assignedAdmin || "Unassigned" },
          ].map(({ renderIcon, label, value }, i) => (
            <div
              key={label}
              className={cn(
                "p-2 border bg-primary-foreground/30 border-primary-foreground",
                i === 0 && "rounded-l-xl rounded-bl-none xl:rounded-bl-xl",
                i === 1 && "rounded-tr-xl xl:rounded-tr-none",
                i === 2 && "rounded-bl-xl xl:rounded-bl-none",
                i === 3 && "rounded-r-xl rounded-tr-none xl:rounded-tr-xl",
              )}
            >
              <div className="flex items-center gap-1 text-xs font-semibold capitalize text-primary">
                {renderIcon()}
                {label}
              </div>
              <div className="mt-1 text-base font-semibold text-slate-900">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Workflow actions ── */}
      <div>
        <h3 className="text-sm font-medium capitalize">Workflow Actions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {(order.availableTransitions || []).map((nextStatus) => (
            <Button
              key={nextStatus}
              variant="outline"
              size="lg"
              className="flex-1 h-12 gap-2 rounded-xl font-semibold text-sm touch-manipulation"
              onClick={() => onUpdate({ status: nextStatus })}
              disabled={actionLoading}
            >
              {toneForStatus(nextStatus).label}
              <CaretRightIcon weight="bold" className="size-4" />
            </Button>
          ))}
        </div>
      </div>

      {/* ── Kitchen note ── */}
      <div>
        <h3 className="text-sm font-medium capitalize">Kitchen Note</h3>
        <InputGroup className="mt-3">
          <InputGroupTextarea
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
            value={noteDraft}
            className="text-sm!"
            placeholder="Capture service instructions, escalation details, or pickup notes."
          />
          <InputGroupAddon align="block-end">
            <div className="flex gap-1.5 ml-auto">
              <InputGroupButton
                variant="ghost"
                onClick={() => onUpdate({ adminNote: "" })}
                disabled={actionLoading}
              >
                Clear
              </InputGroupButton>
              <InputGroupButton
                variant="outline"
                onClick={() => setNoteDraft(order.adminNote || "")}
              >
                Reset
              </InputGroupButton>
              <InputGroupButton
                variant="default"
                onClick={() => onUpdate({ adminNote: noteDraft })}
                disabled={actionLoading}
              >
                Save Note
              </InputGroupButton>
            </div>
          </InputGroupAddon>
        </InputGroup>
      </div>

      {/* ── Items ── */}
      <div>
        <h3 className="text-sm font-medium capitalize">Items</h3>
        <ul className="mt-3 pl-4 marker:text-muted-foreground/50 rounded-xl list-disc">
          {(order.items || []).map((item, i) => (
            <li
              key={`${i}-${item.name}`}
              className="py-2 bg-white shadow-sm border-b last:border-b-0 group/item first:rounded-t-md last:rounded-b-md px-4"
            >
              <div className="flex gap-3 items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "bg-transparent border-2 rounded-sm font-medium p-1",
                      item.isVeg
                        ? "text-accent-400 border-accent-400"
                        : "text-red-500 border-red-500",
                    )}
                  >
                    <span>{item.isVeg ? "VEG" : "NON-VEG"}</span>
                  </Badge>
                  <div className="text-base">
                    <span className="font-medium">{item.quantity}x •</span>{" "}
                    {item.name || "Menu Item"}
                  </div>
                </div>
                <div className="text-base font-semibold">
                  {formatCurrency(item.subtotal || item.price * item.quantity)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Status history ── */}
      <div>
        <h3 className="text-sm font-medium capitalize">Status History</h3>
        <div className="mt-3 space-y-3">
          {(order.history || []).length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No workflow events recorded yet.
            </div>
          )}
          {(order.history || []).map((entry, i) => (
            <div
              key={i}
              className="rounded-md border border-zinc-200 bg-white shadow-sm shadow-primary/10"
            >
              {entry.note && (
                <div className="flex items-center justify-between gap-2 rounded-b-none rounded-md border-b bg-zinc-100 px-2 py-2 text-sm text-zinc-700">
                  <span className="flex items-center gap-1 font-medium">
                    <SealWarningIcon weight="fill" className="size-4 shrink-0" />
                    {entry.note}
                  </span>
                  <div className="text-xs font-medium">
                    {entry.changedBy || "system"} · {formatDateTime(entry.changedAt)}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 p-2">
                <div className="flex items-center text-xs font-semibold">
                  <span className="rounded-l border border-zinc-200 bg-zinc-100 p-2">
                    {entry.previousStatus || "NEW"}
                  </span>
                  <span className="border-y border-zinc-100 p-2">→</span>
                  <span className="rounded-r border border-primary/10 bg-primary/10 p-2 text-primary">
                    {entry.newStatus}
                  </span>
                </div>
              </div>
              {!entry.note && (
                <div className="flex items-center justify-between gap-2 rounded-t-none rounded-md border-t bg-zinc-50 px-2 py-2 text-xs font-medium text-zinc-700">
                  {entry.changedBy || "system"} · {formatDate(entry.changedAt)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

