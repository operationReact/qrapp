import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import PropTypes from "prop-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TrashIcon, PlusIcon, CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import { categoriesOptions } from "@/query/options/menu";
import { menuOptions } from "@/query/options/menu";

const PROMO_TYPES = [
  { value: "COUPON_CODE", label: "Coupon Code", description: "User must enter a code at checkout" },
  { value: "AUTOMATIC_DISCOUNT", label: "Automatic Discount", description: "Applied automatically, no code needed" },
];

const STACK_MODES = [
  { value: "NONE", label: "None", description: "Cannot combine with any other offer" },
  { value: "DELIVERY_ONLY", label: "Exclusive Offer", description: "Can stack with a complimentary offer" },
  { value: "MULTIPLE_ALLOWED", label: "Multiple Allowed", description: "Stacks freely with other promotions" },
];

const REWARD_TYPES = [
  { value: "FLAT_DISCOUNT", label: "Flat Discount (₹ off)" },
  { value: "PERCENTAGE_DISCOUNT", label: "Percentage Discount (% off)" },
  { value: "FREE_DELIVERY", label: "Complimentary Offer" },
];

const RULE_TYPES = [
  { value: "MIN_ORDER_AMOUNT", label: "Minimum Order Amount", paramKey: "minAmount", paramLabel: "Min Amount (₹)", placeholder: "e.g. 299" },
];

const SCOPE_TYPES = [
  { value: "CATEGORY", label: "Category" },
  { value: "MENU_ITEM", label: "Menu Item" },
];

