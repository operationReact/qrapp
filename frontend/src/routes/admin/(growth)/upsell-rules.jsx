import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { upsellRulesOptions } from "@/query/options/recommendations";
import { menuOptions } from "@/query/options/menu";
import { categoriesOptions } from "@/query/options/menu";
import {
  createUpsellRule,
  updateUpsellRule,
  deleteUpsellRule,
  toggleUpsellRule,
} from "@/services/recommendation-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, PencilSimpleIcon, TrashIcon, LightningIcon } from "@phosphor-icons/react";
import ConfirmDialog from "@/components/ConfirmDialog";

export const Route = createFileRoute("/admin/(growth)/upsell-rules")({
  component: AdminUpsellRulesPage,
});

const EMPTY_FORM = {
  name: "",
  triggerType: "ITEM_IN_CART",
  triggerItemId: "",
  triggerCategoryId: "",
  minCartValue: "",
  rewardType: "FIXED_DISCOUNT",
  rewardValue: "",
  isActive: true,
  displayOrder: "0",
  targetItemIds: [],
};

function UpsellRuleFormDialog({
  open,
  onOpenChange,
  menuItems,
  categories,
  onSubmit,
  submitting,
  initial,
}) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleTargetToggle = (id) => {
    const ids = form.targetItemIds.includes(id)
      ? form.targetItemIds.filter((i) => i !== id)
      : [...form.targetItemIds, id];
    set("targetItemIds", ids);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      triggerType: form.triggerType,
      triggerItemId:
        form.triggerType === "ITEM_IN_CART" ? Number(form.triggerItemId) : null,
      triggerCategoryId:
        form.triggerType === "CATEGORY_IN_CART"
          ? Number(form.triggerCategoryId)
          : null,
      minCartValue:
        form.triggerType === "CART_VALUE_EXCEEDS"
          ? Number(form.minCartValue)
          : null,
      rewardType: form.rewardType,
      rewardValue: Number(form.rewardValue),
      isActive: form.isActive,
      displayOrder: Number(form.displayOrder),
      targetItemIds: form.targetItemIds,
    };
    onSubmit(payload);
  };

  // Reset form when initial changes (edit mode)
  useState(() => setForm(initial ?? EMPTY_FORM));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit Upsell Rule" : "New Upsell Rule"}
          </DialogTitle>
          <DialogDescription>
            Define when to offer additional items and with what discount.
          </DialogDescription>
        </DialogHeader>
        <form
          id="upsell-rule-form"
          onSubmit={handleSubmit}
          className="space-y-4 max-h-[60vh] overflow-auto px-1 no-scrollbar pt-2"
        >
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input
              placeholder="e.g. Burger Add-on Deal"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Trigger Condition</Label>
            <Select
              value={form.triggerType}
              onValueChange={(v) => set("triggerType", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ITEM_IN_CART">
                  Specific Item in Cart
                </SelectItem>
                <SelectItem value="CATEGORY_IN_CART">
                  Category in Cart
                </SelectItem>
                <SelectItem value="CART_VALUE_EXCEEDS">
                  Cart Total Exceeds
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.triggerType === "ITEM_IN_CART" && (
            <div className="space-y-2">
              <Label>Trigger Item</Label>
              <Select
                value={form.triggerItemId}
                onValueChange={(v) => set("triggerItemId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item…" />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.triggerType === "CATEGORY_IN_CART" && (
            <div className="space-y-2">
              <Label>Trigger Category</Label>
              <Select
                value={form.triggerCategoryId}
                onValueChange={(v) => set("triggerCategoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.triggerType === "CART_VALUE_EXCEEDS" && (
            <div className="space-y-2">
              <Label>Minimum Cart Value (₹)</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 300"
                value={form.minCartValue}
                onChange={(e) => set("minCartValue", e.target.value)}
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={form.rewardType}
                onValueChange={(v) => set("rewardType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED_DISCOUNT">
                    Flat ₹ Discount
                  </SelectItem>
                  <SelectItem value="PERCENT_DISCOUNT">% Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Discount Value{" "}
                {form.rewardType === "PERCENT_DISCOUNT" ? "(%)" : "(₹)"}
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={form.rewardValue}
                onChange={(e) => set("rewardValue", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Items to Offer{" "}
              <span className="text-muted-foreground text-xs">
                (click to select multiple)
              </span>
            </Label>
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto grid grid-cols-2 gap-1.5">
              {menuItems.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer transition-colors
                    ${form.targetItemIds.includes(m.id) ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}
                >
                  <input
                    type="checkbox"
                    checked={form.targetItemIds.includes(m.id)}
                    onChange={() => handleTargetToggle(m.id)}
                    className="accent-primary"
                  />
                  <span className="truncate">{m.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => set("isActive", v)}
              id="upsell-active"
            />
            <Label htmlFor="upsell-active">Active</Label>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button form="upsell-rule-form" type="submit" disabled={submitting}>
            {submitting ? "Saving…" : initial ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminUpsellRulesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: rules = [], isLoading } = useQuery(upsellRulesOptions);
  const { data: menuData = [] } = useQuery(menuOptions());
  const { data: categories = [] } = useQuery(categoriesOptions);

  const createMutation = useMutation({
    mutationFn: createUpsellRule,
    onSuccess: () => {
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["growth", "upsell-rules"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateUpsellRule(id, data),
    onSuccess: () => {
      setEditing(null);
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["growth", "upsell-rules"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUpsellRule,
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["growth", "upsell-rules"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleUpsellRule,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["growth", "upsell-rules"] }),
  });

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (rule) => {
    setEditing({
      ...rule,
      triggerItemId: rule.triggerItemId ? String(rule.triggerItemId) : "",
      triggerCategoryId: rule.triggerCategoryId
        ? String(rule.triggerCategoryId)
        : "",
      minCartValue: rule.minCartValue ? String(rule.minCartValue) : "",
      rewardValue: rule.rewardValue ? String(rule.rewardValue) : "",
      displayOrder: String(rule.displayOrder ?? 0),
      targetItemIds: rule.targets?.map((t) => t.itemId) ?? [],
    });
    setFormOpen(true);
  };

  const triggerLabel = (t) => {
    if (t.triggerType === "ITEM_IN_CART")
      return `Item: ${t.triggerItemName ?? "—"}`;
    if (t.triggerType === "CATEGORY_IN_CART")
      return `Category: ${t.triggerCategoryName ?? "—"}`;
    if (t.triggerType === "CART_VALUE_EXCEEDS")
      return `Cart ≥ ₹${t.minCartValue}`;
    return t.triggerType;
  };

  const rewardLabel = (r) =>
    r.rewardType === "PERCENT_DISCOUNT"
      ? `${r.rewardValue}% off`
      : `₹${r.rewardValue} off`;

  const skeletonRows = Array.from({ length: 3 });

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[28px] leading-tight">
            Upsell Rules
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
            Trigger-based offers: &quot;If customer adds Burger, offer Fries + Coke with ₹30 off&quot;.
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          size="lg"
          className="h-12 px-5 gap-2 shrink-0"
        >
          <PlusIcon weight="bold" className="size-4" /> New Rule
        </Button>
      </div>

      {/* ── Loading skeletons ────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="px-4 space-y-3">
          {skeletonRows.map((_, i) => (
            <div key={i} className="h-36 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!isLoading && rules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="size-16 bg-primary/8 rounded-2xl flex items-center justify-center mb-4">
            <LightningIcon weight="duotone" className="size-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1.5">No Upsell Rules Yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Create trigger-based offers to boost average order value by suggesting add-ons at the right moment.
          </p>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} size="lg" className="h-12 px-6 gap-2">
            <PlusIcon weight="bold" className="size-4" />
            Create First Rule
          </Button>
        </div>
      )}

      {/* ── Mobile cards (< md) ──────────────────────────────────────────────── */}
      {!isLoading && rules.length > 0 && (
        <div className="px-4 pb-8 space-y-3 md:hidden">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white rounded-2xl border border-border p-4 space-y-3 shadow-sm">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm leading-tight">{rule.name}</p>
                  <Badge variant="outline" className="text-[10px] font-medium mt-1.5">
                    {triggerLabel(rule)}
                  </Badge>
                </div>
                <Switch
                  checked={rule.isActive}
                  onCheckedChange={() => toggleMutation.mutate(rule.id)}
                />
              </div>

              {/* Offer items */}
              {(rule.targets ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {rule.targets.map((t) => (
                    <Badge key={t.itemId} variant="secondary" className="text-xs">
                      {t.itemName}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Discount + actions */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                {rule.rewardValue > 0 ? (
                  <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                    {rewardLabel(rule)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">No discount</span>
                )}
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-9" onClick={() => openEdit(rule)}>
                    <PencilSimpleIcon className="size-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="size-9 text-destructive hover:text-destructive hover:bg-destructive/5"
                    onClick={() => setDeleteTarget(rule)}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Desktop table (≥ md) ─────────────────────────────────────────────── */}
      {!isLoading && rules.length > 0 && (
        <div className="px-4 pb-8 hidden md:block">
          <div className="rounded-2xl border border-border overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80 border-b border-zinc-200">
                  <TableHead className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">Rule Name</TableHead>
                  <TableHead className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">Trigger</TableHead>
                  <TableHead className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">Offer Items</TableHead>
                  <TableHead className="w-28 text-center font-semibold text-zinc-700 text-xs uppercase tracking-wide">Discount</TableHead>
                  <TableHead className="w-20 text-center font-semibold text-zinc-700 text-xs uppercase tracking-wide">Active</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} className="hover:bg-zinc-50/60 transition-colors">
                    <TableCell className="font-medium text-sm">{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">
                        {triggerLabel(rule)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(rule.targets ?? []).map((t) => (
                          <Badge key={t.itemId} variant="secondary" className="text-xs">
                            {t.itemName}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {rule.rewardValue > 0 ? (
                        <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                          {rewardLabel(rule)}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => toggleMutation.mutate(rule.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(rule)}>
                          <PencilSimpleIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="size-8 text-destructive hover:text-destructive hover:bg-destructive/5"
                          onClick={() => setDeleteTarget(rule)}
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <UpsellRuleFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
          }
          setFormOpen(o);
        }}
        menuItems={menuData}
        categories={categories}
        onSubmit={handleSubmit}
        submitting={submitting}
        initial={editing}
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Upsell Rule"
          message={`Delete rule "${deleteTarget?.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
          onCancel={() => setDeleteTarget(null)}
          pending={deleteMutation.isPending}
        />
      )}
    </>
  );
}
