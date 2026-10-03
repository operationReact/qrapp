import { useMemo, useState } from "react";
import { Plus, Receipt, Wallet, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";

import * as api from "../api";
import { useFc } from "../context";
import {
  canPay,
  depositBalance,
  formatCurrency,
  formatMonthLabel,
  formatShortDate,
  invoiceStatus,
  paymentMethodLabel,
  sumInvoices,
  tenantDisplayName,
  titleCase,
} from "../format";
import { useFcMutation } from "../hooks";
import { Amount, EmptyState, PressCard, QueryGate, SectionHeader, StatusPill, Surface, TabStrip } from "./kit";
import { RentPill } from "./shared";

const GRID = "grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3";

export function RentScreen() {
  const fc = useFc();
  const [filter, setFilter] = useState("ALL");
  const generate = useFcMutation(() => api.generateRent(fc.foodCourtId, fc.month), {
    success: `Rent generated for ${formatMonthLabel(fc.month)}`,
    failure: "Unable to generate rent",
  });
  const invoices = useMemo(() => (fc.rents.data || []).filter((item) => item.status !== "CANCELLED"), [fc.rents.data]);
  const collected = sumInvoices(invoices, "amountPaid");
  const outstanding = sumInvoices(invoices, "balanceDue");
  const count = (status) => invoices.filter((item) => invoiceStatus(item) === status).length;
  const chips = [
    { key: "ALL", label: "All", count: invoices.length },
    { key: "OVERDUE", label: "Overdue", count: count("OVERDUE") },
    { key: "OPEN", label: "Unpaid", count: invoices.filter(canPay).length },
    { key: "PAID", label: "Paid", count: count("PAID") },
  ];
  const shown = invoices.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "OPEN") return canPay(item);
    return invoiceStatus(item) === filter;
  });

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Rent Collection"
        subtitle={formatMonthLabel(fc.month)}
        action={
          <Button variant="outline" className="min-h-11 rounded-xl" disabled={generate.isPending} onClick={() => generate.mutate()}>
            {generate.isPending ? "Generating…" : "Generate Rent"}
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-2.5">
        <Surface className="p-3">
          <p className="text-[11px] text-[var(--cc-secondary-text)]">Collected</p>
          <p className="text-lg font-bold text-emerald-700"><Amount value={collected} loading={fc.rents.isLoading} error={fc.rents.isError} /></p>
        </Surface>
        <Surface className="p-3">
          <p className="text-[11px] text-[var(--cc-secondary-text)]">Outstanding</p>
          <p className="text-lg font-bold"><Amount value={outstanding} loading={fc.rents.isLoading} error={fc.rents.isError} /></p>
        </Surface>
      </div>
      <TabStrip variant="pill" label="Filter rent" items={chips} value={filter} onChange={setFilter} />
      <QueryGate query={fc.rents} noun="rent data">
        {invoices.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={`No rent records for ${formatMonthLabel(fc.month)}.`}
            description="Generate rent from the active leases."
            action={<Button className="min-h-11 rounded-xl" disabled={generate.isPending} onClick={() => generate.mutate()}>Generate Rent</Button>}
          />
        ) : shown.length === 0 ? (
          <EmptyState icon={Wallet} title="Nothing in this filter" />
        ) : (
          <div className={GRID}>
            {shown.map((invoice) => (
              <div key={invoice.id} className="space-y-1.5">
                <PressCard label={`Rent ${invoice.tenantName}`} onClick={() => fc.open("rent-detail", { invoiceId: invoice.id })}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold">{invoice.tenantName}</p>
                      <p className="text-xs text-[var(--cc-secondary-text)]">Unit {invoice.stallCode}</p>
                    </div>
                    <RentPill invoice={invoice} />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-sm">
                    <span className="text-lg font-bold tabular-nums">{formatCurrency(invoice.netAmount)}</span>
                    {invoice.amountPaid > 0 && invoice.balanceDue > 0 && (
                      <span className="text-xs text-[var(--cc-secondary-text)]">Balance {formatCurrency(invoice.balanceDue)}</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--cc-secondary-text)]">Due {formatShortDate(invoice.dueDate)}</p>
                </PressCard>
                {canPay(invoice) && (
                  <Button className="min-h-11 w-full rounded-xl" onClick={() => fc.open("rent-payment", { invoiceId: invoice.id })}>
                    Record Payment
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

export function DepositsScreen() {
  const fc = useFc();
  const deposits = fc.deposits.data || [];
  const tenantById = useMemo(() => new Map((fc.tenants.data || []).map((tenant) => [tenant.id, tenant])), [fc.tenants.data]);
  const leaseById = useMemo(() => new Map((fc.leases.data || []).map((lease) => [lease.id, lease])), [fc.leases.data]);
  const held = deposits.reduce((total, item) => total + depositBalance(item), 0);

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Deposits"
        subtitle={fc.deposits.isLoading ? "Loading…" : `${formatCurrency(held)} held`}
        action={<Button className="min-h-11 rounded-xl px-4" onClick={() => fc.open("deposit-form")}><Plus className="size-4" aria-hidden="true" /> Record</Button>}
      />
      <QueryGate query={fc.deposits} noun="deposits">
        {deposits.length === 0 ? (
          <EmptyState icon={Landmark} title="No deposits recorded" description="Record the advance or security deposit collected from a tenant." action={<Button className="min-h-11 rounded-xl" onClick={() => fc.open("deposit-form")}>Record deposit</Button>} />
        ) : (
          <div className={GRID}>
            {deposits.map((deposit) => {
              const tenant = tenantById.get(deposit.tenantId);
              const lease = leaseById.get(deposit.leaseId);
              const asset = deposit.depositType === "ASSET_CONSIDERATION" || deposit.paymentMethod === "ASSET";
              return (
                <PressCard key={deposit.id} label="Deposit details" onClick={() => fc.open("deposit-detail", { depositId: deposit.id })}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold">{tenant ? tenantDisplayName(tenant) : deposit.tenantName || "Tenant"}</p>
                      <p className="text-xs text-[var(--cc-secondary-text)]">{titleCase(deposit.depositType)}{lease ? ` · Unit ${lease.stallCode}` : ""}</p>
                    </div>
                    <StatusPill tone={deposit.status === "HELD" ? "info" : deposit.status === "FORFEITED" ? "danger" : "muted"}>{titleCase(deposit.status)}</StatusPill>
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div><dt className="text-[var(--cc-muted-text)]">Agreed</dt><dd className="font-semibold tabular-nums">{lease?.depositAmount == null ? "—" : formatCurrency(lease.depositAmount)}</dd></div>
                    <div><dt className="text-[var(--cc-muted-text)]">Received</dt><dd className="font-semibold tabular-nums">{formatCurrency(deposit.amount)}</dd></div>
                    <div><dt className="text-[var(--cc-muted-text)]">Refundable</dt><dd className="font-semibold tabular-nums">{formatCurrency(depositBalance(deposit))}</dd></div>
                  </dl>
                  {asset && <p className="mt-2 text-xs font-medium text-amber-700">Consideration: Asset / Vehicle</p>}
                  {!asset && deposit.paymentMethod && <p className="mt-2 text-xs text-[var(--cc-secondary-text)]">{paymentMethodLabel(deposit.paymentMethod)}</p>}
                </PressCard>
              );
            })}
          </div>
        )}
      </QueryGate>
    </section>
  );
}

export function ExpensesScreen() {
  const fc = useFc();
  const [category, setCategory] = useState("ALL");
  const expenses = useMemo(() => fc.expenses.data || [], [fc.expenses.data]);
  const total = sumInvoices(expenses, "amount");
  const byCategory = useMemo(() => {
    const map = new Map();
    expenses.forEach((item) => map.set(item.category, (map.get(item.category) || 0) + Number(item.amount || 0)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);
  const shown = category === "ALL" ? expenses : expenses.filter((item) => item.category === category);
  const chips = [{ key: "ALL", label: "All", count: expenses.length }, ...byCategory.map(([key]) => ({ key, label: titleCase(key) }))];

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Expenses"
        subtitle={formatMonthLabel(fc.month)}
        action={<Button className="min-h-11 rounded-xl px-4" onClick={() => fc.open("expense-form")}><Plus className="size-4" aria-hidden="true" /> Add</Button>}
      />
      <Surface className="p-3.5">
        <p className="text-[11px] text-[var(--cc-secondary-text)]">This month</p>
        <p className="text-2xl font-bold tabular-nums"><Amount value={total} loading={fc.expenses.isLoading} error={fc.expenses.isError} /></p>
        {byCategory.length > 0 && (
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {byCategory.slice(0, 6).map(([key, amount]) => (
              <li key={key} className="flex justify-between"><span className="text-[var(--cc-secondary-text)]">{titleCase(key)}</span><span className="font-semibold tabular-nums">{formatCurrency(amount)}</span></li>
            ))}
          </ul>
        )}
      </Surface>
      {byCategory.length > 1 && <TabStrip variant="pill" label="Filter by category" items={chips} value={category} onChange={setCategory} />}
      <QueryGate query={fc.expenses} noun="expenses">
        {expenses.length === 0 ? (
          <EmptyState icon={Receipt} title={`No expenses in ${formatMonthLabel(fc.month)}`} action={<Button className="min-h-11 rounded-xl" onClick={() => fc.open("expense-form")}>Add expense</Button>} />
        ) : (
          <div className={GRID}>
            {shown.map((item) => (
              <PressCard key={item.id} label={`${titleCase(item.category)} expense`} onClick={() => fc.open("expense-form", { expenseId: item.id })}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-bold">{titleCase(item.category)}</p>
                  <p className="text-base font-bold tabular-nums">{formatCurrency(item.amount)}</p>
                </div>
                <p className="text-xs text-[var(--cc-secondary-text)]">{formatShortDate(item.expenseDate)}{item.vendorName ? ` · ${item.vendorName}` : ""}</p>
                {item.description && <p className="mt-1 truncate text-xs text-[var(--cc-muted-text)]">{item.description}</p>}
              </PressCard>
            ))}
          </div>
        )}
      </QueryGate>
    </section>
  );
}

