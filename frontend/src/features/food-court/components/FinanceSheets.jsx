import { useState } from "react";
import { Button } from "@/components/ui/button";

import * as api from "../api";
import { useFc } from "../context";
import {
  canPay,
  depositBalance,
  formatCurrency,
  formatDate,
  num,
  paymentMethodLabel,
  rentStatusLabel,
  RENT_TONES,
  invoiceStatus,
  stallTitle,
  tenantDisplayName,
  titleCase,
  todayISO,
} from "../format";
import { useFcMutation, useRentAdjustments, useRentPayments } from "../hooks";
import { PAYMENT_METHOD_OPTIONS } from "./CoreSheets";
import {
  AppSheet,
  ConfirmDialog,
  DateField,
  DetailSection,
  FormSheet,
  KeyValue,
  MoneyField,
  SelectField,
  StatusPill,
  TextAreaField,
  TextField,
  emptyToNull,
  useFormState,
} from "./kit";
import { LinkButton, invoiceMonth } from "./shared";

const toInstant = (date) => new Date(`${date || todayISO()}T12:00:00`).toISOString();

// ───────────────────────── Rent ─────────────────────────

const findInvoice = (fc, invoiceId) =>
  fc.allRents.data?.find((item) => item.id === invoiceId) ?? fc.rents.data?.find((item) => item.id === invoiceId);

