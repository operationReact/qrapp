import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recommendationRulesOptions, ruleStatsOptions } from "@/query/options/recommendations";
import { menuOptions, categoriesOptions } from "@/query/options/menu";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import {
  createRecommendationRule,
  updateRecommendationRule,
  deleteRecommendationRule,
  toggleRecommendationRule,
  getCartRecommendations,
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

export const Route = createFileRoute("/admin/(growth)/cart-rules")({
  component: AdminCartRulesPage,
});

const QUERY_KEY = ["growth", "recommendation-rules"];

const EMPTY_FORM = {
  name: "",
  triggerType: "ITEM_IN_CART",
  triggerItemId: "",
  triggerCategoryId: "",
  minCartValue: "",
  targetType: "ITEM",
  targetItemId: "",
  targetCategoryId: "",
  mealRole: "NONE",
  rewardType: "FIXED_DISCOUNT",
  rewardValue: "",
  priority: "0",
  isActive: true,
};

const toFormState = (rule) => ({
  name: rule.name ?? "",
  triggerType: rule.triggerType ?? "ITEM_IN_CART",
  triggerItemId: rule.triggerItemId ? String(rule.triggerItemId) : "",
  triggerCategoryId: rule.triggerCategoryId ? String(rule.triggerCategoryId) : "",
  minCartValue: rule.minCartValue ? String(rule.minCartValue) : "",
  targetType: rule.targetCategoryId ? "CATEGORY" : "ITEM",
  targetItemId: rule.targetItemId ? String(rule.targetItemId) : "",
  targetCategoryId: rule.targetCategoryId ? String(rule.targetCategoryId) : "",
  mealRole: rule.mealRole ?? "NONE",
  rewardType: rule.rewardType ?? "FIXED_DISCOUNT",
  rewardValue: rule.rewardValue != null ? String(rule.rewardValue) : "",
  priority: String(rule.priority ?? 0),
  isActive: rule.isActive ?? true,
});

function CartRuleFormDialog({ onOpenChange, menuItems, categories, onSubmit, submitting, initial }) {
  const [form, setForm] = useState(initial ? toFormState(initial) : EMPTY_FORM);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const offerItem = form.targetType === "ITEM";
    const isMealRule = form.triggerType === "ITEM_IN_CART" && offerItem && form.mealRole !== "NONE";
    onSubmit({
      name: form.name,
      triggerType: form.triggerType,
      triggerItemId: form.triggerType === "ITEM_IN_CART" ? Number(form.triggerItemId) : null,
      triggerCategoryId: form.triggerType === "CATEGORY_IN_CART" ? Number(form.triggerCategoryId) : null,
      minCartValue: form.triggerType === "CART_VALUE_EXCEEDS" ? Number(form.minCartValue) : null,
      targetItemId: offerItem ? Number(form.targetItemId) : null,
      targetCategoryId: offerItem ? null : Number(form.targetCategoryId),
      mealRole: isMealRule ? form.mealRole : null,
      rewardType: form.rewardType,
      rewardValue: Number(form.rewardValue || 0),
      priority: Number(form.priority || 0),
      isActive: form.isActive,
    });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Cart Rule" : "New Cart Rule"}</DialogTitle>
          <DialogDescription>
            When the cart meets the trigger, offer one item with a discount.
          </DialogDescription>
        </DialogHeader>
        <form
          id="cart-rule-form"
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
            <Select value={form.triggerType} onValueChange={(v) => set("triggerType", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ITEM_IN_CART">Specific Item in Cart</SelectItem>
                <SelectItem value="CATEGORY_IN_CART">Category in Cart</SelectItem>
                <SelectItem value="CART_VALUE_EXCEEDS">Cart Total Exceeds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.triggerType === "ITEM_IN_CART" && (
            <div className="space-y-2">
              <Label>Trigger Item</Label>
              <Select value={form.triggerItemId} onValueChange={(v) => set("triggerItemId", v)}>
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
              <Select value={form.triggerCategoryId} onValueChange={(v) => set("triggerCategoryId", v)}>
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

          <div className="space-y-2">
            <Label>Offer</Label>
            <Select value={form.targetType} onValueChange={(v) => set("targetType", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ITEM">A specific item</SelectItem>
                <SelectItem value="CATEGORY">Any item from a category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.targetType === "ITEM" ? (
            <div className="space-y-2">
              <Label>Item to Offer</Label>
              <Select value={form.targetItemId} onValueChange={(v) => set("targetItemId", v)}>
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
          ) : (
            <div className="space-y-2">
              <Label>Category to Offer From</Label>
              <Select value={form.targetCategoryId} onValueChange={(v) => set("targetCategoryId", v)}>
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

          {form.triggerType === "ITEM_IN_CART" && form.targetType === "ITEM" && (
            <div className="space-y-2">
              <Label>Meal Role</Label>
              <Select value={form.mealRole} onValueChange={(v) => set("mealRole", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not a meal companion (normal suggestion)</SelectItem>
                  <SelectItem value="DRINK">Drink — shown in Complete Your Meal</SelectItem>
                  <SelectItem value="SIDE">Side — shown in Complete Your Meal</SelectItem>
                  <SelectItem value="DESSERT">Dessert — shown in Complete Your Meal</SelectItem>
                  <SelectItem value="ADDON">Addon — shown in Complete Your Meal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={form.rewardType} onValueChange={(v) => set("rewardType", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED_DISCOUNT">Flat ₹ Discount</SelectItem>
                  <SelectItem value="PERCENT_DISCOUNT">% Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{form.rewardType === "PERCENT_DISCOUNT" ? "Discount (%)" : "Discount (₹)"}</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={form.rewardValue}
                onChange={(e) => set("rewardValue", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="cart-rule-active" checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
            <Label htmlFor="cart-rule-active">Active</Label>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button form="cart-rule-form" type="submit" disabled={submitting}>
            {submitting ? "Saving…" : initial ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RulePreviewDialog({ onOpenChange, menuItems, rules, locationId }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);

  const previewMutation = useMutation({
    mutationFn: getCartRecommendations,
    onSuccess: setResult,
  });

  const picked = menuItems.filter((m) => selected.includes(m.id));
  const cartTotal = picked.reduce((sum, m) => sum + Number(m.price ?? 0), 0);
  const visible = menuItems.filter((m) =>
    m.name?.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const toggle = (id) => {
    setResult(null);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const runPreview = () =>
    previewMutation.mutate({
      itemIds: selected,
      categoryIds: [...new Set(picked.map((m) => m.category?.id).filter(Boolean))],
      cartTotal,
      maxResults: 8,
      locationId,
    });

  const sourceLabel = (s) => {
    if (s.ruleId) return rules.find((r) => r.id === s.ruleId)?.name ?? "Cart rule";
    return { AUTO: "Frequently bought together", BEST_SELLER: "Best seller", MANUAL: "Cart rule", UPSELL: "Cart rule" }[s.source] ?? s.source;
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview cart suggestions</DialogTitle>
          <DialogDescription>
            Pick the items a customer might add. You will see the suggestions the cart engine returns and which rule produced each one.
            Complete-meal and bundle cards take priority in the live cart, so they are not shown here.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Menu items</Label>
            <Input placeholder="Search items" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="h-64 overflow-y-auto rounded-xl border border-border divide-y">
              {visible.map((m) => (
                <label key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={selected.includes(m.id)}
                    onChange={() => toggle(m.id)}
                  />
                  <span className="flex-1 truncate">{m.name}</span>
                  <span className="text-muted-foreground tabular-nums">₹{m.price}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preview cart ({picked.length})</Label>
            <div className="h-64 overflow-y-auto rounded-xl border border-border bg-zinc-50 p-3 space-y-3">
              {picked.length === 0 && (
                <p className="text-sm text-muted-foreground">Select items on the left.</p>
              )}
              {picked.map((m) => (
                <div key={m.id} className="flex justify-between text-sm">
                  <span className="truncate">{m.name}</span>
                  <span className="tabular-nums">₹{m.price}</span>
                </div>
              ))}
              {picked.length > 0 && (
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                  <span>Total</span>
                  <span className="tabular-nums">₹{cartTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
            <Button className="w-full" onClick={runPreview} disabled={picked.length === 0 || previewMutation.isPending}>
              {previewMutation.isPending ? "Checking…" : "Show suggestions"}
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-2">
            <Label>Suggestions for this cart</Label>
            {result.suggestions?.length === 0 && (
              <p className="text-sm text-muted-foreground">No suggestions. Check that the rule trigger matches these items.</p>
            )}
            <div className="divide-y rounded-xl border border-border">
              {result.suggestions?.map((s) => (
                <div key={s.itemId} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="flex-1 font-medium truncate">{s.itemName}</span>
                  <span className="tabular-nums text-muted-foreground">₹{s.price}</span>
                  {s.discountLabel && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                      {s.discountLabel}
                    </span>
                  )}
                  <Badge variant="outline" className="text-[11px]">{sourceLabel(s)}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminCartRulesPage() {
  const queryClient = useQueryClient();
  const { activeLocationId } = useActiveLocation();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: rules = [], isLoading } = useQuery(recommendationRulesOptions(activeLocationId));
  const { data: ruleStats = [] } = useQuery(ruleStatsOptions(activeLocationId));
  const { data: menuData = [] } = useQuery(menuOptions());
  const { data: categories = [] } = useQuery(categoriesOptions());
  const statFor = (ruleId) => ruleStats.find((s) => s.ruleId === ruleId);

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: createRecommendationRule,
    onSuccess: () => {
      setFormOpen(false);
      refresh();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateRecommendationRule(id, data),
    onSuccess: () => {
      setEditing(null);
      setFormOpen(false);
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecommendationRule,
    onSuccess: () => {
      setDeleteTarget(null);
      refresh();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleRecommendationRule,
    onSuccess: refresh,
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

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (rule) => {
    setEditing(rule);
    setFormOpen(true);
  };

  const triggerLabel = (r) => {
    if (r.triggerType === "ITEM_IN_CART") return `Item: ${r.triggerItemName ?? "—"}`;
    if (r.triggerType === "CATEGORY_IN_CART") return `Category: ${r.triggerCategoryName ?? "—"}`;
    if (r.triggerType === "CART_VALUE_EXCEEDS") return `Cart ≥ ₹${r.minCartValue}`;
    return r.triggerType;
  };

  const targetLabel = (r) =>
    r.targetItemName ?? (r.targetCategoryName ? `Any: ${r.targetCategoryName}` : "—");

  const rewardLabel = (r) =>
    r.rewardType === "PERCENT_DISCOUNT" ? `${r.rewardValue}% off` : `₹${r.rewardValue} off`;

  const rewardBadge = (r) =>
    Number(r.rewardValue) > 0 ? (
      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
        {rewardLabel(r)}
      </span>
    ) : (
      <span className="text-xs text-muted-foreground">No discount</span>
    );

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[28px] leading-tight">
            Cart Rules
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
            Trigger-based offers: &quot;If customer adds Burger, offer Fries with ₹30 off&quot;.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="lg" className="h-12 px-5" onClick={() => setPreviewOpen(true)}>
            Preview
          </Button>
          <Button onClick={openNew} size="lg" className="h-12 px-5 gap-2">
            <PlusIcon weight="bold" className="size-4" /> New Rule
          </Button>
        </div>
      </div>

      {/* ── Loading skeletons ────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="px-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
          <h3 className="text-lg font-semibold text-foreground mb-1.5">No Cart Rules Yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Create trigger-based offers to boost average order value by suggesting add-ons at the right moment.
          </p>
          <Button onClick={openNew} size="lg" className="h-12 px-6 gap-2">
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm leading-tight">{rule.name}</p>
                  <Badge variant="outline" className="text-[10px] font-medium mt-1.5">
                    {triggerLabel(rule)}
                  </Badge>
                </div>
                <Switch checked={rule.isActive} onCheckedChange={() => toggleMutation.mutate(rule.id)} />
              </div>

              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  Offer: {targetLabel(rule)}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                {rewardBadge(rule)}
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
                  <TableHead className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">Offer Item</TableHead>
                  <TableHead className="w-28 text-center font-semibold text-zinc-700 text-xs uppercase tracking-wide">Discount</TableHead>
                  <TableHead className="w-20 text-center font-semibold text-zinc-700 text-xs uppercase tracking-wide">Shown</TableHead>
                  <TableHead className="w-20 text-center font-semibold text-zinc-700 text-xs uppercase tracking-wide">Added</TableHead>
                  <TableHead className="w-20 text-center font-semibold text-zinc-700 text-xs uppercase tracking-wide">Rate</TableHead>
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
                      <Badge variant="secondary" className="text-xs">
                        {targetLabel(rule)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{rewardBadge(rule)}</TableCell>
                    <TableCell className="text-center text-sm tabular-nums">{statFor(rule.id)?.views ?? 0}</TableCell>
                    <TableCell className="text-center text-sm tabular-nums">{statFor(rule.id)?.acceptances ?? 0}</TableCell>
                    <TableCell className="text-center text-sm tabular-nums">
                      {statFor(rule.id)?.acceptanceRate != null ? `${Number(statFor(rule.id).acceptanceRate).toFixed(0)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={rule.isActive} onCheckedChange={() => toggleMutation.mutate(rule.id)} />
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

      {previewOpen && (
        <RulePreviewDialog
          onOpenChange={setPreviewOpen}
          menuItems={menuData}
          rules={rules}
          locationId={activeLocationId}
        />
      )}

      {formOpen && (
        <CartRuleFormDialog
          key={editing?.id ?? "new"}
          onOpenChange={(o) => {
            if (!o) {
              setEditing(null);
              setFormOpen(false);
            }
          }}
          menuItems={menuData}
          categories={categories}
          onSubmit={handleSubmit}
          submitting={submitting}
          initial={editing}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Cart Rule"
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
