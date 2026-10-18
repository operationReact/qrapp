import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2, CreditCard, KeyRound, Loader2, MessageSquare, Plus, RotateCcw, Search, ShieldOff, ShieldCheck, Undo2, UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import {
  PAYMENT_METHODS, addAdminVendorBillComment, approveVendorBill, listAdminVendorBills, listVendorAccounts,
  onboardVendorAccount, recordVendorBillPayment, requestVendorBillCorrection, resetVendorAccountPassword,
  setVendorAccountActive, vendorErrorMessage,
} from "@/services/vendor-bill-service";
import { lookupVendorPhone } from "@/services/vendor-service";
import {
  VENDOR_BILL_EVENT_LABELS, VENDOR_BILL_STATUS, formatDateTime, formatInr,
} from "@/lib/vendorBills";

export const Route = createFileRoute("/admin/vendor-bills")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/vendors", search: { tab: "bills" } });
  },
});

const STATUS_FILTERS = ["ALL", "SUBMITTED", "CORRECTION_REQUESTED", "APPROVED", "PAID", "DRAFT"];

export function VendorBillsPanel({ tab }) {
  const { activeLocationId, isAllLocations } = useActiveLocation();

  if (!activeLocationId || isAllLocations) {
    return (
      <Card className="grid min-h-60 place-items-center rounded-[16px] border-[var(--cc-border)] bg-white">
        <p className="text-sm text-[var(--cc-muted-text)]">Select a single location to manage its vendor bills.</p>
      </Card>
    );
  }
  return tab === "logins" ? <LoginsPanel locationId={activeLocationId} /> : <BillsPanel locationId={activeLocationId} />;
}

