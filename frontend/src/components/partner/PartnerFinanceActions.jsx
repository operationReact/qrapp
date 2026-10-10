import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Ban, Download, FilePlus2, HandCoins, Loader2, RefreshCw, Scale, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ADJUSTMENT_TYPES,
  adjustmentMeta,
  businessToday,
  canManageFinance,
  financeErrorMessage,
  formatDate,
  formatInr,
  formatPeriod,
  parseAmountInput,
  recentPeriods,
  settlementActions,
  statementFilename,
} from "@/lib/partnerFinance";
import { PARTNER_FINANCE_KEY } from "@/query/options/partner-finance";
import {
  addPartnerSettlementAdjustment,
  approvePartnerSettlement,
  downloadPartnerSettlementStatement,
  generatePartnerSettlement,
  markPartnerSettlementPaid,
  recalculatePartnerSettlement,
  voidPartnerSettlement,
} from "@/services/partner-portal-service";
import { FinanceFilterDropdown, PeriodDropdown } from "@/components/partner/PartnerFinanceComponents";

export function useFinanceAdmin() {
  const { user } = useAuth();
  return canManageFinance(user);
}

function useFinanceMutation(mutationFn, { success, onDone }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (data?.settlement?.id) queryClient.setQueryData([...PARTNER_FINANCE_KEY, "settlement", String(data.settlement.id)], data);
      queryClient.invalidateQueries({ queryKey: PARTNER_FINANCE_KEY });
      toast.success(success);
      onDone?.(data);
    },
  });
}

function DialogError({ error }) {
  if (!error) return null;
  return <p className="partner-fin-form-error" role="alert">{financeErrorMessage(error)}</p>;
}

