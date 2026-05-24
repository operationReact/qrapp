import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusIcon, TrashIcon, MinusIcon } from "@phosphor-icons/react";
import { getMenu } from "@/services/api";

const TIME_SLOTS = ["BREAKFAST", "LUNCH", "EVENING", "FULL_DAY", "CUSTOM"];
const COMBO_TYPES = ["VEG", "NON_VEG", "CONTAINS_EGG", "VEGAN"];

const BLANK = {
  comboName: "",
  shortName: "",
  description: "",
  categoryId: "",
  comboType: "VEG",
  comboPrice: "",
  imageUrl: "",
  timeSlot: "LUNCH",
  isFeatured: false,
  isPreorderEligible: false,
  isSignatureCombo: false,
  displayPriority: 0,
  items: [],
  schedules: [],
  signatureProducts: [],
};

function ItemRow({ item, menuItems, onChange, onRemove }) {
  const menuItem = menuItems.find((m) => m.id === item.menuItemId);
  return (
    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">
          {menuItem?.name ?? `Item #${item.menuItemId}`}
        </p>
        {menuItem?.categoryName && (
          <p className="text-[10px] text-zinc-400">{menuItem.categoryName}</p>
        )}
      </div>
      {/* Qty stepper */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange({ ...item, quantity: Math.max(1, item.quantity - 1) })}
          className="w-7 h-7 rounded-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 flex items-center justify-center text-zinc-600 dark:text-zinc-300"
        >
          <MinusIcon size={12} weight="bold" />
        </button>
        <span className="w-5 text-center text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() => onChange({ ...item, quantity: item.quantity + 1 })}
          className="w-7 h-7 rounded-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 flex items-center justify-center text-zinc-600 dark:text-zinc-300"
        >
          <PlusIcon size={12} weight="bold" />
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
      >
        <TrashIcon size={13} />
      </button>
    </div>
  );
}

