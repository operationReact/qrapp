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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitPartyOrderEstimate } from "@/services/party-order-service";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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
            quotedPrice: item.quotedPrice != null ? String(item.quotedPrice) : "",
            estimatedCost: item.estimatedCost != null ? String(item.estimatedCost) : "",
          }))
        : (Array.isArray(order.menuItems) ? order.menuItems : []).map((name) => ({
            itemName: name,
            quotedPrice: "",
            estimatedCost: "",
          }));

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
      prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
    );
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { itemName: "", quotedPrice: "", estimatedCost: "" },
    ]);

  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const people = order?.numberOfPeople || 1;

  const totals = rows.reduce(
    (acc, row) => {
      acc.revenue += (parseFloat(row.quotedPrice) || 0) * people;
      acc.expense += (parseFloat(row.estimatedCost) || 0) * people;
      return acc;
    },
    { revenue: 0, expense: 0 }
  );
  totals.profit = totals.revenue - totals.expense;

  const handleSubmit = (e) => {
    e.preventDefault();
    const validRows = rows.filter(
      (r) => r.itemName.trim() && r.quotedPrice && r.estimatedCost
    );
    if (validRows.length === 0) {
      toast.error("Please add at least one menu item with pricing");
      return;
    }
    const invalidPrices = validRows.some(
      (r) => parseFloat(r.quotedPrice) <= 0 || parseFloat(r.estimatedCost) < 0
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Estimate</DialogTitle>
          <DialogDescription>
            {order?.userName
              ? `For ${order.userName}`
              : "Set per-item pricing and send estimate to customer."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer summary */}
          {order && (
            <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs space-y-1">
              {order.eventType && (
                <div>
                  <span className="text-muted-foreground">Event: </span>
                  <span className="font-medium">{order.eventType}</span>
                </div>
              )}
              {order.eventDateTime && (
                <div>
                  <span className="text-muted-foreground">Date: </span>
                  <span className="font-medium">
                    {new Date(order.eventDateTime).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              )}
              {order.numberOfPeople && (
                <div>
                  <span className="text-muted-foreground">People: </span>
                  <span className="font-medium">{order.numberOfPeople}</span>
                </div>
              )}
              {order.budgetAmount && (
                <div>
                  <span className="text-muted-foreground">Budget: </span>
                  <span className="font-medium">
                    {formatCurrency(order.budgetAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Menu items table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Menu Items</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addRow}
              >
                <Plus size={13} className="mr-1" /> Add Item
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-input">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-[36%]">Menu Item</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-[22%]">
                      Quoted Price ₹
                      <span className="block font-normal text-[10px] text-muted-foreground/70">per person</span>
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-[22%]">
                      Est. Cost ₹
                      <span className="block font-normal text-[10px] text-muted-foreground/70">per person</span>
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-[16%]">
                      Profit ₹
                      <span className="block font-normal text-[10px] text-muted-foreground/70">× {people} pax</span>
                    </th>
                    <th className="w-[4%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const profit = calcProfit(row);
                    return (
                      <tr key={idx} className="border-t border-input">
                        <td className="px-2 py-1.5">
                          <input
                            value={row.itemName}
                            onChange={(e) =>
                              updateRow(idx, "itemName", e.target.value)
                            }
                            placeholder="Item name"
                            className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                          />
                        </td>
                        <td className="px-2 py-1.5">
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
                        </td>
                        <td className="px-2 py-1.5">
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
                        </td>
                        <td
                          className={cn(
                            "px-2 py-1.5 text-right text-xs font-semibold tabular-nums",
                            profit >= 0 ? "text-emerald-600" : "text-red-500"
                          )}
                        >
                          {row.quotedPrice && row.estimatedCost ? (
                            <span>
                              <span className="block">{(profit >= 0 ? "+" : "") + (profit * people).toLocaleString("en-IN")}</span>
                              <span className="font-normal text-muted-foreground text-[10px]">
                                {(profit >= 0 ? "+" : "") + profit.toLocaleString("en-IN")} × {people}
                              </span>
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="rounded hover:bg-muted p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center text-xs text-muted-foreground py-4"
                      >
                        No items — click "Add Item" to start
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            {rows.some((r) => r.quotedPrice || r.estimatedCost) && (
              <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2 space-y-1 text-xs">
                <p className="text-muted-foreground font-medium">
                  Total (per person × {people} people)
                </p>
                <div className="flex gap-4 flex-wrap">
                  <div>
                    <span className="text-muted-foreground">Revenue: </span>
                    <span className="font-semibold">{formatCurrency(totals.revenue)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expense: </span>
                    <span className="font-semibold">{formatCurrency(totals.expense)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit: </span>
                    <span className={cn("font-bold", totals.profit >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {totals.profit >= 0 ? "+" : ""}{formatCurrency(totals.profit)}
                    </span>
                  </div>
                  {order?.budgetAmount && (
                    <div>
                      <span className="text-muted-foreground">vs Budget: </span>
                      <span className={cn("font-semibold", totals.revenue - order.budgetAmount >= 0 ? "text-red-500" : "text-emerald-600")}>
                        {totals.revenue - order.budgetAmount >= 0 ? "+" : ""}{formatCurrency(totals.revenue - order.budgetAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Estimate note (visible to customer) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Estimate Note{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (visible to customer)
              </span>
            </label>
            <textarea
              value={estimateNote}
              onChange={(e) => setEstimateNote(e.target.value)}
              placeholder="e.g. Includes serving staff, setup, and cleanup…"
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 resize-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Admin notes (internal only) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Admin Notes{" "}
              <span className="text-red-500 text-xs font-normal">
                (internal only — not shown to customer)
              </span>
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes, sourcing, special arrangements…"
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 resize-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Expiry hours */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium whitespace-nowrap">
              Estimate valid for
            </label>
            <input
              type="number"
              min="1"
              max="720"
              value={expiryHours}
              onChange={(e) => setExpiryHours(Number(e.target.value))}
              className="w-20 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting…" : "Send Estimate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