export function RentDetailSheet({ invoiceId }) {
  const fc = useFc();
  const invoice = findInvoice(fc, invoiceId);
  const payments = useRentPayments(fc.foodCourtId, invoiceId);
  const adjustments = useRentAdjustments(fc.foodCourtId, invoiceId);
  if (!invoice) return null;
  const status = invoiceStatus(invoice);
  const tenant = fc.tenants.data?.find((item) => item.id === invoice.tenantId);

  return (
    <AppSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={`${invoice.tenantName} · Unit ${invoice.stallCode}`}
      description={`Rent for ${invoiceMonth(invoice)}`}
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" className="min-h-11 rounded-xl" disabled={invoice.status === "CANCELLED"} onClick={() => fc.open("rent-adjust", { invoiceId })}>
            Adjust
          </Button>
          <Button className="min-h-11 rounded-xl" disabled={!canPay(invoice)} onClick={() => fc.open("rent-payment", { invoiceId })}>
            Record Payment
          </Button>
        </div>
      }
    >
      <div className="rounded-[16px] border border-[var(--cc-border)] bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-[var(--cc-muted-text)]">Balance due</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(invoice.balanceDue)}</p>
          </div>
          <StatusPill tone={RENT_TONES[status] || "muted"}>{rentStatusLabel(invoice)}</StatusPill>
        </div>
      </div>
      <DetailSection title="Breakdown">
        <dl>
          <KeyValue label="Tenant">
            {tenant ? <LinkButton onClick={() => fc.open("tenant-detail", { tenantId: tenant.id })}>{tenantDisplayName(tenant)}</LinkButton> : invoice.tenantName}
          </KeyValue>
          <KeyValue label="Due date">{formatDate(invoice.dueDate)}</KeyValue>
          <KeyValue label="Rent for the month">{formatCurrency(invoice.rentAmount)}</KeyValue>
          <KeyValue label="Adjustments">{formatCurrency(invoice.adjustmentTotal)}</KeyValue>
          <KeyValue label="Net amount">{formatCurrency(invoice.netAmount)}</KeyValue>
          <KeyValue label="Paid">{formatCurrency(invoice.amountPaid)}</KeyValue>
          {invoice.notes && <KeyValue label="Notes">{invoice.notes}</KeyValue>}
        </dl>
      </DetailSection>
      <DetailSection title="Payments">
        {payments.isLoading ? (
          <p className="py-3 text-sm text-[var(--cc-muted-text)]">Loading…</p>
        ) : payments.isError ? (
          <p className="py-3 text-sm text-red-600">Unable to load payments.</p>
        ) : payments.data?.length ? (
          <ul className="divide-y divide-[var(--cc-divider)]">
            {payments.data.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium">{formatDate(payment.paidAt)}</span>
                  <span className="block truncate text-xs text-[var(--cc-secondary-text)]">
                    {paymentMethodLabel(payment.paymentMethod)}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{formatCurrency(payment.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-3 text-sm text-[var(--cc-muted-text)]">No payments recorded.</p>
        )}
      </DetailSection>
      {adjustments.data?.length > 0 && (
        <DetailSection title="Adjustments">
          <ul className="divide-y divide-[var(--cc-divider)]">
            {adjustments.data.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium">{titleCase(item.adjustmentType)}</span>
                  {item.reason && <span className="block truncate text-xs text-[var(--cc-secondary-text)]">{item.reason}</span>}
                </span>
                <span className="font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
    </AppSheet>
  );
}

export function RentPaymentSheet({ invoiceId }) {
  const fc = useFc();
  const invoice = findInvoice(fc, invoiceId);
  const { values, bind, set } = useFormState({
    amount: invoice ? num(invoice.balanceDue) : "",
    paymentMethod: "CASH",
    paidDate: todayISO(),
    reference: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const save = useFcMutation((payload) => api.recordRentPayment(fc.foodCourtId, invoiceId, payload), {
    success: "Payment recorded",
    failure: "Unable to record this payment",
  });
  if (!invoice) return null;

  const submit = () => {
    const next = {};
    const amount = Number(values.amount);
    if (!(amount > 0)) next.amount = "Enter an amount above ₹0";
    else if (amount > num(invoice.balanceDue)) next.amount = `Cannot exceed the balance of ${formatCurrency(invoice.balanceDue)}`;
    if (!values.paidDate) next.paidDate = "Choose the payment date";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      {
        amount,
        paymentMethod: values.paymentMethod,
        paidAt: toInstant(values.paidDate),
        reference: emptyToNull(values.reference.trim()),
        notes: emptyToNull(values.notes.trim()),
      },
      { onSuccess: fc.close },
    );
  };

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title="Record payment"
      description={`${invoice.tenantName} · Unit ${invoice.stallCode} · ${invoiceMonth(invoice)}`}
      onSubmit={submit}
      saving={save.isPending}
      submitLabel="Record payment"
    >
      <div className="rounded-xl bg-white p-3 text-sm">
        <div className="flex justify-between"><span className="text-[var(--cc-secondary-text)]">Balance due</span><b className="tabular-nums">{formatCurrency(invoice.balanceDue)}</b></div>
      </div>
      <MoneyField label="Amount (₹)" required error={errors.amount} hint="Enter less than the balance for a partial payment." {...bind("amount")} />
      <SelectField label="Payment method" value={values.paymentMethod} onChange={set("paymentMethod")} options={PAYMENT_METHOD_OPTIONS} />
      <DateField label="Payment date" required error={errors.paidDate} {...bind("paidDate")} />
      <TextField label="Reference / transaction ID" {...bind("reference")} />
      <TextAreaField label="Notes" {...bind("notes")} />
    </FormSheet>
  );
}

const ADJUSTMENT_OPTIONS = [
  { value: "DISCOUNT", label: "Discount" },
  { value: "WAIVER", label: "Waiver" },
  { value: "LATE_FEE", label: "Late fee" },
  { value: "CORRECTION", label: "Correction (+/−)" },
];

export function RentAdjustSheet({ invoiceId }) {
  const fc = useFc();
  const invoice = findInvoice(fc, invoiceId);
  const { values, bind, set } = useFormState({ type: "DISCOUNT", amount: "", reason: "" });
  const [errors, setErrors] = useState({});
  const save = useFcMutation((payload) => api.applyRentAdjustment(fc.foodCourtId, invoiceId, payload), {
    success: "Adjustment applied",
    failure: "Unable to apply this adjustment",
  });
  if (!invoice) return null;

  const submit = () => {
    const next = {};
    const entered = Number(values.amount);
    if (!entered) next.amount = "Enter a non-zero amount";
    if (!values.reason.trim()) next.reason = "Add a reason for the audit trail";
    setErrors(next);
    if (Object.keys(next).length) return;
    // Discounts and waivers reduce rent; late fees increase it; corrections keep the typed sign.
    const magnitude = Math.abs(entered);
    const amount =
      values.type === "DISCOUNT" || values.type === "WAIVER" ? -magnitude : values.type === "LATE_FEE" ? magnitude : entered;
    save.mutate({ adjustmentType: values.type, amount, reason: values.reason.trim() }, { onSuccess: fc.close });
  };

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title="Adjust rent"
      description={`${invoice.tenantName} · ${invoiceMonth(invoice)}`}
      onSubmit={submit}
      saving={save.isPending}
      submitLabel="Apply adjustment"
    >
      <SelectField label="Type" value={values.type} onChange={set("type")} options={ADJUSTMENT_OPTIONS} />
      <MoneyField label="Amount (₹)" required error={errors.amount} min={undefined} hint="Discounts and waivers are subtracted automatically." {...bind("amount")} />
      <TextAreaField label="Reason" error={errors.reason} {...bind("reason")} />
    </FormSheet>
  );
}

// ───────────────────────── Deposits ─────────────────────────

const DEPOSIT_TYPE_OPTIONS = [
  { value: "SECURITY", label: "Security deposit" },
  { value: "ADVANCE", label: "Advance" },
  { value: "ASSET_CONSIDERATION", label: "Asset / vehicle consideration" },
];

export function DepositDetailSheet({ depositId }) {
  const fc = useFc();
  const deposit = fc.deposits.data?.find((item) => item.id === depositId);
  if (!deposit) return null;
  const tenant = fc.tenants.data?.find((item) => item.id === deposit.tenantId);
  const lease = fc.leases.data?.find((item) => item.id === deposit.leaseId);
  const settleable = deposit.status === "HELD" || deposit.status === "PARTIALLY_REFUNDED";
  const asset = deposit.depositType === "ASSET_CONSIDERATION" || deposit.paymentMethod === "ASSET";

  return (
    <AppSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={tenant ? tenantDisplayName(tenant) : "Deposit"}
      description={titleCase(deposit.depositType)}
      footer={
        <Button className="min-h-11 w-full rounded-xl" disabled={!settleable} onClick={() => fc.open("deposit-settle", { depositId })}>
          {settleable ? "Refund / Adjust" : "Settled"}
        </Button>
      }
    >
      <div className="flex items-start justify-between gap-2 rounded-[16px] border border-[var(--cc-border)] bg-white p-4">
        <div>
          <p className="text-xs text-[var(--cc-muted-text)]">Balance held</p>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(depositBalance(deposit))}</p>
        </div>
        <StatusPill tone={deposit.status === "HELD" ? "info" : deposit.status === "FORFEITED" ? "danger" : "muted"}>
          {titleCase(deposit.status)}
        </StatusPill>
      </div>
      <DetailSection title="Amounts">
        <dl>
          <KeyValue label="Agreed (lease)">{lease?.depositAmount == null ? "—" : formatCurrency(lease.depositAmount)}</KeyValue>
          <KeyValue label="Received">{formatCurrency(deposit.amount)}</KeyValue>
          <KeyValue label="Returned / adjusted">{formatCurrency(deposit.refundedAmount)}</KeyValue>
          <KeyValue label="Balance">{formatCurrency(depositBalance(deposit))}</KeyValue>
        </dl>
      </DetailSection>
      <DetailSection title="Payment">
        <dl>
          <KeyValue label="Method">{asset ? "Asset / Vehicle" : paymentMethodLabel(deposit.paymentMethod)}</KeyValue>
          <KeyValue label="Received on">{deposit.receivedDate ? formatDate(deposit.receivedDate) : "Not recorded"}</KeyValue>
          {deposit.assetDescription && <KeyValue label="Asset details">{deposit.assetDescription}</KeyValue>}
          {deposit.notes && <KeyValue label="Notes">{deposit.notes}</KeyValue>}
        </dl>
      </DetailSection>
      {lease && (
        <Button variant="outline" className="min-h-11 w-full rounded-xl" onClick={() => fc.open("lease-detail", { leaseId: lease.id })}>
          View lease · Unit {lease.stallCode}
        </Button>
      )}
    </AppSheet>
  );
}

export function DepositFormSheet({ tenantId: presetTenantId }) {
  const fc = useFc();
  const { values, bind, set } = useFormState({
    tenantId: presetTenantId ?? "",
    depositType: "SECURITY",
    amount: "",
    paymentMethod: "CASH",
    receivedDate: "",
    assetDescription: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const save = useFcMutation((payload) => api.createDeposit(fc.foodCourtId, payload), {
    success: "Deposit recorded",
    failure: "Unable to record this deposit",
  });

  const tenantOptions = (fc.tenants.data || []).map((tenant) => ({ value: tenant.id, label: tenantDisplayName(tenant) }));
  const lease = (fc.leases.data || []).find((item) => item.tenantId === values.tenantId && item.status === "ACTIVE");
  const showAsset = values.paymentMethod === "ASSET" || values.depositType === "ASSET_CONSIDERATION";

  const submit = () => {
    const next = {};
    if (!values.tenantId) next.tenantId = "Choose a tenant";
    if (values.amount === "" || Number(values.amount) < 0) next.amount = "Enter the amount (use 0 for none)";
    if (showAsset && !values.assetDescription.trim()) next.assetDescription = "Describe the asset or vehicle";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      {
        leaseType: "STALL",
        leaseId: lease?.id ?? null,
        tenantId: values.tenantId,
        depositType: values.depositType,
        amount: Number(values.amount),
        paymentMethod: values.paymentMethod,
        receivedDate: emptyToNull(values.receivedDate),
        assetDescription: showAsset ? emptyToNull(values.assetDescription.trim()) : null,
        notes: emptyToNull(values.notes.trim()),
      },
      { onSuccess: fc.close },
    );
  };

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title="Record deposit"
      onSubmit={submit}
      saving={save.isPending}
      submitLabel="Record deposit"
    >
      <SelectField label="Tenant" required error={errors.tenantId} value={values.tenantId} onChange={set("tenantId")} options={tenantOptions} placeholder="Choose tenant" disabled={Boolean(presetTenantId)} />
      {lease && <p className="-mt-2 text-xs text-[var(--cc-secondary-text)]">Linked to Unit {lease.stallCode} lease{lease.depositAmount != null ? ` · agreed ${formatCurrency(lease.depositAmount)}` : ""}</p>}
      <SelectField label="Type" value={values.depositType} onChange={set("depositType")} options={DEPOSIT_TYPE_OPTIONS} />
      <MoneyField label="Amount (₹)" required error={errors.amount} hint="For an asset, enter its agreed value." {...bind("amount")} />
      <SelectField label="Payment method" value={values.paymentMethod} onChange={set("paymentMethod")} options={PAYMENT_METHOD_OPTIONS} />
      <DateField label="Received on" hint="Leave blank if the date is unknown." {...bind("receivedDate")} />
      {showAsset && (
        <TextAreaField label="Asset / vehicle details" error={errors.assetDescription} placeholder="Type, registration number, estimated value, ownership" {...bind("assetDescription")} />
      )}
      <TextAreaField label="Notes" {...bind("notes")} />
    </FormSheet>
  );
}

const SETTLE_OPTIONS = [
  { value: "PARTIALLY_REFUNDED", label: "Partial refund" },
  { value: "REFUNDED", label: "Full refund" },
  { value: "ADJUSTED", label: "Adjusted against dues" },
  { value: "FORFEITED", label: "Forfeited" },
];

export function DepositSettleSheet({ depositId }) {
  const fc = useFc();
  const deposit = fc.deposits.data?.find((item) => item.id === depositId);
  const balance = deposit ? depositBalance(deposit) : 0;
  const { values, bind, setValues } = useFormState({ status: "REFUNDED", refundAmount: balance, notes: "" });
  const [errors, setErrors] = useState({});
  const save = useFcMutation((payload) => api.settleDeposit(fc.foodCourtId, depositId, payload), {
    success: "Deposit updated",
    failure: "Unable to update this deposit",
  });
  if (!deposit) return null;

  const needsAmount = values.status !== "FORFEITED";
  const submit = () => {
    const next = {};
    const amount = Number(values.refundAmount);
    if (needsAmount && !(amount > 0)) next.refundAmount = "Enter an amount above ₹0";
    if (needsAmount && amount > balance) next.refundAmount = `Cannot exceed the balance of ${formatCurrency(balance)}`;
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      { status: values.status, refundAmount: needsAmount ? amount : null, notes: emptyToNull(values.notes.trim()) },
      { onSuccess: fc.close },
    );
  };

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title="Refund / adjust deposit"
      description={`Balance held ${formatCurrency(balance)}`}
      onSubmit={submit}
      saving={save.isPending}
      submitLabel="Update deposit"
    >
      <SelectField
        label="Outcome"
        value={values.status}
        onChange={(status) => setValues((current) => ({ ...current, status, refundAmount: status === "REFUNDED" ? balance : current.refundAmount }))}
        options={SETTLE_OPTIONS}
      />
      {needsAmount && <MoneyField label="Amount (₹)" required error={errors.refundAmount} {...bind("refundAmount")} />}
      <TextAreaField label="Notes" {...bind("notes")} />
    </FormSheet>
  );
}

