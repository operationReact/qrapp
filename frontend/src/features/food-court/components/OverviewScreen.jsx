import { AlertTriangle, ChevronRight, Plus, Receipt, Store, UserPlus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useFc } from "../context";
import {
  daysFromToday,
  formatCompactCurrency,
  formatCurrency,
  formatMonthLabel,
  invoiceStatus,
  isActionOpen,
  isActionOverdue,
  isActiveLease,
  num,
  sumInvoices,
  formatShortDate,
  titleCase,
} from "../format";
import { Amount, EmptyState, Surface, SectionHeader, StatusPill } from "./kit";

function Kpi({ label, children, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "min-h-16 rounded-[16px] border border-[var(--cc-border)] bg-white p-3 text-left",
        onClick && "cursor-pointer transition hover:border-[var(--cc-primary)]/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]",
      )}
    >
      <p className="truncate text-[11px] font-medium text-[var(--cc-secondary-text)]">{label}</p>
      <p className="mt-0.5 truncate text-lg font-bold tabular-nums leading-6 text-[var(--cc-text)]">{children}</p>
    </Tag>
  );
}

function StatCell({ label, value, loading, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 cursor-pointer flex-col items-start justify-center rounded-xl px-3 py-2 text-left transition hover:bg-[var(--cc-page)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]"
    >
      <span className={cn("text-lg font-bold leading-6 tabular-nums", tone)}>
        {loading ? <span className="inline-block h-5 w-8 animate-pulse rounded bg-[var(--cc-border)]" aria-label="Loading" /> : value}
      </span>
      <span className="text-[11px] text-[var(--cc-secondary-text)]">{label}</span>
    </button>
  );
}

