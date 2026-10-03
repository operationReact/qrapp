import { useMemo, useState } from "react";
import { Loader2, X, IndianRupee } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCurrency,
  formatDate,
  formatMonthLabel,
  isRentOverdue,
  rentDue,
  rentPaid,
  rentStatus,
} from "../format";
import { PanelError, PanelEmpty, PanelLoading, StatusPill } from "./FeatureStates";

const STATUS_TONES = {
  PAID: "success",
  PARTIAL: "warning",
  UNPAID: "muted",
  OVERDUE: "danger",
};

function rowStatus(rent) {
  if (isRentOverdue(rent)) return "OVERDUE";
  return rentStatus(rent);
}

function rentLabel(rent) {
  return (
    rent.tenantName ||
    rent.tenant?.name ||
    rent.stallCode ||
    rent.stallName ||
    `Tenant ${rent.tenantId ?? rent.id}`
  );
}

export function RentPanel({ query, month, onRecordPayment, isRecording }) {
  const [payingRent, setPayingRent] = useState(null);

  const totals = useMemo(() => {
    const rows = query.data || [];
    const due = rows.reduce((sum, rent) => sum + rentDue(rent), 0);
    const collected = rows.reduce((sum, rent) => sum + rentPaid(rent), 0);
    return {
      due,
      collected,
      outstanding: Math.max(due - collected, 0),
      rate: due > 0 ? (collected / due) * 100 : 0,
    };
  }, [query.data]);

  if (query.isLoading) return <PanelLoading rows={5} />;
  if (query.isError) return <PanelError onRetry={query.refetch} />;

  const rents = query.data || [];
  if (!rents.length) {
    return (
      <PanelEmpty
        icon={IndianRupee}
        title={`No rent records for ${formatMonthLabel(month)}`}
        description="Rent invoices for the selected month will appear here once generated."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryStat label="Billed" value={formatCurrency(totals.due)} />
        <SummaryStat label="Collected" value={formatCurrency(totals.collected)} tone="positive" />
        <SummaryStat label="Outstanding" value={formatCurrency(totals.outstanding)} tone={totals.outstanding > 0 ? "negative" : "default"} />
        <SummaryStat label="Collection" value={`${totals.rate.toFixed(1)}%`} tone="info" />
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3F1EF]">
        <div
          className="h-full rounded-full bg-[var(--cc-success)] transition-all"
          style={{ width: `${Math.min(totals.rate, 100)}%` }}
        />
      </div>

      <Card className="overflow-hidden rounded-[16px] border-[var(--cc-border)] bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--cc-page)]">
              <TableHead>Tenant / Stall</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rents.map((rent) => {
              const due = rentDue(rent);
              const paid = rentPaid(rent);
              const balance = Math.max(due - paid, 0);
              const status = rowStatus(rent);
              return (
                <TableRow key={rent.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{rentLabel(rent)}</span>
                      {rent.stallCode && rent.tenantName && (
                        <span className="text-xs text-[var(--cc-secondary-text)]">Unit {rent.stallCode}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(due)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(paid)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(balance)}</TableCell>
                  <TableCell>{formatDate(rent.dueDate)}</TableCell>
                  <TableCell>
                    <StatusPill tone={STATUS_TONES[status] || "muted"}>{status}</StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={balance <= 0}
                      onClick={() => setPayingRent(rent)}
                    >
                      Record
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Totals</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(totals.due)}</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(totals.collected)}</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(totals.outstanding)}</TableCell>
              <TableCell colSpan={3} className="text-right text-xs text-[var(--cc-secondary-text)]">
                {totals.rate.toFixed(1)}% collected
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      {payingRent && (
        <RecordPaymentModal
          rent={payingRent}
          isRecording={isRecording}
          onClose={() => setPayingRent(null)}
          onSubmit={(payload) =>
            onRecordPayment(
              { rentId: payingRent.id, payload },
              { onSuccess: () => setPayingRent(null) },
            )
          }
        />
      )}
    </div>
  );
}

function SummaryStat({ label, value, tone = "default" }) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-red-600"
        : tone === "info"
          ? "text-[var(--cc-primary)]"
          : "text-[var(--cc-text)]";
  return (
    <Card className="rounded-[14px] border-[var(--cc-border)] bg-white p-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--cc-muted-text)]">{label}</p>
      <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
    </Card>
  );
}

function RecordPaymentModal({ rent, isRecording, onClose, onSubmit }) {
  const balance = Math.max(rentDue(rent) - rentPaid(rent), 0);
  const [amount, setAmount] = useState(balance ? String(balance) : "");
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("CASH");

  const numericAmount = Number(amount);
  const valid = Number.isFinite(numericAmount) && numericAmount > 0;

  function submit(event) {
    event.preventDefault();
    if (!valid) return;
    onSubmit({ amount: numericAmount, paidOn, method });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <Card className="w-full max-w-md rounded-[20px] border-[var(--cc-border)] bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--cc-text)]">Record payment</h3>
            <p className="text-sm text-[var(--cc-secondary-text)]">
              {rentLabel(rent)} · balance {formatCurrency(balance)}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div className="space-y-1">
            <Label>Amount received *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Payment date</Label>
            <Input type="date" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-11 w-full rounded-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!valid || isRecording}>
              {isRecording && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save payment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