function FormDialog({ title, description, onClose, pending, children, onSubmit, submitLabel, canSubmit = true, destructive = false, error }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent className="partner-fin-dialog max-h-[90dvh] overflow-y-auto">
        <form className="partner-fin-form" onSubmit={(event) => { event.preventDefault(); if (canSubmit && !pending) onSubmit(); }}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
          <DialogError error={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={!canSubmit || pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}{submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({ title, description, confirmLabel, onClose, mutation, onConfirm }) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose(); }}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <DialogError error={mutation.error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}{confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Field({ id, label, hint, children }) {
  return <div className="partner-fin-field"><Label htmlFor={id}>{label}</Label>{children}{hint && <p>{hint}</p>}</div>;
}

export function GenerateSettlementDialog({ defaultPeriod, onClose }) {
  const navigate = useNavigate();
  const periods = recentPeriods(12);
  const [period, setPeriod] = useState(periods.includes(defaultPeriod) ? defaultPeriod : periods[1] || periods[0]);
  const [calculate, setCalculate] = useState(true);
  const mutation = useFinanceMutation((body) => generatePartnerSettlement(body), {
    success: "Settlement generated",
    onDone: (data) => {
      onClose();
      if (data?.settlement?.id) navigate({ to: "/partner/finance/settlements/$settlementId", params: { settlementId: String(data.settlement.id) } });
    },
  });
  return (
    <FormDialog
      title="Generate settlement"
      description="Create the monthly settlement for one period. Only one open settlement can exist per period."
      onClose={onClose}
      pending={mutation.isPending}
      error={mutation.error}
      submitLabel={calculate ? "Generate & calculate" : "Generate draft"}
      onSubmit={() => mutation.mutate({ period, calculate })}
    >
      <Field label="Settlement period"><PeriodDropdown periods={periods} value={period} onChange={setPeriod} label="Settlement period" /></Field>
      <div className="partner-fin-check">
        <Checkbox id="fin-generate-calculate" checked={calculate} onCheckedChange={(checked) => setCalculate(Boolean(checked))} />
        <Label htmlFor="fin-generate-calculate">Calculate immediately</Label>
      </div>
      <p className="partner-fin-muted">Selected: {formatPeriod(period)}. Calculation uses the commission agreement in effect for that period; tax and TDS are not computed.</p>
    </FormDialog>
  );
}

function AdjustmentDialog({ settlement, onClose }) {
  const [type, setType] = useState(ADJUSTMENT_TYPES[0].value);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const parsed = parseAmountInput(amount);
  const trimmedReason = reason.trim();
  const mutation = useFinanceMutation((body) => addPartnerSettlementAdjustment(settlement.id, body), { success: "Adjustment added", onDone: onClose });
  const meta = adjustmentMeta(type);
  return (
    <FormDialog
      title="Add adjustment"
      description={`Adjust the net payable for ${formatPeriod(settlement.period)}. Adjustments are permanent and appear in the audit trail.`}
      onClose={onClose}
      pending={mutation.isPending}
      error={mutation.error}
      submitLabel="Add adjustment"
      canSubmit={Boolean(parsed) && trimmedReason.length >= 3}
      onSubmit={() => mutation.mutate({ type, amount: parsed, reason: trimmedReason })}
    >
      <Field label="Type" hint={meta.effect}>
        <FinanceFilterDropdown icon={Scale} label="Adjustment type" value={type} options={ADJUSTMENT_TYPES.map((item) => [item.value, item.label])} onChange={setType} />
      </Field>
      <Field id="fin-adjust-amount" label="Amount (INR)" hint="Enter a positive amount with up to 2 decimals.">
        <Input id="fin-adjust-amount" inputMode="decimal" autoComplete="off" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} aria-invalid={Boolean(amount) && !parsed} />
      </Field>
      <Field id="fin-adjust-reason" label="Reason" hint={`${trimmedReason.length}/500 · minimum 3 characters`}>
        <Textarea id="fin-adjust-reason" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
      </Field>
    </FormDialog>
  );
}

function MarkPaidDialog({ settlement, onClose }) {
  const today = businessToday();
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [note, setNote] = useState("");
  const mutation = useFinanceMutation((body) => markPartnerSettlementPaid(settlement.id, body), { success: "Settlement marked as paid", onDone: onClose });
  const trimmedReference = reference.trim();
  return (
    <FormDialog
      title="Mark as paid"
      description={`Record the payment of ${formatInr(settlement.netPayable)} for ${formatPeriod(settlement.period)}. This cannot be undone.`}
      onClose={onClose}
      pending={mutation.isPending}
      error={mutation.error}
      submitLabel="Confirm payment"
      canSubmit={Boolean(trimmedReference) && Boolean(paidOn)}
      onSubmit={() => mutation.mutate({ paymentReference: trimmedReference, paidOn, note: note.trim() || undefined })}
    >
      <Field id="fin-paid-reference" label="Payment reference">
        <Input id="fin-paid-reference" maxLength={100} autoComplete="off" placeholder="UTR / transaction ID" value={reference} onChange={(event) => setReference(event.target.value)} />
      </Field>
      <Field id="fin-paid-on" label="Paid on" hint={`Must be on or after the period end (${formatDate(settlement.periodEnd)}) and not in the future.`}>
        <Input id="fin-paid-on" type="date" min={settlement.periodEnd} max={today} value={paidOn} onChange={(event) => setPaidOn(event.target.value)} />
      </Field>
      <Field id="fin-paid-note" label="Note (optional)">
        <Textarea id="fin-paid-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
    </FormDialog>
  );
}

function VoidDialog({ settlement, onClose }) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const mutation = useFinanceMutation((body) => voidPartnerSettlement(settlement.id, body), { success: "Settlement voided", onDone: onClose });
  return (
    <FormDialog
      title="Void settlement"
      description={`Voiding the ${formatPeriod(settlement.period)} settlement is permanent. A new settlement can be generated for the period afterwards.`}
      onClose={onClose}
      pending={mutation.isPending}
      error={mutation.error}
      submitLabel="Void settlement"
      destructive
      canSubmit={trimmed.length >= 3}
      onSubmit={() => mutation.mutate({ reason: trimmed })}
    >
      <Field id="fin-void-reason" label="Reason" hint={`${trimmed.length}/500 · minimum 3 characters`}>
        <Textarea id="fin-void-reason" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
      </Field>
    </FormDialog>
  );
}