export default function OverviewScreen({ goto }) {
  const fc = useFc();
  const { dashboard, rents, expenses, actions, leases, stallRows, month } = fc;
  const d = dashboard.data;
  const loading = dashboard.isLoading || rents.isLoading;
  const failed = dashboard.isError || rents.isError;

  const monthInvoices = (rents.data || []).filter((item) => item.status !== "CANCELLED");
  const billed = sumInvoices(monthInvoices, "netAmount");
  const collected = sumInvoices(monthInvoices, "amountPaid");
  const outstanding = sumInvoices(monthInvoices, "balanceDue");
  const progress = billed > 0 ? Math.min(100, Math.round((collected / billed) * 100)) : 0;
  const overdue = monthInvoices.filter((item) => invoiceStatus(item) === "OVERDUE");
  const expenseTotal = sumInvoices(expenses.data, "amount");
  const spread = d ? num(d.grossRentSpread) : 0;

  const expiring = (leases.data || []).filter((lease) => {
    if (!isActiveLease(lease) || !lease.endDate) return false;
    const days = daysFromToday(lease.endDate);
    return days !== null && days >= 0 && days <= 30;
  });
  const openActions = (actions.data || []).filter(isActionOpen);
  const overdueActions = openActions.filter(isActionOverdue);

  const attention = [
    overdue.length > 0 && { key: "rent", dot: "bg-red-500", text: `${overdue.length} overdue ${overdue.length === 1 ? "rent" : "rents"}`, go: () => goto("finance", "rent") },
    expiring.length > 0 && { key: "lease", dot: "bg-orange-500", text: `${expiring.length} ${expiring.length === 1 ? "lease expires" : "leases expire"} within 30 days`, go: () => goto("ops", "leases") },
    openActions.length > 0 && { key: "action", dot: "bg-amber-400", text: `${openActions.length} open action ${openActions.length === 1 ? "item" : "items"}${overdueActions.length ? ` · ${overdueActions.length} overdue` : ""}`, go: () => goto("ops", "actions") },
  ].filter(Boolean);

  const stalls = stallRows;
  const occupied = stalls.filter((row) => row.state === "OCCUPIED").length;
  const available = stalls.filter((row) => row.state === "VACANT").length;

  const quick = [
    { label: "Tenant", icon: UserPlus, run: () => fc.open("tenant-form") },
    { label: "Stall", icon: Store, run: () => fc.open("stall-form") },
    { label: "Record Rent", icon: Wallet, run: () => goto("finance", "rent") },
    { label: "Expense", icon: Receipt, run: () => fc.open("expense-form") },
  ];

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-12 lg:gap-4 lg:space-y-0">
      <div className="space-y-3 lg:col-span-7">
        <Surface className="border-transparent bg-[var(--cc-text)] p-4 text-white">
          <p className="text-xs font-medium opacity-90">Monthly Tenant Rent</p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums leading-9">
            <Amount value={d?.monthlyContractedRent} loading={dashboard.isLoading} error={dashboard.isError} className="text-white" />
          </p>
          <p className="mt-1 text-xs opacity-90">
            {dashboard.isLoading ? "…" : dashboard.isError ? "Unable to load" : `${formatCompactCurrency(spread)} gross rent spread`}
          </p>
        </Surface>

        <div className="grid grid-cols-2 gap-2.5">
          <Kpi label={`Collected · ${formatMonthLabel(month)}`} onClick={() => goto("finance", "rent")}>
            <Amount value={collected} loading={loading} error={failed} />
          </Kpi>
          <Kpi label="Outstanding" onClick={() => goto("finance", "rent")}>
            <Amount value={outstanding} loading={loading} error={failed} />
          </Kpi>
          <Kpi label="Gross Rent Spread">
            <Amount value={spread} loading={dashboard.isLoading} error={dashboard.isError} />
          </Kpi>
          <Kpi label="Expenses" onClick={() => goto("finance", "expenses")}>
            <Amount value={expenseTotal} loading={expenses.isLoading} error={expenses.isError} />
          </Kpi>
        </div>

        <Surface className="grid grid-cols-4 divide-x divide-[var(--cc-divider)] p-1">
          <StatCell label="Stalls" value={stalls.length} loading={fc.stalls.isLoading} onClick={() => goto("stalls")} />
          <StatCell label="Occupied" value={occupied} loading={fc.stalls.isLoading} onClick={() => goto("stalls")} />
          <StatCell label="Available" value={available} loading={fc.stalls.isLoading} onClick={() => goto("stalls")} />
          <StatCell label="Overdue" value={overdue.length} loading={rents.isLoading} tone={overdue.length ? "text-red-600" : undefined} onClick={() => goto("finance", "rent")} />
        </Surface>

        <div className="grid grid-cols-4 gap-2" aria-label="Quick actions">
          {quick.map(({ label, icon, run }) => {
            const Icon = icon;
            return (
              <button
                key={label}
                type="button"
                onClick={run}
                className="flex min-h-[60px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[16px] border border-[var(--cc-border)] bg-white px-1 text-[11px] font-semibold text-[var(--cc-text)] transition hover:border-[var(--cc-primary)]/50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]"
              >
                <span className="grid size-7 place-items-center rounded-lg bg-[var(--cc-primary-light)] text-[var(--cc-primary)]">
                  <Icon className="size-4" />
                </span>
                <span className="max-w-full truncate">{label === "Tenant" || label === "Stall" || label === "Expense" ? `+ ${label}` : label}</span>
              </button>
            );
          })}
        </div>

        <Surface className="p-3.5">
          <SectionHeader
            title="Needs Attention"
            className="min-h-9"
          />
          {loading || actions.isLoading || leases.isLoading ? (
            <Skeleton className="mt-1 h-12 w-full rounded-xl" />
          ) : failed ? (
            <p className="py-2 text-sm text-[var(--cc-secondary-text)]">Unable to load alerts.</p>
          ) : attention.length === 0 ? (
            <p className="py-2 text-sm text-emerald-700">All clear — nothing needs attention.</p>
          ) : (
            <ul className="divide-y divide-[var(--cc-divider)]">
              {attention.map((item) => (
                <li key={item.key}>
                  <button type="button" onClick={item.go} className="flex min-h-11 w-full cursor-pointer items-center gap-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)] rounded-lg">
                    <span className={cn("size-2.5 shrink-0 rounded-full", item.dot)} aria-hidden="true" />
                    <span className="min-w-0 flex-1 font-medium">{item.text}</span>
                    <span className="text-xs font-semibold text-[var(--cc-primary)]">Review</span>
                    <ChevronRight className="size-4 text-[var(--cc-muted-text)]" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>

      <div className="space-y-3 lg:col-span-5">
        <Surface className="p-3.5">
          <SectionHeader title="Rent Collection" subtitle={formatMonthLabel(month)} />
          {rents.isLoading ? (
            <Skeleton className="h-10 w-full rounded-xl" />
          ) : rents.isError ? (
            <p className="py-2 text-sm text-[var(--cc-secondary-text)]">Unable to load rent data.</p>
          ) : monthInvoices.length === 0 ? (
            <div className="space-y-2 py-1">
              <p className="text-sm text-[var(--cc-secondary-text)]">No rent records for {formatMonthLabel(month)}.</p>
              <Button className="min-h-11 w-full rounded-xl" onClick={() => goto("finance", "rent")}>Generate rent</Button>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(collected)} <span className="font-normal text-[var(--cc-secondary-text)]">/ {formatCurrency(billed)}</span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--cc-page)]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Rent collected">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
              </div>
              <Button variant="outline" className="mt-3 min-h-11 w-full rounded-xl" onClick={() => goto("finance", "rent")}>View Rent</Button>
            </>
          )}
        </Surface>

        <Surface className="p-3.5">
          <SectionHeader title="Stalls" subtitle={`${occupied} occupied · ${available} available`} />
          <Button variant="outline" className="min-h-11 w-full rounded-xl" onClick={() => goto("stalls")}>View All Stalls →</Button>
        </Surface>

        <Surface className="p-3.5">
          <SectionHeader title="Financial Summary" subtitle={formatMonthLabel(month)} />
          <dl className="space-y-1.5 text-sm">
            <Row label="Tenant Rent" value={d?.monthlyContractedRent} loading={dashboard.isLoading} error={dashboard.isError} />
            <Row label="Landlord Lease" value={d?.monthlyLandlordLease} loading={dashboard.isLoading} error={dashboard.isError} />
            <Row label="Gross Rent Spread" value={spread} loading={dashboard.isLoading} error={dashboard.isError} hint="Tenant rent minus landlord lease" />
            <Row label="Expenses" value={expenseTotal} loading={expenses.isLoading} error={expenses.isError} />
            <div className="border-t border-[var(--cc-divider)] pt-1.5">
              <Row label="Net Contribution" value={spread - expenseTotal} loading={dashboard.isLoading || expenses.isLoading} error={dashboard.isError || expenses.isError} strong />
            </div>
          </dl>
        </Surface>

        <Surface className="p-3.5">
          <SectionHeader
            title="Recent Actions"
            action={<Button variant="ghost" className="min-h-11 text-[var(--cc-primary)]" onClick={() => goto("ops", "actions")}>See all</Button>}
          />
          {actions.isLoading ? (
            <Skeleton className="h-16 w-full rounded-xl" />
          ) : actions.isError ? (
            <p className="py-2 text-sm text-[var(--cc-secondary-text)]">Unable to load actions.</p>
          ) : openActions.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No open actions" description="Add an action to track follow-ups." action={<Button className="min-h-11 rounded-xl" onClick={() => fc.open("action-form")}><Plus className="size-4" /> Add action</Button>} />
          ) : (
            <ul className="divide-y divide-[var(--cc-divider)]">
              {openActions.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => fc.open("action-form", { itemId: item.id })} className="flex min-h-12 w-full cursor-pointer items-center gap-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)] rounded-lg">
                    <StatusPill tone={item.priority === "HIGH" || item.priority === "CRITICAL" ? "danger" : item.priority === "MEDIUM" ? "warning" : "muted"}>{titleCase(item.priority)}</StatusPill>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.title}</span>
                      {item.dueDate && <span className="block text-xs text-[var(--cc-secondary-text)]">Due {formatShortDate(item.dueDate)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </div>
  );
}

function Row({ label, value, loading, error, hint, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn("min-w-0", strong ? "font-semibold" : "text-[var(--cc-secondary-text)]")}>
        {label}
        {hint && <span className="block text-[11px] text-[var(--cc-muted-text)]">{hint}</span>}
      </dt>
      <dd className={cn("tabular-nums", strong ? "text-base font-bold" : "font-semibold")}>
        <Amount value={value} loading={loading} error={error} />
      </dd>
    </div>
  );
}




