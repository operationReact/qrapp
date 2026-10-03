import { useState } from "react";
import { Button } from "@/components/ui/button";

import * as api from "../api";
import { useFc } from "../context";
import {
  addDaysISO,
  formatCurrency,
  formatDate,
  formatDateRange,
  paymentMethodLabel,
  STALL_TONES,
  canPay,
  isActiveLease,
  num,
  stallTitle,
  tenantDisplayName,
  titleCase,
  todayISO,
} from "../format";
import { useFcMutation } from "../hooks";
import {
  AppSheet,
  ConfirmDialog,
  DateField,
  DetailSection,
  EmptyState,
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
import { InvoiceRows, LinkButton, PhoneLink, RentPill } from "./shared";

const STALL_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "VACANT", label: "Vacant" },
  { value: "RESERVED", label: "Reserved" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ASSET", label: "Asset / Vehicle" },
  { value: "OTHER", label: "Other" },
];

// ───────────────────────── Stall ─────────────────────────

export function StallDetailSheet({ stallId }) {
  const fc = useFc();
  const row = fc.stallRows.find((item) => item.stall.id === stallId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useFcMutation(() => api.deleteStall(fc.foodCourtId, stallId), {
    success: "Stall deleted",
    failure: "Unable to delete this stall",
  });
  if (!row) return null;

  const { stall, state, lease, tenant, tenantName, monthlyRent, invoice } = row;
  const history = (fc.allRents.data || []).filter((item) => item.stallId === stallId).slice(0, 6);
  const deposits = (fc.deposits.data || []).filter(
    (deposit) => lease && (deposit.leaseId === lease.id || deposit.tenantId === lease.tenantId),
  );

  return (
    <AppSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={stallTitle(stall)}
      description={stall.name || "Stall details"}
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => fc.open("stall-form", { stallId })}>
            Edit Stall
          </Button>
          {state === "OCCUPIED" ? (
            <Button
              className="min-h-11 rounded-xl"
              onClick={() => fc.open("lease-form", { stallId, replaceLeaseId: lease?.id })}
            >
              Change Tenant
            </Button>
          ) : (
            <Button
              className="min-h-11 rounded-xl"
              disabled={state === "MAINTENANCE"}
              onClick={() => fc.open("lease-form", { stallId })}
            >
              Assign Tenant
            </Button>
          )}
          {lease && (
            <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => fc.open("lease-detail", { leaseId: lease.id })}>
              View Lease
            </Button>
          )}
          {invoice && canPay(invoice) && (
            <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => fc.open("rent-payment", { invoiceId: invoice.id })}>
              Record Rent
            </Button>
          )}
        </div>
      }
    >
      <div className="rounded-[16px] border border-[var(--cc-border)] bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{tenantName || (state === "MAINTENANCE" ? "Under maintenance" : "No tenant assigned")}</p>
            <p className="text-xs text-[var(--cc-secondary-text)]">{[stall.floor, stall.areaSqft && `${stall.areaSqft} sq.ft`].filter(Boolean).join(" · ") || "—"}</p>
          </div>
          <StatusPill tone={STALL_TONES[state]}>{titleCase(state)}</StatusPill>
        </div>
        <p className="mt-3 text-xs text-[var(--cc-muted-text)]">Monthly rent</p>
        <p className="text-2xl font-bold tabular-nums">{monthlyRent == null ? "—" : formatCurrency(monthlyRent)}</p>
        {state === "VACANT" && stall.baseRent != null && (
          <p className="text-xs text-[var(--cc-secondary-text)]">Listed rent {formatCurrency(stall.baseRent)}</p>
        )}
      </div>

      {state === "OCCUPIED" ? (
        <>
          <DetailSection title="Current tenant">
            <dl>
              <KeyValue label="Tenant">
                {tenant ? (
                  <LinkButton onClick={() => fc.open("tenant-detail", { tenantId: tenant.id })}>{tenantName}</LinkButton>
                ) : (
                  tenantName
                )}
              </KeyValue>
              <KeyValue label="Phone">
                <PhoneLink phone={tenant?.contactPhone} />
              </KeyValue>
            </dl>
          </DetailSection>
          <DetailSection title="Lease">
            <dl>
              <KeyValue label="Period">{lease ? formatDateRange(lease.startDate, lease.endDate) : "—"}</KeyValue>
              <KeyValue label="Status">{lease ? titleCase(lease.status) : "—"}</KeyValue>
              <KeyValue label="Rent due day">{lease?.rentDueDay ? `Day ${lease.rentDueDay}` : "—"}</KeyValue>
              <KeyValue label="This month's rent">
                <RentPill invoice={invoice} />
              </KeyValue>
            </dl>
          </DetailSection>
          <DetailSection title="Rent history">
            <InvoiceRows invoices={history} />
          </DetailSection>
          <DetailSection title="Deposit">
            {deposits.length ? (
              <dl>
                {deposits.map((deposit) => (
                  <KeyValue key={deposit.id} label={titleCase(deposit.depositType)}>
                    <LinkButton onClick={() => fc.open("deposit-detail", { depositId: deposit.id })}>
                      {formatCurrency(deposit.amount)}
                    </LinkButton>
                  </KeyValue>
                ))}
              </dl>
            ) : (
              <p className="py-3 text-sm text-[var(--cc-muted-text)]">No deposit recorded.</p>
            )}
          </DetailSection>
        </>
      ) : (
        <EmptyState
          title={state === "MAINTENANCE" ? "Under maintenance" : state === "RESERVED" ? "Reserved" : "Vacant"}
          description={
            state === "MAINTENANCE"
              ? "Change the status in Edit Stall when it is ready to rent."
              : "Assign a tenant to start a lease for this stall."
          }
        />
      )}

      {stall.notes && (
        <DetailSection title="Notes">
          <p className="py-3 text-sm">{stall.notes}</p>
        </DetailSection>
      )}

      <Button
        variant="ghost"
        className="min-h-11 w-full text-red-600 hover:bg-red-50 hover:text-red-700"
        disabled={state === "OCCUPIED"}
        onClick={() => setConfirmDelete(true)}
      >
        {state === "OCCUPIED" ? "End the lease to delete this stall" : "Delete stall"}
      </Button>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${stallTitle(stall)}?`}
        description="The stall will be removed from this food court. This cannot be undone."
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutate(undefined, { onSuccess: () => { setConfirmDelete(false); fc.close(); } })}
      />
    </AppSheet>
  );
}

export function StallFormSheet({ stallId }) {
  const fc = useFc();
  const existing = stallId ? fc.stalls.data?.find((stall) => stall.id === stallId) : null;
  const { values, bind, set } = useFormState({
    code: existing?.code ?? "",
    name: existing?.name ?? "",
    floor: existing?.floor ?? "",
    areaSqft: existing?.areaSqft ?? "",
    baseRent: existing?.baseRent ?? "",
    status: existing ? (existing.occupied ? "AVAILABLE" : existing.status) : "AVAILABLE",
    notes: existing?.notes ?? "",
  });
  const [errors, setErrors] = useState({});
  const save = useFcMutation(
    (payload) => (existing ? api.updateStall(fc.foodCourtId, stallId, payload) : api.createStall(fc.foodCourtId, payload)),
    { success: existing ? "Stall updated" : "Stall added", failure: "Unable to save this stall" },
  );

  const submit = () => {
    const next = {};
    if (!values.code.trim()) next.code = "Stall number is required";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      {
        code: values.code.trim(),
        name: emptyToNull(values.name.trim()),
        floor: emptyToNull(values.floor.trim()),
        areaSqft: emptyToNull(values.areaSqft),
        baseRent: emptyToNull(values.baseRent),
        status: values.status,
        notes: emptyToNull(values.notes.trim()),
      },
      { onSuccess: fc.close },
    );
  };

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={existing ? `Edit ${stallTitle(existing)}` : "Add stall"}
      onSubmit={submit}
      saving={save.isPending}
      submitLabel={existing ? "Save changes" : "Add stall"}
    >
      <TextField label="Stall number / code" required error={errors.code} placeholder="e.g. 01" {...bind("code")} />
      <TextField label="Stall name" placeholder="Optional" {...bind("name")} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Floor / zone" {...bind("floor")} />
        <TextField label="Size (sq.ft)" type="number" inputMode="decimal" min="0" {...bind("areaSqft")} />
      </div>
      <MoneyField label="Listed monthly rent (₹)" hint="Used for vacant stalls; leases carry the real rent." {...bind("baseRent")} />
      <SelectField
        label="Status"
        value={values.status}
        onChange={set("status")}
        options={STALL_STATUS_OPTIONS}
        hint="A stall shows as occupied automatically while it has an active lease."
      />
      <TextAreaField label="Notes" {...bind("notes")} />
    </FormSheet>
  );
}

// ───────────────────────── Tenant ─────────────────────────

export function TenantDetailSheet({ tenantId }) {
  const fc = useFc();
  const row = fc.tenantRows.find((item) => item.tenant.id === tenantId);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const setStatus = useFcMutation(
    (status) =>
      api.updateTenant(fc.foodCourtId, tenantId, {
        name: row.tenant.name,
        businessName: row.tenant.businessName,
        contactPhone: row.tenant.contactPhone,
        contactEmail: row.tenant.contactEmail,
        userId: row.tenant.userId,
        notes: row.tenant.notes,
        status,
      }),
    { success: "Tenant updated", failure: "Unable to update this tenant" },
  );
  if (!row) return null;

  const { tenant, lease, stall, invoice } = row;
  const active = tenant.status === "ACTIVE";
  const leases = (fc.leases.data || []).filter((item) => item.tenantId === tenantId);
  const history = (fc.allRents.data || []).filter((item) => item.tenantId === tenantId).slice(0, 6);
  const deposits = (fc.deposits.data || []).filter((deposit) => deposit.tenantId === tenantId);

  return (
    <AppSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={tenantDisplayName(tenant)}
      description={stall ? stallTitle(stall) : "No stall assigned"}
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => fc.open("tenant-form", { tenantId })}>
            Edit Tenant
          </Button>
          {lease ? (
            <Button className="min-h-11 rounded-xl" onClick={() => fc.open("lease-detail", { leaseId: lease.id })}>
              View Lease
            </Button>
          ) : (
            <Button className="min-h-11 rounded-xl" disabled={!active} onClick={() => fc.open("lease-form", { tenantId })}>
              Assign Stall
            </Button>
          )}
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2 rounded-[16px] border border-[var(--cc-border)] bg-white p-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{tenantDisplayName(tenant)}</p>
          <p className="truncate text-xs text-[var(--cc-secondary-text)]">{tenant.businessName ? tenant.name : "Tenant"}</p>
        </div>
        <StatusPill tone={active ? "success" : "muted"}>{titleCase(tenant.status)}</StatusPill>
      </div>

      <DetailSection title="Contact">
        <dl>
          <KeyValue label="Phone"><PhoneLink phone={tenant.contactPhone} /></KeyValue>
          <KeyValue label="Email">{tenant.contactEmail}</KeyValue>
          {tenant.notes && <KeyValue label="Notes">{tenant.notes}</KeyValue>}
        </dl>
      </DetailSection>

      <DetailSection title="Lease">
        {lease ? (
          <dl>
            <KeyValue label="Stall">
              {stall ? <LinkButton onClick={() => fc.open("stall-detail", { stallId: stall.id })}>{stallTitle(stall)}</LinkButton> : lease.stallCode}
            </KeyValue>
            <KeyValue label="Monthly rent">{formatCurrency(lease.monthlyRent)}</KeyValue>
            <KeyValue label="Period">{formatDateRange(lease.startDate, lease.endDate)}</KeyValue>
            <KeyValue label="Status">{titleCase(lease.status)}</KeyValue>
            <KeyValue label="This month"><RentPill invoice={invoice} /></KeyValue>
          </dl>
        ) : (
          <p className="py-3 text-sm text-[var(--cc-muted-text)]">No lease yet.</p>
        )}
        {leases.length > 1 && <p className="pb-2 text-xs text-[var(--cc-muted-text)]">{leases.length} leases on record</p>}
      </DetailSection>

      <DetailSection title="Rent history">
        <InvoiceRows invoices={history} />
      </DetailSection>

      <DetailSection
        title="Deposit"
        action={
          <button
            type="button"
            className="min-h-11 cursor-pointer text-xs font-semibold text-[var(--cc-primary)]"
            onClick={() => fc.open("deposit-form", { tenantId })}
          >
            + Record
          </button>
        }
      >
        {deposits.length ? (
          <dl>
            {deposits.map((deposit) => (
              <KeyValue key={deposit.id} label={titleCase(deposit.depositType)}>
                <LinkButton onClick={() => fc.open("deposit-detail", { depositId: deposit.id })}>
                  {formatCurrency(deposit.amount)}
                </LinkButton>
              </KeyValue>
            ))}
          </dl>
        ) : (
          <p className="py-3 text-sm text-[var(--cc-muted-text)]">No deposit recorded.</p>
        )}
      </DetailSection>

      <Button
        variant="ghost"
        className={active ? "min-h-11 w-full text-red-600 hover:bg-red-50 hover:text-red-700" : "min-h-11 w-full"}
        onClick={() => (active ? setConfirmStatus(true) : setStatus.mutate("ACTIVE"))}
      >
        {active ? "Deactivate tenant" : "Reactivate tenant"}
      </Button>
      <ConfirmDialog
        open={confirmStatus}
        onOpenChange={setConfirmStatus}
        title={`Deactivate ${tenantDisplayName(tenant)}?`}
        description="They will no longer be offered for new leases. Existing records stay intact and you can reactivate later."
        confirmLabel="Deactivate"
        destructive
        pending={setStatus.isPending}
        onConfirm={() => setStatus.mutate("INACTIVE", { onSuccess: () => setConfirmStatus(false) })}
      />
    </AppSheet>
  );
}

export function TenantFormSheet({ tenantId }) {
  const fc = useFc();
  const existing = tenantId ? fc.tenants.data?.find((tenant) => tenant.id === tenantId) : null;
  const { values, bind } = useFormState({
    businessName: existing?.businessName ?? "",
    name: existing?.name ?? "",
    contactPhone: existing?.contactPhone ?? "",
    contactEmail: existing?.contactEmail ?? "",
    notes: existing?.notes ?? "",
  });
  const [errors, setErrors] = useState({});
  const save = useFcMutation(
    (payload) => (existing ? api.updateTenant(fc.foodCourtId, tenantId, payload) : api.createTenant(fc.foodCourtId, payload)),
    { success: existing ? "Tenant updated" : "Tenant added", failure: "Unable to save this tenant" },
  );

  const submit = () => {
    const next = {};
    if (!values.name.trim() && !values.businessName.trim()) next.name = "Enter a contact person or business name";
    if (values.contactEmail && !/^\S+@\S+\.\S+$/.test(values.contactEmail)) next.contactEmail = "Enter a valid email";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      {
        name: (values.name || values.businessName).trim(),
        businessName: emptyToNull(values.businessName.trim()),
        contactPhone: emptyToNull(values.contactPhone.trim()),
        contactEmail: emptyToNull(values.contactEmail.trim()),
        userId: existing?.userId ?? null,
        status: existing?.status ?? "ACTIVE",
        notes: emptyToNull(values.notes.trim()),
      },
      { onSuccess: fc.close },
    );
  };

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={existing ? "Edit tenant" : "Add tenant"}
      onSubmit={submit}
      saving={save.isPending}
      submitLabel={existing ? "Save changes" : "Add tenant"}
    >
      <TextField label="Business name" placeholder="e.g. Salado" {...bind("businessName")} />
      <TextField label="Contact person" error={errors.name} {...bind("name")} />
      <TextField label="Phone" type="tel" inputMode="tel" {...bind("contactPhone")} />
      <TextField label="Email" type="email" inputMode="email" error={errors.contactEmail} {...bind("contactEmail")} />
      <TextAreaField label="Notes" {...bind("notes")} />
    </FormSheet>
  );
}

// ───────────────────────── Lease ─────────────────────────

export function LeaseDetailSheet({ leaseId }) {
  const fc = useFc();
  const lease = fc.leases.data?.find((item) => item.id === leaseId);
  if (!lease) return null;
  const tenant = fc.tenants.data?.find((item) => item.id === lease.tenantId);
  const stall = fc.stalls.data?.find((item) => item.id === lease.stallId);
  const history = (fc.allRents.data || []).filter((item) => item.stallLeaseId === leaseId).slice(0, 6);
  const live = lease.status === "ACTIVE" || lease.status === "PENDING";

  return (
    <AppSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={`${tenant ? tenantDisplayName(tenant) : lease.tenantName} · Unit ${lease.stallCode}`}
      description="Lease agreement"
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => fc.open("lease-form", { leaseId })}>
            Edit Lease
          </Button>
          <Button
            variant="outline"
            className="min-h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
            disabled={!live}
            onClick={() => fc.open("lease-terminate", { leaseId })}
          >
            Terminate Lease
          </Button>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2 rounded-[16px] border border-[var(--cc-border)] bg-white p-4">
        <div>
          <p className="text-xs text-[var(--cc-muted-text)]">Monthly rent</p>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(lease.monthlyRent)}</p>
        </div>
        <StatusPill tone={isActiveLease(lease) ? "success" : lease.status === "PENDING" ? "info" : "muted"}>
          {titleCase(lease.status)}
        </StatusPill>
      </div>
      <DetailSection title="Agreement">
        <dl>
          <KeyValue label="Tenant">
            {tenant ? <LinkButton onClick={() => fc.open("tenant-detail", { tenantId: tenant.id })}>{tenantDisplayName(tenant)}</LinkButton> : lease.tenantName}
          </KeyValue>
          <KeyValue label="Stall">
            {stall ? <LinkButton onClick={() => fc.open("stall-detail", { stallId: stall.id })}>Unit {stall.code}</LinkButton> : `Unit ${lease.stallCode}`}
          </KeyValue>
          <KeyValue label="Start">{formatDate(lease.startDate)}</KeyValue>
          <KeyValue label="End">{lease.endDate ? formatDate(lease.endDate) : "Ongoing"}</KeyValue>
          <KeyValue label="Rent due day">{lease.rentDueDay ? `Day ${lease.rentDueDay}` : "—"}</KeyValue>
          <KeyValue label="Security deposit">{lease.depositAmount == null ? "—" : formatCurrency(lease.depositAmount)}</KeyValue>
          <KeyValue label="Payment method">{lease.paymentMethod ? paymentMethodLabel(lease.paymentMethod) : "—"}</KeyValue>
          {lease.notes && <KeyValue label="Notes">{lease.notes}</KeyValue>}
        </dl>
      </DetailSection>
      <DetailSection title="Rent history">
        <InvoiceRows invoices={history} />
      </DetailSection>
    </AppSheet>
  );
}

export function LeaseFormSheet({ leaseId, stallId, tenantId, replaceLeaseId }) {
  const fc = useFc();
  const existing = leaseId ? fc.leases.data?.find((lease) => lease.id === leaseId) : null;
  const replaced = replaceLeaseId ? fc.leases.data?.find((lease) => lease.id === replaceLeaseId) : null;
  const { values, bind, set } = useFormState({
    stallId: existing?.stallId ?? stallId ?? "",
    tenantId: existing?.tenantId ?? tenantId ?? "",
    startDate: existing?.startDate ?? todayISO(),
    endDate: existing?.endDate ?? "",
    monthlyRent: existing?.monthlyRent ?? "",
    depositAmount: existing?.depositAmount ?? "",
    rentDueDay: existing?.rentDueDay ?? 5,
    paymentMethod: existing?.paymentMethod ?? "",
    status: existing?.status ?? "ACTIVE",
    notes: existing?.notes ?? "",
  });
  const [errors, setErrors] = useState({});

  const stallOptions = (fc.stalls.data || [])
    .filter((stall) => existing || stall.id === stallId || !stall.occupied || stall.id === replaced?.stallId)
    .map((stall) => ({ value: stall.id, label: `Unit ${stall.code}${stall.name ? ` · ${stall.name}` : ""}` }));
  const tenantOptions = (fc.tenants.data || [])
    .filter((tenant) => tenant.status === "ACTIVE" || tenant.id === existing?.tenantId)
    .filter((tenant) => !replaced || tenant.id !== replaced.tenantId)
    .map((tenant) => ({ value: tenant.id, label: tenantDisplayName(tenant) }));

  const save = useFcMutation(
    async (payload) => {
      if (existing) return api.updateLease(fc.foodCourtId, leaseId, payload);
      if (replaced) await api.terminateLease(fc.foodCourtId, replaced.id, addDaysISO(payload.startDate, -1));
      return api.createLease(fc.foodCourtId, payload);
    },
    {
      success: existing ? "Lease updated" : replaced ? "Tenant changed" : "Tenant assigned",
      failure: "Unable to save this lease",
    },
  );

  const submit = () => {
    const next = {};
    if (!values.stallId) next.stallId = "Choose a stall";
    if (!values.tenantId) next.tenantId = "Choose a tenant";
    if (!values.startDate) next.startDate = "Start date is required";
    if (!(num(values.monthlyRent) > 0)) next.monthlyRent = "Enter a rent above ₹0";
    if (values.endDate && values.startDate && values.endDate < values.startDate) next.endDate = "End must be after start";
    const day = Number(values.rentDueDay);
    if (values.rentDueDay !== "" && !(day >= 1 && day <= 28)) next.rentDueDay = "Use a day between 1 and 28";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      {
        stallId: values.stallId,
        tenantId: values.tenantId,
        startDate: values.startDate,
        endDate: emptyToNull(values.endDate),
        monthlyRent: Number(values.monthlyRent),
        depositAmount: emptyToNull(values.depositAmount),
        rentDueDay: values.rentDueDay === "" ? null : day,
        paymentMethod: emptyToNull(values.paymentMethod),
        status: values.status,
        notes: emptyToNull(values.notes.trim()),
      },
      { onSuccess: fc.close },
    );
  };

  const title = existing ? "Edit lease" : replaced ? "Change tenant" : "Assign tenant";
  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={title}
      description={replaced ? `Ends ${replaced.tenantName}'s lease the day before the new one starts` : undefined}
      onSubmit={submit}
      saving={save.isPending}
      submitLabel={existing ? "Save changes" : "Create lease"}
    >
      <SelectField label="Stall" required error={errors.stallId} value={values.stallId} onChange={set("stallId")} options={stallOptions} placeholder="Choose stall" disabled={Boolean(existing || stallId)} />
      <SelectField label="Tenant" required error={errors.tenantId} value={values.tenantId} onChange={set("tenantId")} options={tenantOptions} placeholder="Choose tenant" disabled={Boolean(existing)} />
      <div className="grid grid-cols-2 gap-3">
        <DateField label="Start date" required error={errors.startDate} {...bind("startDate")} />
        <DateField label="End date" error={errors.endDate} {...bind("endDate")} />
      </div>
      <MoneyField label="Monthly rent (₹)" required error={errors.monthlyRent} {...bind("monthlyRent")} />
      <div className="grid grid-cols-2 gap-3">
        <MoneyField label="Security deposit (₹)" {...bind("depositAmount")} />
        <TextField label="Rent due day" type="number" inputMode="numeric" min="1" max="28" error={errors.rentDueDay} {...bind("rentDueDay")} />
      </div>
      <SelectField label="Payment method" value={values.paymentMethod} onChange={set("paymentMethod")} options={PAYMENT_METHOD_OPTIONS} placeholder="Optional" />
      {existing && (
        <SelectField
          label="Status"
          value={values.status}
          onChange={set("status")}
          options={["PENDING", "ACTIVE", "ENDED", "TERMINATED"].map((value) => ({ value, label: titleCase(value) }))}
        />
      )}
      <TextAreaField label="Notes" {...bind("notes")} />
    </FormSheet>
  );
}