function ApproveDialog({ settlement, onClose }) {
  const mutation = useFinanceMutation(() => approvePartnerSettlement(settlement.id), { success: "Settlement approved", onDone: onClose });
  return (
    <ConfirmDialog
      title="Approve settlement?"
      description={`Approving locks the ${formatPeriod(settlement.period)} figures with a net payable of ${formatInr(settlement.netPayable)}. Adjustments and recalculation are no longer possible afterwards.`}
      confirmLabel="Approve"
      onClose={onClose}
      mutation={mutation}
      onConfirm={() => mutation.mutate()}
    />
  );
}

function RecalculateDialog({ settlement, onClose }) {
  const mutation = useFinanceMutation(() => recalculatePartnerSettlement(settlement.id), { success: "Settlement recalculated", onDone: onClose });
  return (
    <ConfirmDialog
      title="Recalculate settlement?"
      description="Line items and totals are rebuilt from the latest order data and the agreement in effect. Existing adjustments are kept."
      confirmLabel="Recalculate"
      onClose={onClose}
      mutation={mutation}
      onConfirm={() => mutation.mutate()}
    />
  );
}

export function GenerateSettlementButton({ defaultPeriod, variant = "default", size = "default" }) {
  const isAdmin = useFinanceAdmin();
  const [open, setOpen] = useState(false);
  if (!isAdmin) return null;
  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}><FilePlus2 className="size-4" />Generate settlement</Button>
      {open && <GenerateSettlementDialog defaultPeriod={defaultPeriod} onClose={() => setOpen(false)} />}
    </>
  );
}

export function StatementButton({ settlement }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const blob = await downloadPartnerSettlementStatement(settlement.id);
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = statementFilename(settlement);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(financeErrorMessage(error, "The statement could not be downloaded."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button type="button" variant="outline" onClick={download} disabled={busy} aria-busy={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}Statement PDF
    </Button>
  );
}

export function SettlementActions({ settlement }) {
  const isAdmin = useFinanceAdmin();
  const [dialog, setDialog] = useState(null);
  const actions = settlementActions(settlement.status);
  const close = () => setDialog(null);
  if (!isAdmin || !Object.values(actions).some(Boolean)) return null;
  return (
    <>
      <div className="partner-fin-actions" role="group" aria-label="Settlement actions">
        {actions.approve && <Button type="button" onClick={() => setDialog("approve")}><BadgeCheck className="size-4" />Approve</Button>}
        {actions.markPaid && <Button type="button" onClick={() => setDialog("paid")}><HandCoins className="size-4" />Mark paid</Button>}
        {actions.recalculate && <Button type="button" variant="outline" onClick={() => setDialog("recalculate")}><RefreshCw className="size-4" />Recalculate</Button>}
        {actions.void && <Button type="button" variant="destructive" onClick={() => setDialog("void")}><Ban className="size-4" />Void</Button>}
      </div>
      {dialog === "approve" && <ApproveDialog settlement={settlement} onClose={close} />}
      {dialog === "paid" && <MarkPaidDialog settlement={settlement} onClose={close} />}
      {dialog === "recalculate" && <RecalculateDialog settlement={settlement} onClose={close} />}
      {dialog === "void" && <VoidDialog settlement={settlement} onClose={close} />}
    </>
  );
}

export function AddAdjustmentButton({ settlement }) {
  const isAdmin = useFinanceAdmin();
  const [open, setOpen] = useState(false);
  if (!isAdmin || !settlementActions(settlement.status).adjust) return null;
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><SlidersHorizontal className="size-4" />Add adjustment</Button>
      {open && <AdjustmentDialog settlement={settlement} onClose={() => setOpen(false)} />}
    </>
  );
}