/** Searchable name-based picker — shows names to the user, stores the numeric id */
function ScopePicker({ scopeType, scopeId, onChange }) {
  const [open, setOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    ...categoriesOptions,
    enabled: scopeType === "CATEGORY",
  });

  const { data: menuItems = [] } = useQuery({
    ...menuOptions(),
    enabled: scopeType === "MENU_ITEM",
  });

  const options =
    scopeType === "CATEGORY"
      ? categories.map(c => ({ id: String(c.id), label: c.name }))
      : menuItems.map(m => ({ id: String(m.id), label: m.name }));

  const selected = options.find(o => o.id === String(scopeId));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <span className={selected ? "" : "text-muted-foreground"}>
            {selected ? selected.label : `Select ${scopeType === "CATEGORY" ? "category" : "menu item"}…`}
          </span>
          <CaretUpDownIcon className="size-3 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">No results found.</CommandEmpty>
            <CommandGroup>
              {options.map(opt => (
                <CommandItem
                  key={opt.id}
                  value={opt.label}
                  onSelect={() => { onChange(opt.id); setOpen(false); }}
                  className="text-xs cursor-pointer"
                >
                  <CheckIcon className={`mr-2 size-3 shrink-0 ${String(scopeId) === opt.id ? "opacity-100" : "opacity-0"}`} />
                  <span className="flex-1">{opt.label}</span>
                  <span className="ml-2 text-muted-foreground">#{opt.id}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

ScopePicker.propTypes = {
  scopeType: PropTypes.string.isRequired,
  scopeId:   PropTypes.string.isRequired,
  onChange:  PropTypes.func.isRequired,
};

const DEFAULT_FORM = {
  code: "",
  description: "",
  promoType: "COUPON_CODE",
  stackMode: "NONE",
  startsAt: "",
  expiresAt: "",
  totalUsageLimit: "",
  perUserLimit: "",
  isFirstOrderOnly: false,
  rewardType: "FLAT_DISCOUNT",
  rewardValue: "",
  rewardMaxCap: "",
  rules: [],    // [{ ruleType, paramValue }]
  scopes: [],   // [{ scopeType, scopeId }]
};

function fmt(dt) {
  if (!dt) return "";
  return new Date(dt).toISOString().slice(0, 16);
}

export default function PromotionForm({ initialData, onSubmit, id }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    const next = !initialData
      ? DEFAULT_FORM
      : {
          code:            initialData.code || "",
          title:           initialData.title || "",
          description:     initialData.description || "",
          promoType:       initialData.promoType || "COUPON_CODE",
          stackMode:       initialData.stackMode || "NONE",
          startsAt:        fmt(initialData.startsAt),
          expiresAt:       fmt(initialData.expiresAt),
          totalUsageLimit: initialData.totalUsageLimit?.toString() || "",
          perUserLimit:    initialData.perUserLimit?.toString() || "",
          isFirstOrderOnly: initialData.isFirstOrderOnly || false,
          rewardType:      initialData.rewardType || "FLAT_DISCOUNT",
          rewardValue:     initialData.rewardValue?.toString() || "",
          rewardMaxCap:    initialData.rewardMaxCap?.toString() || "",
          rules:           [],
          scopes:          (initialData.scopes || []).map(s => ({
                             scopeType: s.scopeType,
                             scopeId:   s.scopeId?.toString() || "",
                           })),
        };
    setForm(next);
  }, [initialData]);

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  // ── Rules ──
  const addRule = () => setForm(p => ({ ...p, rules: [...p.rules, { ruleType: "MIN_ORDER_AMOUNT", paramValue: "" }] }));
  const removeRule = (i) => setForm(p => ({ ...p, rules: p.rules.filter((_, idx) => idx !== i) }));
  const updateRule = (i, key, val) => setForm(p => ({
    ...p,
    rules: p.rules.map((r, idx) => idx === i ? { ...r, [key]: val } : r),
  }));

  // ── Scopes ──
  const addScope = () => setForm(p => ({ ...p, scopes: [...p.scopes, { scopeType: "CATEGORY", scopeId: "" }] }));
  const removeScope = (i) => setForm(p => ({ ...p, scopes: p.scopes.filter((_, idx) => idx !== i) }));
  const updateScope = (i, key, val) => setForm(p => ({
    ...p,
    scopes: p.scopes.map((s, idx) => idx === i ? { ...s, [key]: val } : s),
  }));

  // Converts "2026-06-04T10:00" → "2026-06-04T10:00:00" so Spring Boot can parse LocalDateTime
  const toIsoDateTime = (val) => {
    if (!val) return null;
    // datetime-local gives "YYYY-MM-DDTHH:MM", need "YYYY-MM-DDTHH:MM:SS"
    return val.length === 16 ? `${val}:00` : val;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      code:            form.promoType === "AUTOMATIC_DISCOUNT" ? null : (form.code.trim().toUpperCase() || null),
      title:           form.title.trim(),
      description:     form.description.trim() || null,
      promoType:       form.promoType,
      stackMode:       form.stackMode,
      startsAt:        toIsoDateTime(form.startsAt),
      expiresAt:       toIsoDateTime(form.expiresAt),
      totalUsageLimit: form.totalUsageLimit ? parseInt(form.totalUsageLimit) : null,
      perUserLimit:    form.perUserLimit    ? parseInt(form.perUserLimit)    : null,
      isFirstOrderOnly: form.isFirstOrderOnly,
      rules: form.rules
        .filter(r => r.paramValue)
        .map(r => {
          const meta = RULE_TYPES.find(rt => rt.value === r.ruleType);
          return { ruleType: r.ruleType, params: JSON.stringify({ [meta.paramKey]: parseFloat(r.paramValue) }) };
        }),
      scopes: form.scopes
        .filter(s => s.scopeId)
        .map(s => ({ scopeType: s.scopeType, scopeId: parseInt(s.scopeId) })),
      reward: {
        rewardType: form.rewardType,
        value:      parseFloat(form.rewardValue) || 0,
        maxCap:     form.rewardMaxCap ? parseFloat(form.rewardMaxCap) : null,
      },
    };

    onSubmit(payload);
  };

  const isPercentage = form.rewardType === "PERCENTAGE_DISCOUNT";
  const isFreeDelivery = form.rewardType === "FREE_DELIVERY";
  const isAutomatic = form.promoType === "AUTOMATIC_DISCOUNT";

  return (
    <form id={id} onSubmit={handleSubmit} className="space-y-5 px-1">

      {/* ── Promotion Type ── */}
      <div className="space-y-2">
        <Label>Promotion Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {PROMO_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("promoType", t.value)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                form.promoType === t.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stack Mode ── */}
      <div className="space-y-2">
        <div>
          <Label>Stack Mode</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Can this promotion be combined with others at checkout?</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STACK_MODES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("stackMode", t.value)}
              className={`text-left flex-1 min-w-fit rounded-lg border p-3 transition-colors ${
                form.stackMode === t.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Code (only for COUPON_CODE) ── */}
      {!isAutomatic && (
        <div className="space-y-1.5">
          <Label>Coupon Code <span className="text-destructive">*</span></Label>
          <Input
            value={form.code}
            onChange={e => set("code", e.target.value.toUpperCase())}
            placeholder="e.g. SAVE120"
            required={!isAutomatic}
            className="font-mono uppercase"
          />
          <p className="text-xs text-muted-foreground">Short, memorable code. Uppercase only.</p>
        </div>
      )}

      {/* ── Title & Description ── */}
      <div className="space-y-1.5">
        <Label>Title <span className="text-destructive">*</span></Label>
        <Input
          value={form.title}
          onChange={e => set("title", e.target.value)}
          placeholder="e.g. Save ₹120 on orders above ₹499"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Shown to the user in the coupon drawer"
          rows={2}
          className="resize-none"
        />
      </div>

      {/* ── Reward ── */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-sm font-medium">Reward</p>
        <div className="space-y-1.5">
          <Label>Reward Type</Label>
          <Select value={form.rewardType} onValueChange={v => set("rewardType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REWARD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {!isFreeDelivery && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isPercentage ? "Percentage (0–100)" : "Flat Amount (₹)"} <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="0"
                max={isPercentage ? "100" : undefined}
                step="0.01"
                value={form.rewardValue}
                onChange={e => set("rewardValue", e.target.value)}
                placeholder={isPercentage ? "e.g. 20" : "e.g. 120"}
                required
              />
            </div>
            {isPercentage && (
              <div className="space-y-1.5">
                <Label>Max Discount Cap (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rewardMaxCap}
                  onChange={e => set("rewardMaxCap", e.target.value)}
                  placeholder="e.g. 100 (optional)"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Rules ── */}
      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Rules</p>
          <Button type="button" variant="outline" size="sm" onClick={addRule}>
            <PlusIcon className="size-3.5" /> Add Rule
          </Button>
        </div>

        {/* First-order flag as a quick toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="firstOrder"
            checked={form.isFirstOrderOnly}
            onCheckedChange={v => set("isFirstOrderOnly", v)}
          />
          <Label htmlFor="firstOrder" className="text-sm font-normal cursor-pointer">
            First order only
          </Label>
        </div>

        {form.rules.map((rule, i) => {
          const meta = RULE_TYPES.find(r => r.value === rule.ruleType) || RULE_TYPES[0];
          return (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Rule Type</Label>
                <Select value={rule.ruleType} onValueChange={v => updateRule(i, "ruleType", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">{meta.paramLabel}</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={meta.placeholder}
                  value={rule.paramValue}
                  onChange={e => updateRule(i, "paramValue", e.target.value)}
                />
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRule(i)}>
                <TrashIcon className="size-3.5" />
              </Button>
            </div>
          );
        })}
        {form.rules.length === 0 && (
          <p className="text-xs text-muted-foreground">No rules — promotion applies to all carts. Add a rule to restrict.</p>
        )}
      </div>

      {/* ── Scopes ── */}
      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Targeting (Scopes)</p>
            <p className="text-xs text-muted-foreground">Restrict this promotion to specific categories or items. Leave empty to apply to everything.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addScope}>
            <PlusIcon className="size-3.5" /> Add Scope
          </Button>
        </div>
        {form.scopes.map((scope, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="w-36 space-y-1 shrink-0">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={scope.scopeType} onValueChange={v => updateScope(i, "scopeType", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">
                {scope.scopeType === "CATEGORY" ? "Category" : "Menu Item"}
              </Label>
              <ScopePicker
                scopeType={scope.scopeType}
                scopeId={scope.scopeId}
                onChange={val => updateScope(i, "scopeId", val)}
              />
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeScope(i)}>
              <TrashIcon className="size-3.5" />
            </Button>
          </div>
        ))}
        {form.scopes.length === 0 && (
          <p className="text-xs text-muted-foreground">No scopes — applies to all categories and items.</p>
        )}
      </div>

      {/* ── Validity & Limits ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Starts At</Label>
          <Input type="datetime-local" value={form.startsAt} onChange={e => set("startsAt", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Expires At</Label>
          <Input type="datetime-local" value={form.expiresAt} onChange={e => set("expiresAt", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Total Usage Limit</Label>
          <Input type="number" min="1" value={form.totalUsageLimit} onChange={e => set("totalUsageLimit", e.target.value)} placeholder="Unlimited" />
        </div>
        <div className="space-y-1.5">
          <Label>Per-User Limit</Label>
          <Input type="number" min="1" value={form.perUserLimit} onChange={e => set("perUserLimit", e.target.value)} placeholder="Unlimited" />
        </div>
      </div>

    </form>
  );
}

PromotionForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit:    PropTypes.func.isRequired,
  id:          PropTypes.string,
};
