import { useState } from "react";
import { Loader2, Plus, Receipt, X } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, formatMonthLabel } from "../format";
import { PanelError, PanelLoading } from "./FeatureStates";

const CATEGORIES = [
  "UTILITIES",
  "MAINTENANCE",
  "CLEANING",
  "SECURITY",
  "MARKETING",
  "SALARIES",
  "SUPPLIES",
  "OTHER",
];

const emptyForm = {
  category: "UTILITIES",
  description: "",
  amount: "",
  incurredOn: new Date().toISOString().slice(0, 10),
};

export function ExpensesPanel({ query, month, onCreate, isCreating }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const expenses = query.data || [];
  const total = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

  function submit(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    onCreate(
      { ...form, amount, month },
      {
        onSuccess: () => {
          setForm(emptyForm);
          setShowForm(false);
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[var(--cc-secondary-text)]">
          Expenses for {formatMonthLabel(month)}
        </p>
        <Button size="sm" onClick={() => setShowForm((value) => !value)}>
          <Plus className="size-4" /> Add expense
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-[16px] border-[var(--cc-border)] bg-white p-4">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                <SelectTrigger className="h-11 w-full rounded-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0) + category.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.incurredOn}
                onChange={(event) => setForm({ ...form, incurredOn: event.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="What was this expense for?"
              />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                <X className="size-4" /> Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !form.amount}>
                {isCreating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save expense
              </Button>
            </div>
          </form>
        </Card>
      )}

      {query.isLoading ? (
        <PanelLoading rows={4} />
      ) : query.isError ? (
        <PanelError onRetry={query.refetch} />
      ) : expenses.length === 0 ? (
        <Card className="rounded-[16px] border border-dashed border-[var(--cc-border)] bg-white">
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Receipt className="size-6 text-[var(--cc-muted-text)]" aria-hidden="true" />
            <p className="text-sm font-semibold text-[var(--cc-text)]">No expenses logged</p>
            <p className="text-xs text-[var(--cc-secondary-text)]">
              Add the first expense for {formatMonthLabel(month)} to start tracking costs.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-[16px] border-[var(--cc-border)] bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--cc-page)]">
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    {String(expense.category || "Other").replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="max-w-[18rem] truncate text-[var(--cc-secondary-text)]">
                    {expense.description || "—"}
                  </TableCell>
                  <TableCell>{formatDate(expense.incurredOn || expense.createdAt)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(expense.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )}
    </div>
  );
}
