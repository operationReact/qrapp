import { useState } from "react";
import { ClipboardList, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import * as api from "../api";
import { useFc } from "../context";
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  formatMonthLabel,
  formatShortDate,
  isActionDueToday,
  isActionOpen,
  isActionOverdue,
  titleCase,
} from "../format";
import { useFcMutation, useLandlordRent, useLandlords, usePropertyLeases } from "../hooks";
import { DetailSection, EmptyState, KeyValue, PressCard, QueryGate, SectionHeader, StatusPill, Surface, TabStrip } from "./kit";

const PRIORITY_TONE = { CRITICAL: "danger", HIGH: "danger", MEDIUM: "warning", LOW: "muted" };
const GRID = "grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3";

export function ActionItemsScreen() {
  const fc = useFc();
  const [filter, setFilter] = useState("OPEN");
  const items = fc.actions.data || [];
  const complete = useFcMutation(
    (item) =>
      api.updateActionItem(fc.foodCourtId, item.id, {
        title: item.title,
        description: item.description,
        priority: item.priority,
        dueDate: item.dueDate,
        assignedTo: item.assignedTo,
        status: "COMPLETED",
      }),
    { success: "Marked complete", failure: "Unable to complete this action" },
  );
  const open = items.filter(isActionOpen);
  const groups = {
    OPEN: open,
    TODAY: items.filter(isActionDueToday),
    OVERDUE: items.filter(isActionOverdue),
    DONE: items.filter((item) => item.status === "COMPLETED"),
  };
  const chips = [
    { key: "OPEN", label: "Open", count: groups.OPEN.length },
    { key: "TODAY", label: "Due Today", count: groups.TODAY.length },
    { key: "OVERDUE", label: "Overdue", count: groups.OVERDUE.length },
    { key: "DONE", label: "Completed", count: groups.DONE.length },
  ];
  const shown = groups[filter];

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Action Items"
        subtitle={`${open.length} open`}
        action={<Button className="min-h-11 rounded-xl px-4" onClick={() => fc.open("action-form")}><Plus className="size-4" aria-hidden="true" /> Add</Button>}
      />
      <TabStrip variant="pill" label="Filter actions" items={chips} value={filter} onChange={setFilter} />
      <QueryGate query={fc.actions} noun="action items">
        {shown.length === 0 ? (
          <EmptyState icon={ClipboardList} title={items.length === 0 ? "No action items yet" : "Nothing here"} description={items.length === 0 ? "Track maintenance, collections and follow-ups." : undefined} action={items.length === 0 ? <Button className="min-h-11 rounded-xl" onClick={() => fc.open("action-form")}>Add action</Button> : undefined} />
        ) : (
          <div className={GRID}>
            {shown.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <PressCard label={item.title} onClick={() => fc.open("action-form", { itemId: item.id })}>
                  <div className="flex items-center gap-2">
                    <StatusPill tone={PRIORITY_TONE[item.priority] || "muted"}>{titleCase(item.priority)}</StatusPill>
                    {item.status !== "OPEN" && <StatusPill tone="info">{titleCase(item.status)}</StatusPill>}
                  </div>
                  <p className="mt-1.5 text-base font-bold leading-snug">{item.title}</p>
                  <p className={isActionOverdue(item) ? "text-xs font-medium text-red-600" : "text-xs text-[var(--cc-secondary-text)]"}>
                    {item.dueDate ? (isActionDueToday(item) ? "Due today" : `${isActionOverdue(item) ? "Overdue · " : "Due "}${formatShortDate(item.dueDate)}`) : "No due date"}
                    {item.assignedTo ? ` · ${item.assignedTo}` : ""}
                  </p>
                </PressCard>
                {isActionOpen(item) && (
                  <Button variant="outline" className="min-h-11 w-full rounded-xl" disabled={complete.isPending} onClick={() => complete.mutate(item)}>
                    Mark Complete
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </QueryGate>
    </section>
  );
}

export function PropertyScreen() {
  const fc = useFc();
  const landlords = useLandlords(fc.foodCourtId);
  const leases = usePropertyLeases(fc.foodCourtId);
  const obligations = useLandlordRent(fc.foodCourtId, fc.month);
  const list = leases.data || [];
  const lease = list.find((item) => item.status === "ACTIVE") ?? list[0] ?? null;
  const landlord = (landlords.data || []).find((item) => item.id === lease?.landlordId) ?? landlords.data?.[0] ?? null;
  const next = (obligations.data || []).find((item) => item.status !== "PAID" && item.status !== "CANCELLED");

  return (
    <section className="space-y-3">
      <SectionHeader title="Property" subtitle={fc.foodCourt?.name} />
      <QueryGate query={leases} noun="the property lease">
        {!lease ? (
          <EmptyState icon={Building2} title="No landlord lease recorded" description="Add the landlord and the monthly lease you pay for this property." action={<Button className="min-h-11 rounded-xl" onClick={() => fc.open("property-lease-form")}>Add property lease</Button>} />
        ) : (
          <Surface className="p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] text-[var(--cc-secondary-text)]">Monthly lease</p>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(lease.monthlyRent)}</p>
              </div>
              <StatusPill tone={lease.status === "ACTIVE" ? "success" : "muted"}>{titleCase(lease.status)}</StatusPill>
            </div>
            <dl className="mt-2">
              <KeyValue label="Landlord">{landlord?.name || lease.landlordName || "—"}</KeyValue>
              {landlord?.contactPhone && <KeyValue label="Contact"><a className="text-[var(--cc-primary)]" href={`tel:${landlord.contactPhone}`}>{landlord.contactPhone}</a></KeyValue>}
              <KeyValue label="Lease period">{formatDateRange(lease.startDate, lease.endDate)}</KeyValue>
              <KeyValue label="Security deposit">{lease.depositAmount == null ? "—" : formatCurrency(lease.depositAmount)}</KeyValue>
              <KeyValue label="Rent due day">{lease.rentDueDay ? `Day ${lease.rentDueDay}` : "—"}</KeyValue>
              <KeyValue label={`Next payment (${formatMonthLabel(fc.month)})`}>
                {obligations.isLoading ? "Loading…" : next ? `${formatCurrency(next.outstandingAmount ?? next.expectedAmount)} · ${formatDate(next.dueDate)}` : "Nothing due"}
              </KeyValue>
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => fc.open("property-lease-form", { lease })}>Edit lease</Button>
              <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => landlord ? fc.open("landlord-form", { landlord }) : fc.open("landlord-form")}>{landlord ? "Edit landlord" : "Add landlord"}</Button>
            </div>
          </Surface>
        )}
      </QueryGate>
    </section>
  );
}

export function FoodCourtsScreen({ foodCourts, onSelect }) {
  const fc = useFc();
  return (
    <section className="space-y-3">
      <SectionHeader title="Food Courts" subtitle={`${foodCourts.data?.length ?? 0} total`} action={<Button className="min-h-11 rounded-xl px-4" onClick={() => fc.open("food-court-form", { onSaved: (saved) => saved?.id && onSelect(saved.id) })}><Plus className="size-4" aria-hidden="true" /> Add</Button>} />
      <QueryGate query={foodCourts} noun="food courts">
        <div className={GRID}>
          {(foodCourts.data || []).map((item) => (
            <PressCard key={item.id} label={`${item.name} details`} onClick={() => fc.open("food-court-form", { foodCourt: item })}>
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-base font-bold">{item.name}</p>
                <StatusPill tone={item.status === "ACTIVE" ? "success" : "muted"}>{titleCase(item.status)}</StatusPill>
              </div>
              <p className="text-xs text-[var(--cc-secondary-text)]">{[item.addressLine, item.city].filter(Boolean).join(", ") || item.code}</p>
              <p className="mt-1 text-xs text-[var(--cc-secondary-text)]">{item.stallCount ?? item.totalStalls ?? 0} stalls · {item.occupiedStalls ?? 0} occupied</p>
            </PressCard>
          ))}
        </div>
      </QueryGate>
    </section>
  );
}


