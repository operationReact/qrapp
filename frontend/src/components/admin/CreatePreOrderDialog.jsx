import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createAdminPreOrder } from "@/services/order-service";
import { adminPreOrderItemsOptions } from "@/query/options/orders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarCheckIcon,
  MinusIcon,
  PlusIcon,
  PhoneIcon,
  NoteIcon,
  ShoppingBagIcon,
  LeafIcon,
  CurrencyInrIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNextWorkingDay() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}

function formatScheduledDate(d) {
  return d.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreatePreOrderDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery(adminPreOrderItemsOptions);

  const scheduledDate = useMemo(() => getNextWorkingDay(), []);
  const scheduledAt = scheduledDate.toISOString().slice(0, 19);

  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [quantities, setQuantities] = useState({});

  const setQty = (itemId, delta) => {
    setQuantities((prev) => {
      const next = (prev[itemId] ?? 0) + delta;
      if (next <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const selectedItems = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const item = items.find((i) => String(i.id) === String(id));
          return item ? { item, qty } : null;
        })
        .filter(Boolean),
    [quantities, items],
  );

  const grandTotal = useMemo(
    () => selectedItems.reduce((acc, { item, qty }) => acc + (item.price ?? 0) * qty, 0),
    [selectedItems],
  );

  const isValid = phone.trim().length >= 10 && selectedItems.length > 0;

  const mutation = useMutation({
    mutationFn: (payload) => createAdminPreOrder(payload),
    onSuccess: () => {
      toast.success(`Pre-order created — scheduled for ${formatScheduledDate(scheduledDate)}`);
      qc.invalidateQueries({ queryKey: ["pre-orders", "admin"] });
      onOpenChange(false);
      setPhone("");
      setNote("");
      setQuantities({});
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message ?? "Failed to create pre-order"),
  });

  const handleSubmit = () => {
    mutation.mutate({
      phone: phone.trim(),
      scheduledAt,
      customerNote: note.trim() || undefined,
      items: selectedItems.map(({ item, qty }) => ({
        itemId: item.id,
        quantity: qty,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarCheckIcon className="size-5 text-primary" weight="fill" />
            Create Pre-Order
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* ── Schedule banner ──────────────────────────────────────── */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-start gap-3">
            <CalendarCheckIcon className="size-5 text-primary shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="text-sm font-semibold text-primary">
                Scheduled for {formatScheduledDate(scheduledDate)}
              </p>
              <p className="text-xs text-primary mt-0.5">
                Pre-orders are fulfilled on the next working day.
              </p>
            </div>
          </div>

          {/* ── Phone ──────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
              <PhoneIcon className="size-3.5" weight="fill" />
              Customer phone *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* ── Note ───────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
              <NoteIcon className="size-3.5" weight="fill" />
              Note (optional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Special instructions…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* ── Item picker ────────────────────────────────────────────── */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
              <ShoppingBagIcon className="size-3.5" weight="fill" />
              Pre-order items
            </span>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-400">
                No items tagged &quot;PreOrderOnly&quot; found.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-100 overflow-hidden">
                {items.map((item) => {
                  const qty = quantities[item.id] ?? 0;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 transition-colors",
                        qty > 0 && "bg-primary/5",
                      )}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="size-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-10 rounded-lg bg-zinc-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-zinc-800 truncate">
                            {item.name}
                          </span>
                          {item.isVeg && (
                            <LeafIcon
                              className="size-3.5 text-emerald-500 shrink-0"
                              weight="fill"
                            />
                          )}
                        </div>
                        {item.price != null && (
                          <span className="text-xs text-zinc-500">
                            {formatCurrency(item.price)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setQty(item.id, -1)}
                          disabled={qty === 0}
                          className="size-7 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-500 disabled:opacity-30 hover:bg-zinc-100 transition-colors"
                        >
                          <MinusIcon className="size-3.5" weight="bold" />
                        </button>
                        <span
                          className={cn(
                            "w-6 text-center text-sm font-semibold",
                            qty > 0 ? "text-primary" : "text-zinc-300",
                          )}
                        >
                          {qty || "—"}
                        </span>
                        <button
                          onClick={() => setQty(item.id, 1)}
                          className="size-7 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                        >
                          <PlusIcon className="size-3.5" weight="bold" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <DialogFooter className="px-5 py-3 border-t bg-zinc-50 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            {selectedItems.length > 0 ? (
              <>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {selectedItems.reduce((a, { qty }) => a + qty, 0)} items
                </Badge>
                <span className="font-semibold text-zinc-700 flex items-center gap-0.5">
                  <CurrencyInrIcon className="size-3.5" weight="bold" />
                  {formatCurrency(grandTotal)}
                </span>
              </>
            ) : (
              <span className="text-zinc-400 text-xs">No items selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary text-white gap-1.5"
              disabled={!isValid || mutation.isPending}
              onClick={handleSubmit}
            >
              <CalendarCheckIcon className="size-4" weight="fill" />
              {mutation.isPending ? "Creating…" : "Create Pre-Order"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
