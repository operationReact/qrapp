import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitPartyOrderEstimate } from "@/services/party-order-service";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import {
  ConfettiIcon,
  CalendarIcon,
  UsersIcon,
  CurrencyInrIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Textarea } from "../ui/textarea";
import { Field, FieldContent, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { UserIcon } from "@phosphor-icons/react";

function formatCurrency(v) {
  if (!v && v !== 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

function calcProfit(row) {
  const q = parseFloat(row.quotedPrice) || 0;
  const c = parseFloat(row.estimatedCost) || 0;
  return q - c;
}

export default function PartyOrderEstimateDialog({
  open,
  onOpenChange,
  order,
  onSubmitted,
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState([]);
  const [estimateNote, setEstimateNote] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [expiryHours, setExpiryHours] = useState(48);

  // Auto-populate rows from order's menu items when dialog opens
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (!open || prevOpenRef.current === open) return;
    prevOpenRef.current = open;
    if (!order) return;

    const existing =
      Array.isArray(order.menuItemDetails) && order.menuItemDetails.length > 0
        ? order.menuItemDetails
        : [];

    const nextRows =
      existing.length > 0
        ? existing.map((item) => ({
            itemName: item.itemName || "",
            quotedPrice:
              item.quotedPrice != null ? String(item.quotedPrice) : "",
            estimatedCost:
              item.estimatedCost != null ? String(item.estimatedCost) : "",
          }))
        : (Array.isArray(order.menuItems) ? order.menuItems : []).map(
            (name) => ({
              itemName: name,
              quotedPrice: "",
              estimatedCost: "",
            }),
          );

    setRows(nextRows);
    setEstimateNote(order.estimateNote || "");
    setAdminNotes(order.adminNotes || "");
  });

  useEffect(() => {
    if (!open) prevOpenRef.current = false;
  }, [open]);

  const submitMutation = useMutation({
    mutationFn: (data) => submitPartyOrderEstimate(order?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["party-orders"] });
      onSubmitted?.();
      toast.success("Estimate submitted successfully");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to submit estimate");
    },
  });

  const updateRow = (idx, field, val) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)),
    );
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { itemName: "", quotedPrice: "", estimatedCost: "" },
    ]);

  const removeRow = (idx) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const people = order?.numberOfPeople || 1;

  const totals = rows.reduce(
    (acc, row) => {
      acc.revenue += (parseFloat(row.quotedPrice) || 0) * people;
      acc.expense += (parseFloat(row.estimatedCost) || 0) * people;
      return acc;
    },
    { revenue: 0, expense: 0 },
  );
  totals.profit = totals.revenue - totals.expense;

  const handleSubmit = (e) => {
    e.preventDefault();
    const validRows = rows.filter(
      (r) => r.itemName.trim() && r.quotedPrice && r.estimatedCost,
    );
    if (validRows.length === 0) {
      toast.error("Please add at least one menu item with pricing");
      return;
    }
    const invalidPrices = validRows.some(
      (r) => parseFloat(r.quotedPrice) <= 0 || parseFloat(r.estimatedCost) < 0,
    );
    if (invalidPrices) {
      toast.error("All prices must be positive");
      return;
    }
    submitMutation.mutate({
      menuItems: validRows.map((r) => ({
        itemName: r.itemName.trim(),
        quotedPrice: parseFloat(r.quotedPrice),
        estimatedCost: parseFloat(r.estimatedCost),
      })),
      estimateNote,
      adminNotes,
      currency: "INR",
      estimateExpiryHours: expiryHours,
    });
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setRows([]);
      setEstimateNote("");
      setAdminNotes("");
      setExpiryHours(48);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">
            Send Estimate for{" "}
            <span className="text-primary">{order.eventType} Event</span>
          </DialogTitle>
          <DialogDescription className="text-secondary-foreground">
            {order?.userName ? (
              <span className="flex gap-1 items-center">
                <UserIcon weight="duotone" /> For {order.userName}
              </span>
            ) : (
              "Set per-item pricing and send estimate to customer."
            )}
          </DialogDescription>
        </DialogHeader>

        <form
          id={`send-party-estimate-${order.id}`}
          onSubmit={handleSubmit}
          className="space-y-4 pb-1 px-1 min-w-0 max-h-[60vh] overflow-y-auto no-scrollbar"
        >
          {/* Customer summary */}
          {order && (
            <div className="rounded-lg bg-muted/70 px-3 py-4">
              <p className="text-xs/relaxed text-secondary-foreground/60 uppercase font-medium mb-2">
                Event Details
              </p>
              <div className="grid grid-cols-2 place-items-start gap-x-3 gap-y-2 text-sm">
                {order.eventType && (
                  <div className="flex items-center gap-1.5 text-secondary-foreground">
                    <ConfettiIcon
                      weight="duotone"
                      className="size-3.5 text-primary shrink-0"
                    />
                    <span className="font-medium">{order.eventType}</span>
                  </div>
                )}
                {order.eventDateTime && (
                  <div className="flex items-center gap-1.5 font-medium text-secondary-foreground">
                    <CalendarIcon
                      weight="duotone"
                      className="size-3.5 text-primary shrink-0"
                    />
                    <span>
                      {new Date(order.eventDateTime).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                )}
                {order.numberOfPeople && (
                  <div className="flex items-center gap-1.5 font-medium text-secondary-foreground">
                    <UsersIcon
                      weight="duotone"
                      className="size-3.5 text-primary shrink-0"
                    />
                    <span>{order.numberOfPeople} people</span>
                  </div>
                )}
                {order.budgetAmount && (
                  <div className="flex items-center gap-1.5 text-secondary-foreground">
                    <CurrencyInrIcon
                      weight="duotone"
                      className="size-3.5 text-primary shrink-0"
                    />
                    <span className="font-medium">
                      {formatCurrency(order.budgetAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Menu items table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Menu Items</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addRow}
              >
                <Plus size={13} className="mr-1" /> Add Item
              </Button>
            </div>

            <div className="overflow-x-auto rounded-sm border border-input">
              <Table className="min-w-[500px]">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[36%]">Menu Item</TableHead>
                    <TableHead className="text-right w-[22%]">
                      Quoted Price ₹
                      <span className="block font-normal text-[10px] text-secondary-foreground/70">
                        per person
                      </span>
                    </TableHead>
                    <TableHead className="text-right w-[22%]">
                      Est. Cost ₹
                      <span className="block font-normal text-[10px] text-secondary-foreground/70">
                        per person
                      </span>
                    </TableHead>
                    <TableHead className="text-right w-[16%]">
                      Profit ₹
                      <span className="block font-normal text-[10px] text-secondary-foreground/70">
                        × {people} pax
                      </span>
                    </TableHead>
                    <TableHead className="w-[4%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => {
                    const profit = calcProfit(row);
                    return (
                      <TableRow key={idx}>
                        <TableCell className="w-[36%]">
                          <input
                            value={row.itemName}
                            onChange={(e) =>
                              updateRow(idx, "itemName", e.target.value)
                            }
                            placeholder="Item name"
                            className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                          />
                        </TableCell>
                        <TableCell className="w-[22%]">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.quotedPrice}
                            onChange={(e) =>
                              updateRow(idx, "quotedPrice", e.target.value)
                            }
                            placeholder="0"
                            className="w-full bg-transparent outline-none text-sm text-right placeholder:text-muted-foreground"
                          />
                        </TableCell>
                        <TableCell className="w-[22%]">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.estimatedCost}
                            onChange={(e) =>
                              updateRow(idx, "estimatedCost", e.target.value)
                            }
                            placeholder="0"
                            className="w-full bg-transparent outline-none text-sm text-right placeholder:text-muted-foreground"
                          />
                        </TableCell>
                        <TableCell
                          className={cn(
                            "w-[16%] text-right tabular-nums",
                            profit >= 0 ? "text-emerald-600" : "text-red-500",
                          )}
                        >
                          {row.quotedPrice && row.estimatedCost ? (
                            <span>
                              <span className="block text-xs font-medium">
                                {(profit >= 0 ? "+" : "") +
                                  (profit * people).toLocaleString("en-IN")}
                              </span>
                              <span className="font-medium text-muted-foreground text-xs">
                                {(profit >= 0 ? "+" : "") +
                                  profit.toLocaleString("en-IN")}{" "}
                                × {people}
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="w-[4%] text-center">
                          <Button
                            size="icon-xs"
                            variant="secondary"
                            type="button"
                            onClick={() => removeRow(idx)}
                          >
                            <X size={12} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No items — click "Add Item" to start
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            {rows.some((r) => r.quotedPrice || r.estimatedCost) && (
              <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2 space-y-1 text-sm">
                <p className="text-secondary-foreground font-medium">
                  Total (per person × {people} people)
                </p>
                <div className="flex gap-4 flex-wrap">
                  <div>
                    <span className="text-muted-foreground">Revenue: </span>
                    <span className="font-semibold">
                      {formatCurrency(totals.revenue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expense: </span>
                    <span className="font-semibold">
                      {formatCurrency(totals.expense)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit: </span>
                    <span
                      className={cn(
                        "font-bold",
                        totals.profit >= 0
                          ? "text-emerald-600"
                          : "text-red-500",
                      )}
                    >
                      {totals.profit >= 0 ? "+" : ""}
                      {formatCurrency(totals.profit)}
                    </span>
                  </div>
                  {order?.budgetAmount && (
                    <div>
                      <span className="text-muted-foreground">vs Budget: </span>
                      <span
                        className={cn(
                          "font-semibold",
                          totals.revenue - order.budgetAmount >= 0
                            ? "text-red-500"
                            : "text-emerald-600",
                        )}
                      >
                        {totals.revenue - order.budgetAmount >= 0 ? "+" : ""}
                        {formatCurrency(totals.revenue - order.budgetAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Estimate note (visible to customer) */}
          <Field>
            <FieldLabel htmlFor="estimate-note">
              Estimate Note{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (visible to customer)
              </span>
            </FieldLabel>

            <FieldContent>
              <Textarea
                value={estimateNote}
                id="estimate-note"
                name="estimate-note"
                onChange={(e) => setEstimateNote(e.target.value)}
                placeholder="e.g. Includes serving staff, setup, and cleanup…"
                rows={2}
                className="resize-none"
              />
            </FieldContent>
          </Field>

          {/* Admin notes (internal only) */}
          <Field>
            <FieldLabel htmlFor="admin-notes">
              Admin Notes{" "}
              <span className="text-red-500 text-xs font-normal">
                (internal only — not shown to customer)
              </span>
            </FieldLabel>
            <FieldContent>
              <Textarea
                id="admin-notes"
                name="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes, sourcing, special arrangements…"
                rows={2}
                className="resize-none"
              />
            </FieldContent>
          </Field>

          {/* Expiry hours */}
          <Field className="grid grid-cols-[auto_auto_auto] w-fit items-center gap-3">
            <FieldLabel htmlFor="expiry-hours">Estimate valid for</FieldLabel>
            <FieldContent>
              <Input
                name="expiry-hours"
                id="expiry-hours"
                type="number"
                min="1"
                max="720"
                value={expiryHours}
                onChange={(e) => setExpiryHours(Number(e.target.value))}
                className="w-20 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
              />
            </FieldContent>
            <span className="text-sm text-muted-foreground">hours</span>
          </Field>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            form={`send-party-estimate-${order.id}`}
            type="submit"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? "Submitting…" : "Send Estimate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