export function LeaseTerminateSheet({ leaseId }) {
  const fc = useFc();
  const lease = fc.leases.data?.find((item) => item.id === leaseId);
  const [endDate, setEndDate] = useState(todayISO());
  const [confirm, setConfirm] = useState(false);
  const terminate = useFcMutation(() => api.terminateLease(fc.foodCourtId, leaseId, endDate), {
    success: "Lease terminated",
    failure: "Unable to terminate this lease",
  });
  if (!lease) return null;
  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title="Terminate lease"
      description={`${lease.tenantName} · Unit ${lease.stallCode}`}
      onSubmit={() => setConfirm(true)}
      saving={terminate.isPending}
      submitLabel="Terminate…"
    >
      <p className="text-sm text-[var(--cc-secondary-text)]">
        The stall becomes vacant after the end date. Rent already billed is kept.
      </p>
      <DateField label="Last day of lease" value={endDate} min={lease.startDate} onChange={(event) => setEndDate(event.target.value)} />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Terminate this lease?"
        description={`${lease.tenantName} will vacate Unit ${lease.stallCode} on ${formatDate(endDate)}.`}
        confirmLabel="Terminate lease"
        destructive
        pending={terminate.isPending}
        onConfirm={() =>
          terminate.mutate(undefined, {
            onSuccess: () => {
              setConfirm(false);
              fc.closeAll();
            },
          })
        }
      />
    </FormSheet>
  );
}


