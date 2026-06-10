import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { menuOptions } from "@/query/options/menu";
import {
  updateComboOpportunity,
  reviewComboOpportunity,
} from "@/services/comboService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PlusIcon,
  TrashIcon,
  ArrowsClockwiseIcon,
  CheckIcon,
} from "@phosphor-icons/react";

const fmtCur = (n) =>
  n == null
    ? "—"
    : `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
        Number(n),
      )}`;

function buildForm(opportunity) {
  return {
    comboName: opportunity?.comboName ?? "",
    price: String(opportunity?.suggestedPrice ?? ""),
    items: (opportunity?.items ?? []).map((item, idx) => ({ ...item, _key: idx })),
  };
}

// ── Replace Item Dialog ───────────────────────────────────────────────────────
function ReplaceItemDialog({ target, onReplace, onClose }) {
  if (!target) return null;
  const alternatives = target.validAlternatives ?? [];
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Replace &quot;{target.name}&quot;</DialogTitle>
          <DialogDescription>
            Choose from valid alternatives based on pairing rules.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {alternatives.length === 0 ? (
            <div className="py-6 text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                No valid alternatives defined for this slot.
              </p>
              <p className="text-xs text-muted-foreground">
                Use &quot;Add Item&quot; to append any menu item instead.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                Valid Alternatives
              </p>
              {alternatives.map((alt) => (
                <button
                  key={alt.menuItemId}
                  onClick={() => onReplace(alt)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <CheckIcon weight="bold" className="size-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{alt.name}</p>
                    <p className="text-xs text-muted-foreground">{fmtCur(alt.price)}</p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Item Dialog ───────────────────────────────────────────────────────────
function AddItemDialog({ open, onClose, onAdd, addedIds }) {
  const [search, setSearch] = useState("");
  const { data: menuItems = [] } = useQuery(menuOptions({ available: true }));

  const filtered = menuItems.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Item to Combo</DialogTitle>
          <DialogDescription>
            Select a menu item. Use &quot;Replace&quot; on each slot to choose from smart alternatives.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <Input
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
            autoFocus
          />
          <ScrollArea className="h-56">
            <div className="space-y-1 pr-2">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items found.
                </p>
              )}
              {filtered.map((item) => {
                const already = addedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => !already && onAdd(item)}
                    disabled={already}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border text-left transition-colors",
                      already
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:border-primary hover:bg-primary/5",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtCur(item.price)}
                      </p>
                    </div>
                    {already ? (
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                        Added
                      </span>
                    ) : (
                      <PlusIcon className="size-4 text-zinc-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export default function EditComboOpportunityDrawer({
  opportunity,
  open,
  onClose,
  onSaved,
}) {
  // Single form state to avoid multiple synchronous setState calls in useEffect
  const [form, setForm] = useState(() => buildForm(opportunity));
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Re-initialise when a different opportunity is opened
  useEffect(() => {
    setForm(buildForm(opportunity));
  }, [opportunity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setComboName = (v) => setForm((f) => ({ ...f, comboName: v }));
  const setPrice     = (v) => setForm((f) => ({ ...f, price: v }));
  const setItems     = (fn) => setForm((f) => ({ ...f, items: fn(f.items) }));

  const replaceItem = (newItem) => {
    setItems((prev) =>
      prev.map((item) =>
        item._key === replaceTarget._key
          ? {
              menuItemId: newItem.menuItemId,
              name: newItem.name,
              price: newItem.price,
              _key: replaceTarget._key,
              validAlternatives: item.validAlternatives ?? [],
            }
          : item,
      ),
    );
    setReplaceTarget(null);
  };

  const removeItem = (key) => setItems((prev) => prev.filter((i) => i._key !== key));

  const addItem = (menuItem) => {
    const nextKey = form.items.length > 0 ? Math.max(...form.items.map((i) => i._key)) + 1 : 0;
    setItems((prev) => [
      ...prev,
      {
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        _key: nextKey,
        validAlternatives: [],
      },
    ]);
    setAddItemOpen(false);
  };

  const doSave = async (approve) => {
    if (!opportunity) return;
    setSubmitting(true);
    try {
      await updateComboOpportunity(opportunity.id, {
        comboName: form.comboName.trim(),
        suggestedPrice: Number(form.price),
        items: form.items.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
        })),
      });
      if (approve) {
        await reviewComboOpportunity(opportunity.id, "APPROVE");
      }
      toast.success(approve ? "Combo approved and saved!" : "Changes saved!");
      onSaved?.();
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSubmitting(false);
    }
  };

  const addedIds = new Set(form.items.map((i) => i.menuItemId));
  const savings =
    opportunity?.individualPrice && Number(form.price) > 0
      ? opportunity.individualPrice - Number(form.price)
      : null;
  const canSave =
    form.comboName.trim().length > 0 &&
    Number(form.price) > 0 &&
    form.items.length >= 2;

  if (!opportunity) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full max-w-md flex flex-col p-0">
          {/* Header */}
          <SheetHeader className="px-4 pt-5 pb-4 border-b border-zinc-100 shrink-0">
            <SheetTitle className="text-base font-bold">Edit Combo Suggestion</SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modify the AI-generated combo before approving
            </p>
          </SheetHeader>

          {/* Body */}
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-5 pb-2">
              {/* Combo Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Combo Name
                </Label>
                <Input
                  value={form.comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  placeholder="Enter combo name…"
                  className="h-11"
                />
              </div>

              {/* Combo Price */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Combo Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">
                    ₹
                  </span>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="h-11 pl-8"
                    min="0"
                  />
                </div>
                {savings != null && savings > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Individual total:{" "}
                    <span className="font-medium">{fmtCur(opportunity.individualPrice)}</span>
                    {" "}· Customer saves:{" "}
                    <span className="font-medium text-emerald-700">{fmtCur(savings)}</span>
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Items
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {form.items.length} item{form.items.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div
                      key={item._key}
                      className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2.5 border border-zinc-100"
                    >
                      <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmtCur(item.price)}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-zinc-400 hover:text-primary"
                          title="Replace with valid alternative"
                          onClick={() => setReplaceTarget(item)}
                        >
                          <ArrowsClockwiseIcon className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-zinc-400 hover:text-destructive"
                          title="Remove item"
                          onClick={() => removeItem(item._key)}
                        >
                          <TrashIcon className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 border-dashed gap-1.5 font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setAddItemOpen(true)}
                >
                  <PlusIcon className="size-4" /> Add Item
                </Button>
              </div>

              {/* Customer customisation hint */}
              {form.items.some((i) => (i.validAlternatives ?? []).length > 0) && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5 text-xs text-blue-700">
                  <p className="font-semibold mb-0.5">Customer Customisation Enabled</p>
                  <p className="leading-relaxed">
                    Items with valid alternatives let customers choose from the pool
                    you define — improving combo conversions.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <SheetFooter className="px-4 py-4 border-t border-zinc-100 flex-col gap-2 shrink-0">
            <Button
              className="w-full h-11 font-semibold gap-2"
              onClick={() => doSave(true)}
              disabled={submitting || !canSave}
            >
              <CheckIcon weight="bold" className="size-4" />
              {submitting ? "Saving…" : "Save & Approve"}
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 font-semibold"
              onClick={() => doSave(false)}
              disabled={submitting || !canSave}
            >
              Save Changes Only
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Replace Item Dialog */}
      <ReplaceItemDialog
        target={replaceTarget}
        onReplace={replaceItem}
        onClose={() => setReplaceTarget(null)}
      />

      {/* Add Item Dialog */}
      <AddItemDialog
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        onAdd={addItem}
        addedIds={addedIds}
      />
    </>
  );
}