export default function CreateComboSheet({ open, onClose, initialData, onSave, busy }) {
  const [form, setForm] = useState(BLANK);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [addingItemId, setAddingItemId] = useState("");

  // Populate form when editing
  useEffect(() => {
    (async () => {
      await Promise.resolve(); // defer past synchronous render
      if (initialData) {
        setForm({
          comboName: initialData.comboName ?? "",
          shortName: initialData.shortName ?? "",
          description: initialData.description ?? "",
          categoryId: initialData.categoryId ?? "",
          comboType: initialData.comboType ?? "VEG",
          comboPrice: initialData.comboPrice ?? "",
          imageUrl: initialData.imageUrl ?? "",
          timeSlot: initialData.timeSlot ?? "LUNCH",
          isFeatured: initialData.isFeatured ?? false,
          isPreorderEligible: initialData.isPreorderEligible ?? false,
          isSignatureCombo: initialData.isSignatureCombo ?? false,
          displayPriority: initialData.displayPriority ?? 0,
          items: (initialData.items ?? []).map((it) => ({
            menuItemId: it.menuItemId,
            quantity: it.quantity,
            sortOrder: it.sortOrder ?? 0,
          })),
          schedules: initialData.schedules ?? [],
          signatureProducts: initialData.signatureProducts ?? [],
        });
      } else {
        setForm(BLANK);
      }
    })();
  }, [initialData, open]);

  // Load menu items for picker
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setMenuLoading(true);
      try {
        const res = await getMenu({ all: true });
        if (!cancelled) {
          const items = Array.isArray(res?.data) ? res.data : res?.data?.content ?? [];
          setMenuItems(items);
        }
      } catch {
        if (!cancelled) setMenuItems([]);
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const addItem = () => {
    if (!addingItemId) return;
    const id = Number(addingItemId);
    if (form.items.some((i) => i.menuItemId === id)) return;
    set("items", [
      ...form.items,
      { menuItemId: id, quantity: 1, sortOrder: form.items.length },
    ]);
    setAddingItemId("");
  };

  const updateItem = (idx, updated) =>
    set("items", form.items.map((it, i) => (i === idx ? updated : it)));

  const removeItem = (idx) =>
    set("items", form.items.filter((_, i) => i !== idx));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      comboPrice: Number(form.comboPrice),
      displayPriority: Number(form.displayPriority),
    };
    onSave(payload);
  };

  const isEditing = !!initialData;

  // Available items not yet in the combo
  const availableItems = menuItems.filter(
    (m) => !form.items.some((it) => it.menuItemId === m.id)
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] rounded-t-2xl px-0 flex flex-col sm:side-right sm:w-[480px] sm:h-full sm:rounded-none"
      >
        <SheetHeader className="px-5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <SheetTitle className="text-base font-semibold">
            {isEditing ? "Edit Combo" : "Create Combo"}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5">
          <form id="combo-form" onSubmit={handleSubmit} className="space-y-5 py-4">
            {/* ── Basic Info ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Basic Info
              </p>
              <div className="space-y-1">
                <Label htmlFor="comboName" className="text-xs">Combo Name *</Label>
                <Input
                  id="comboName"
                  value={form.comboName}
                  onChange={(e) => set("comboName", e.target.value)}
                  placeholder="e.g. Lunch Feast"
                  required
                  maxLength={150}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="shortName" className="text-xs">Short Name *</Label>
                <Input
                  id="shortName"
                  value={form.shortName}
                  onChange={(e) => set("shortName", e.target.value)}
                  placeholder="e.g. Lunch Feast"
                  required
                  maxLength={60}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Short description"
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="imageUrl" className="text-xs">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={form.imageUrl}
                  onChange={(e) => set("imageUrl", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </section>

            {/* ── Pricing & Type ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Pricing &amp; Type
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Combo Price (₹) *</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.comboPrice}
                    onChange={(e) => set("comboPrice", e.target.value)}
                    placeholder="e.g. 159"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Display Priority</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.displayPriority}
                    onChange={(e) => set("displayPriority", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Type *</Label>
                  <Select value={form.comboType} onValueChange={(v) => set("comboType", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMBO_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Time Slot *</Label>
                  <Select value={form.timeSlot} onValueChange={(v) => set("timeSlot", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* ── Options ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Options
              </p>
              {[
                { key: "isFeatured", label: "Featured", desc: "Show on homepage spotlight" },
                { key: "isPreorderEligible", label: "Pre-order eligible", desc: "Allow advance ordering" },
                { key: "isSignatureCombo", label: "Signature combo", desc: "Mark as a signature offering" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{label}</p>
                    <p className="text-[11px] text-zinc-400">{desc}</p>
                  </div>
                  <Switch
                    checked={form[key]}
                    onCheckedChange={(v) => set(key, v)}
                  />
                </div>
              ))}
            </section>

            {/* ── Items ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Items <span className="normal-case font-normal text-zinc-400">(min. 2)</span>
              </p>

              {form.items.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-3 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl">
                  No items added yet
                </p>
              )}

              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <ItemRow
                    key={item.menuItemId}
                    item={item}
                    menuItems={menuItems}
                    onChange={(updated) => updateItem(idx, updated)}
                    onRemove={() => removeItem(idx)}
                  />
                ))}
              </div>

              {/* Add item picker */}
              <div className="flex gap-2">
                <Select
                  value={addingItemId}
                  onValueChange={setAddingItemId}
                  disabled={menuLoading}
                >
                  <SelectTrigger className="flex-1 text-sm">
                    <SelectValue placeholder={menuLoading ? "Loading…" : "Select item to add"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableItems.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addItem}
                  disabled={!addingItemId}
                  className="flex-shrink-0"
                >
                  <PlusIcon size={16} />
                </Button>
              </div>
            </section>
          </form>
        </ScrollArea>

        <SheetFooter className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="combo-form"
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
            disabled={busy || form.items.length < 2}
          >
            {busy ? "Saving…" : isEditing ? "Save Changes" : "Create Combo"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