function BillsPanel({ locationId }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("ALL");
  const [selectedId, setSelectedId] = useState(null);
  const billsQuery = useQuery({
    queryKey: ["admin-vendor-bills", locationId],
    queryFn: () => listAdminVendorBills(locationId),
  });
  const bills = useMemo(() => billsQuery.data || [], [billsQuery.data]);
  const visible = useMemo(() => bills.filter((bill) => status === "ALL" || bill.status === status), [bills, status]);
  const selected = bills.find((bill) => bill.id === selectedId) || visible[0] || null;

  const totals = useMemo(() => ({
    awaiting: bills.filter((bill) => bill.status === "SUBMITTED").length,
    unpaid: bills.filter((bill) => bill.status === "APPROVED").reduce((sum, bill) => sum + Number(bill.totalAmount || 0), 0),
    paid: bills.filter((bill) => bill.status === "PAID").reduce((sum, bill) => sum + Number(bill.paidAmount || 0), 0),
  }), [bills]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-vendor-bills", locationId] });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Awaiting review" value={String(totals.awaiting)} tone="amber" />
        <SummaryCard label="Approved, unpaid" value={formatInr(totals.unpaid)} tone="sky" />
        <SummaryCard label="Total paid" value={formatInr(totals.paid)} tone="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(17rem,.8fr)_minmax(0,1.7fr)]">
        <Card className="h-fit rounded-[16px] border-[var(--cc-border)] bg-white">
          <CardHeader className="space-y-3 border-b border-[var(--cc-divider)] pb-4">
            <CardTitle className="text-[15px]">Bills <span className="text-xs font-normal text-[var(--cc-muted-text)]">({visible.length})</span></CardTitle>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 w-full rounded-[10px] border-[var(--cc-border)]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((value) => (
                  <SelectItem key={value} value={value}>{value === "ALL" ? "All statuses" : VENDOR_BILL_STATUS[value]?.label || value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="max-h-[36rem] space-y-2 overflow-y-auto p-3">
            {billsQuery.isLoading && <Loading />}
            {!billsQuery.isLoading && visible.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No bills found.</p>}
            {visible.map((bill) => {
              const badge = VENDOR_BILL_STATUS[bill.status] || VENDOR_BILL_STATUS.DRAFT;
              const active = selected?.id === bill.id;
              return (
                <button
                  type="button"
                  key={bill.id}
                  onClick={() => setSelectedId(bill.id)}
                  className={`w-full rounded-[14px] border p-3.5 text-left transition ${active ? "border-[var(--cc-primary)] bg-[var(--cc-primary-light)]" : "border-[var(--cc-border)] hover:bg-[var(--cc-page)]"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{bill.vendorName}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>{badge.label}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-[var(--cc-secondary-text)]">
                    <span>{bill.billNumber} · {bill.invoiceNumber || "No invoice no."}</span>
                    <span className="font-semibold text-[var(--cc-text)]">{formatInr(bill.totalAmount)}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {selected ? (
          <AdminBillDetail key={`${selected.id}-${selected.updatedAt}`} bill={selected} locationId={locationId} onChanged={refresh} />
        ) : (
          <Card className="grid min-h-80 place-items-center rounded-[16px] border-[var(--cc-border)] bg-white">
            <p className="text-sm text-[var(--cc-muted-text)]">Select a bill to review it.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function AdminBillDetail({ bill, locationId, onChanged }) {
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentReference, setPaymentReference] = useState("");
  const badge = VENDOR_BILL_STATUS[bill.status] || VENDOR_BILL_STATUS.DRAFT;

  const run = (fn, success) => ({
    mutationFn: fn,
    onSuccess: () => { onChanged(); setNote(""); toast.success(success); },
    onError: (error) => toast.error(vendorErrorMessage(error)),
  });

  const approveMutation = useMutation(run(() => approveVendorBill(locationId, bill.id, note.trim() || null), "Bill approved"));
  const correctionMutation = useMutation(run(() => requestVendorBillCorrection(locationId, bill.id, note.trim()), "Correction requested"));
  const paymentMutation = useMutation(run(
    () => recordVendorBillPayment(locationId, bill.id, paymentMethod, paymentReference.trim() || null),
    "Payment recorded",
  ));
  const commentMutation = useMutation(run(() => addAdminVendorBillComment(locationId, bill.id, note.trim()), "Comment added"));
  const busy = approveMutation.isPending || correctionMutation.isPending || paymentMutation.isPending || commentMutation.isPending;

  return (
    <div className="space-y-5">
      <Card className="rounded-[16px] border-[var(--cc-border)] bg-white">
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-muted-text)]">{bill.billNumber}</p>
            <h2 className="text-xl font-bold">{bill.vendorName}</h2>
            <p className="mt-1 text-sm text-[var(--cc-secondary-text)]">
              Invoice {bill.invoiceNumber || "—"} · dated {bill.invoiceDate || "—"} · submitted {formatDateTime(bill.submittedAt)}
            </p>
            {bill.notes && <p className="mt-3 whitespace-pre-wrap rounded-[10px] bg-[var(--cc-page)] p-3 text-sm">{bill.notes}</p>}
          </div>
          <div className="text-right">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
            <p className="mt-2 text-2xl font-bold">{formatInr(bill.totalAmount)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[16px] border-[var(--cc-border)] bg-white">
        <CardHeader className="pb-3"><CardTitle className="text-[15px]">Line items</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-5 pt-0">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--cc-muted-text)]">
              <tr><th className="py-2 font-semibold">Item</th><th className="py-2 font-semibold">Qty</th><th className="py-2 font-semibold">Price</th><th className="py-2 text-right font-semibold">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--cc-divider)]">
              {bill.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5">{item.description}</td>
                  <td className="py-2.5">{item.quantity} {item.unit}</td>
                  <td className="py-2.5">{formatInr(item.unitPrice)}</td>
                  <td className="py-2.5 text-right font-semibold">{formatInr(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="rounded-[16px] border-[var(--cc-border)] bg-white">
        <CardHeader className="pb-3"><CardTitle className="text-[15px]">Actions</CardTitle></CardHeader>
        <CardContent className="space-y-4 p-5 pt-0">
          <div className="space-y-1.5">
            <Label htmlFor="admin-note">Message to vendor</Label>
            <Textarea id="admin-note" rows={2} className="rounded-[10px]" placeholder="Required when requesting a correction. Optional when approving." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {bill.status === "SUBMITTED" && (
              <>
                <Button disabled={busy} onClick={() => approveMutation.mutate()} className="h-10 rounded-[10px] bg-emerald-600 text-white hover:bg-emerald-700">
                  <CheckCircle2 className="size-4" /> Approve bill
                </Button>
                <Button variant="outline" disabled={busy || !note.trim()} onClick={() => correctionMutation.mutate()} className="h-10 rounded-[10px]">
                  <Undo2 className="size-4" /> Request correction
                </Button>
              </>
            )}
            <Button variant="outline" disabled={busy || !note.trim()} onClick={() => commentMutation.mutate()} className="h-10 rounded-[10px]">
              <MessageSquare className="size-4" /> Add comment
            </Button>
          </div>

          {bill.status === "APPROVED" && (
            <div className="grid gap-3 rounded-[14px] border border-sky-200 bg-sky-50 p-4 md:grid-cols-[200px_minmax(0,1fr)_auto] md:items-end">
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-11 w-full rounded-[10px] bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => <SelectItem key={method} value={method}>{method.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-ref">Reference (UTR / cheque no.)</Label>
                <Input id="payment-ref" className="h-11 rounded-[10px] bg-white" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
              </div>
              <Button disabled={busy} onClick={() => paymentMutation.mutate()} className="h-11 rounded-[10px] bg-[var(--cc-primary)] text-white hover:bg-[var(--cc-primary-dark)]">
                <CreditCard className="size-4" /> Pay {formatInr(bill.totalAmount)}
              </Button>
            </div>
          )}

          {bill.status === "PAID" && (
            <p className="rounded-[12px] bg-emerald-50 p-3 text-sm text-emerald-900">
              Paid {formatInr(bill.paidAmount)} via {bill.paymentMethod?.replace("_", " ")} · ref {bill.paymentReference || "—"} · {formatDateTime(bill.paidAt)} by {bill.paidBy}
            </p>
          )}
          {bill.status === "CORRECTION_REQUESTED" && <p className="text-sm text-[var(--cc-secondary-text)]">Waiting for the vendor to correct and resubmit.</p>}
        </CardContent>
      </Card>

      <Card className="rounded-[16px] border-[var(--cc-border)] bg-white">
        <CardHeader className="pb-3"><CardTitle className="text-[15px]">Activity</CardTitle></CardHeader>
        <CardContent className="p-5 pt-0">
          {bill.events.length === 0 ? <p className="text-sm text-[var(--cc-muted-text)]">No activity yet.</p> : (
            <ol className="space-y-4">
              {bill.events.map((event) => (
                <li key={event.id} className="relative pl-5">
                  <span className="absolute left-0 top-1.5 size-2.5 rounded-full bg-[var(--cc-primary)]" />
                  <p className="text-sm font-semibold">{VENDOR_BILL_EVENT_LABELS[event.eventType] || event.eventType}</p>
                  <p className="text-xs text-[var(--cc-muted-text)]">{event.actorName || event.actorRole} · {formatDateTime(event.createdAt)}</p>
                  {event.message && <p className="mt-1 whitespace-pre-wrap rounded-[10px] bg-[var(--cc-page)] p-2.5 text-sm">{event.message}</p>}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoginsPanel({ locationId }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [resetId, setResetId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const accountsQuery = useQuery({
    queryKey: ["vendor-accounts", locationId],
    queryFn: () => listVendorAccounts(locationId),
  });
  const accounts = (accountsQuery.data || []).filter((account) =>
    `${account.name} ${account.phone}`.toLowerCase().includes(query.toLowerCase()));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vendor-accounts", locationId] });

  const statusMutation = useMutation({
    mutationFn: ({ userId, active }) => setVendorAccountActive(locationId, userId, active),
    onSuccess: (_, { active }) => { refresh(); toast.success(active ? "Vendor login enabled" : "Vendor login disabled"); },
    onError: (error) => toast.error(vendorErrorMessage(error)),
  });
  const resetMutation = useMutation({
    mutationFn: (userId) => resetVendorAccountPassword(locationId, userId, newPassword),
    onSuccess: () => { setResetId(null); setNewPassword(""); toast.success("Password updated"); },
    onError: (error) => toast.error(vendorErrorMessage(error)),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
      <Card className="rounded-[16px] border-[var(--cc-border)] bg-white">
        <CardHeader className="space-y-3 border-b border-[var(--cc-divider)] pb-4">
          <CardTitle className="text-[15px]">Vendor logins <span className="text-xs font-normal text-[var(--cc-muted-text)]">({accounts.length})</span></CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cc-muted-text)]" />
            <Input className="h-11 rounded-[10px] border-[var(--cc-border)] pl-9" placeholder="Search name or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {accountsQuery.isLoading && <Loading />}
          {!accountsQuery.isLoading && accounts.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No vendor logins for this location yet.</p>}
          {accounts.map((account) => (
            <div key={account.userId} className="rounded-[14px] border border-[var(--cc-border)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-[var(--cc-primary-light)] text-[var(--cc-primary)]"><UserRound className="size-5" /></span>
                  <div>
                    <p className="text-sm font-semibold">{account.name}</p>
                    <p className="text-xs text-[var(--cc-secondary-text)]">{account.phone}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`self-center rounded-full px-2.5 py-1 text-xs font-semibold ${account.active ? "bg-[var(--cc-success-bg)] text-[var(--cc-success)]" : "bg-[#F3F1EF] text-[var(--cc-muted-text)]"}`}>
                    {account.active ? "Active" : "Disabled"}
                  </span>
                  <Button variant="outline" size="sm" className="h-9 rounded-[10px]" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ userId: account.userId, active: !account.active })}>
                    {account.active ? <><ShieldOff className="size-4" /> Disable</> : <><ShieldCheck className="size-4" /> Enable</>}
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 rounded-[10px]" onClick={() => { setResetId(resetId === account.userId ? null : account.userId); setNewPassword(""); }}>
                    <KeyRound className="size-4" /> Reset password
                  </Button>
                </div>
              </div>
              {resetId === account.userId && (
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--cc-divider)] pt-3">
                  <div className="min-w-[14rem] flex-1 space-y-1.5">
                    <Label htmlFor={`pw-${account.userId}`}>New password</Label>
                    <Input id={`pw-${account.userId}`} type="password" className="h-10 rounded-[10px]" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                  <Button className="h-10 rounded-[10px]" disabled={!newPassword || resetMutation.isPending} onClick={() => resetMutation.mutate(account.userId)}>
                    <RotateCcw className="size-4" /> Save password
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <OnboardVendorCard locationId={locationId} onCreated={refresh} />
    </div>
  );
}

function OnboardVendorCard({ locationId, onCreated }) {
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [lookup, setLookup] = useState(null);
  const lookupMutation = useMutation({
    mutationFn: () => lookupVendorPhone(locationId, form.phone.trim()),
    onSuccess: (result) => setLookup(result),
    onError: () => setLookup(null),
  });
  const phoneBlocked = Boolean(lookup?.loginBlocked || lookup?.loginHasVendorAccessHere);
  const existingLogin = Boolean(lookup?.loginExists) && !phoneBlocked;
  const createMutation = useMutation({
    mutationFn: () => onboardVendorAccount(locationId, { ...form, name: form.name.trim(), phone: form.phone.trim() }),
    onSuccess: () => {
      setForm({ name: "", phone: "", password: "" });
      setLookup(null);
      onCreated();
      toast.success(existingLogin ? "Vendor access added for this location" : "Vendor login created");
    },
    onError: (error) => toast.error(vendorErrorMessage(error, "Unable to create vendor login")),
  });
  const valid = form.phone.trim() && !phoneBlocked && (existingLogin || (form.name.trim() && form.password.length >= 6));

  return (
    <Card className="h-fit rounded-[16px] border-[var(--cc-border)] bg-white">
      <CardHeader className="border-b border-[var(--cc-divider)] pb-4">
        <CardTitle className="flex items-center gap-2 text-[15px]"><Plus className="size-4" /> Onboard a vendor</CardTitle>
        <p className="text-xs text-[var(--cc-secondary-text)]">The vendor can sign in and manage bills for this location only.</p>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="vendor-phone">Login phone (10-digit mobile)</Label>
          <Input
            id="vendor-phone"
            inputMode="tel"
            className="h-11 rounded-[10px]"
            value={form.phone}
            onChange={(e) => { setForm({ ...form, phone: e.target.value }); setLookup(null); }}
            onBlur={() => { if (form.phone.trim().length >= 10) lookupMutation.mutate(); }}
          />
        </div>
        {lookup?.loginBlocked && <Notice tone="rose">This number belongs to a staff account, so it can't be used as a vendor login.</Notice>}
        {lookup?.loginHasVendorAccessHere && <Notice tone="amber">This vendor already has a login for this location.</Notice>}
        {existingLogin && (
          <Notice tone="sky">
            Already on Broand Bro as <b>{lookup.loginName}</b>. Their existing password will be used. Give them access to this location below.
          </Notice>
        )}
        {!existingLogin && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-name">Vendor / company name</Label>
              <Input id="vendor-name" className="h-11 rounded-[10px]" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-password">Temporary password (min 6 characters)</Label>
              <Input id="vendor-password" type="password" className="h-11 rounded-[10px]" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </>
        )}
        <Button className="h-11 w-full rounded-[10px] bg-[var(--cc-primary)] text-white hover:bg-[var(--cc-primary-dark)]" disabled={!valid || createMutation.isPending} onClick={() => createMutation.mutate()}>
          {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {existingLogin ? "Give vendor access here" : "Create vendor login"}
        </Button>
      </CardContent>
    </Card>
  );
}

const NOTICE_TONES = {
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  sky: "border-sky-200 bg-sky-50 text-sky-800",
};

function Notice({ tone, children }) {
  return <div className={`rounded-[10px] border p-3 text-xs leading-5 ${NOTICE_TONES[tone]}`}>{children}</div>;
}

function SummaryCard({ label, value, tone }) {
  const tones = {
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    sky: "bg-sky-50 text-sky-800 border-sky-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
  };
  return (
    <div className={`rounded-[14px] border p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function Loading() {
  return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-[var(--cc-muted-text)]" /></div>;
}