// ───────────────────────── Expenses ─────────────────────────

export const EXPENSE_CATEGORIES = [
  "LEASE", "ELECTRICITY", "WATER", "INTERNET", "SECURITY", "CLEANING", "MAINTENANCE", "REPAIR",
  "PEST_CONTROL", "MARKETING", "WASTE_DISPOSAL", "EQUIPMENT", "FURNITURE", "RENOVATION", "OTHER",
];
const EXPENSE_OPTIONS = EXPENSE_CATEGORIES.map((value) => ({ value, label: titleCase(value) }));

export function ExpenseFormSheet({ expenseId }) {
  const fc = useFc();
  const existing = expenseId ? fc.expenses.data?.find((item) => item.id === expenseId) : null;
  const { values, bind, set } = useFormState({
    category: existing?.category ?? "ELECTRICITY",
    amount: existing?.amount ?? "",
    expenseDate: existing?.expenseDate ?? todayISO(),
    vendorName: existing?.vendorName ?? "",
    paymentMethod: existing?.paymentMethod ?? "CASH",
    description: existing?.description ?? "",
  });
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useFcMutation(
    (payload) => (existing ? api.updateExpense(fc.foodCourtId, expenseId, payload) : api.createExpense(fc.foodCourtId, payload)),
    { success: existing ? "Expense updated" : "Expense added", failure: "Unable to save this expense" },
  );
  const remove = useFcMutation(() => api.deleteExpense(fc.foodCourtId, expenseId), {
    success: "Expense deleted",
    failure: "Unable to delete this expense",
  });

  const submit = () => {
    const next = {};
    if (!(Number(values.amount) > 0)) next.amount = "Enter an amount above ₹0";
    if (!values.expenseDate) next.expenseDate = "Choose the expense date";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      {
        category: values.category,
        amount: Number(values.amount),
        expenseDate: values.expenseDate,
        paymentMethod: emptyToNull(values.paymentMethod),
        vendorName: emptyToNull(values.vendorName.trim()),
        description: emptyToNull(values.description.trim()),
      },
      { onSuccess: fc.close },
    );
  };

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={existing ? "Edit expense" : "Add expense"}
      onSubmit={submit}
      saving={save.isPending}
      submitLabel={existing ? "Save changes" : "Add expense"}
    >
      <SelectField label="Category" value={values.category} onChange={set("category")} options={EXPENSE_OPTIONS} />
      <MoneyField label="Amount (₹)" required error={errors.amount} {...bind("amount")} />
      <DateField label="Date" required error={errors.expenseDate} {...bind("expenseDate")} />
      <TextField label="Vendor" {...bind("vendorName")} />
      <SelectField label="Payment method" value={values.paymentMethod} onChange={set("paymentMethod")} options={PAYMENT_METHOD_OPTIONS} />
      <TextAreaField label="Notes" {...bind("description")} />
      {existing && (
        <>
          <Button type="button" variant="ghost" className="min-h-11 w-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
            Delete expense
          </Button>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Delete this expense?"
            description={`${titleCase(existing.category)} · ${formatCurrency(existing.amount)} will be removed from the totals.`}
            confirmLabel="Delete"
            destructive
            pending={remove.isPending}
            onConfirm={() => remove.mutate(undefined, { onSuccess: () => { setConfirmDelete(false); fc.close(); } })}
          />
        </>
      )}
    </FormSheet>
  );
}

export { stallTitle };


