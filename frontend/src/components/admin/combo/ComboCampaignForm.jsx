import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { categoriesOptions } from "@/query/options/menu";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";

const DISCOUNT_TYPES = [
  { value: "PERCENTAGE", label: "%" },
  { value: "FIXED", label: "₹" },
];

function TierRow({ tier, index, onChange, onRemove, isLast }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-2.5">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">
          {index + 1}. ≥ items
        </span>
        <Input
          type="number"
          min={2}
          value={tier.minItems}
          onChange={(e) => onChange(index, "minItems", Number(e.target.value))}
          className="w-16 h-8 text-center text-sm"
          placeholder="2"
        />
        <span className="text-xs text-muted-foreground">→</span>
        <Input
          type="number"
          min={0.01}
          step={0.01}
          value={tier.discountValue}
          onChange={(e) => onChange(index, "discountValue", e.target.value)}
          className="w-20 h-8 text-center text-sm"
          placeholder="5"
        />
        <select
          value={tier.discountType}
          onChange={(e) => onChange(index, "discountType", e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          {DISCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <Input
          value={tier.tierLabel ?? ""}
          onChange={(e) => onChange(index, "tierLabel", e.target.value)}
          className="flex-1 h-8 text-sm"
          placeholder='Label e.g. "5% OFF"'
        />
      </div>
      {!isLast || index > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(index)}
          className="text-destructive hover:text-destructive shrink-0"
        >
          <TrashIcon className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

export default function ComboCampaignForm({ initialData, onSubmit, submitting }) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [startsAt, setStartsAt] = useState(initialData?.startsAt ? new Date(initialData.startsAt).toISOString().slice(0, 16) : "");
  const [endsAt, setEndsAt] = useState(initialData?.endsAt ? new Date(initialData.endsAt).toISOString().slice(0, 16) : "");
  const displayPriority = initialData?.displayPriority ?? 0;

  const [tiers, setTiers] = useState(
    initialData?.tiers?.length > 0
      ? initialData.tiers.map((t) => ({
          minItems: t.minItems,
          discountType: t.discountType,
          discountValue: t.discountValue,
          tierLabel: t.tierLabel ?? "",
        }))
      : [
          { minItems: 2, discountType: "PERCENTAGE", discountValue: 5, tierLabel: "5% OFF" },
          { minItems: 3, discountType: "PERCENTAGE", discountValue: 10, tierLabel: "10% OFF" },
          { minItems: 4, discountType: "PERCENTAGE", discountValue: 15, tierLabel: "15% OFF" },
          { minItems: 5, discountType: "PERCENTAGE", discountValue: 20, tierLabel: "20% OFF" },
        ]
  );

  const [eligibleCategoryIds, setEligibleCategoryIds] = useState(
    initialData?.eligibleCategoryIds ?? []
  );

  const { data: categories = [] } = useQuery(categoriesOptions);

  const handleTierChange = (idx, key, value) => {
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
  };

  const addTier = () => {
    const lastMin = tiers[tiers.length - 1]?.minItems ?? 1;
    setTiers((prev) => [
      ...prev,
      { minItems: lastMin + 1, discountType: "PERCENTAGE", discountValue: "", tierLabel: "" },
    ]);
  };

  const removeTier = (idx) => {
    setTiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleCategory = (id) => {
    setEligibleCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (tiers.length === 0) return;

    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      displayPriority: Number(displayPriority),
      tiers: tiers.map((t) => ({
        minItems: Number(t.minItems),
        discountType: t.discountType,
        discountValue: Number(t.discountValue),
        tierLabel: t.tierLabel || null,
      })),
      eligibleCategoryIds,
      eligibleMenuItemIds: [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic info */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="camp-name">Campaign Name *</Label>
          <Input
            id="camp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Build Your Meal & Save"'
            required
          />
        </div>
        <div>
          <Label htmlFor="camp-desc">Description</Label>
          <Textarea
            id="camp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more items to unlock bigger discounts"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Starts At</Label>
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <Label>Ends At</Label>
            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Discount tiers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Discount Ladder *</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addTier} className="gap-1">
            <PlusIcon className="size-3.5" /> Add Tier
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Items ≥ threshold → unlock that discount. Example: 2 items → 5%, 3 items → 10%
        </p>
        {tiers.map((tier, idx) => (
          <TierRow
            key={idx}
            tier={tier}
            index={idx}
            onChange={handleTierChange}
            onRemove={removeTier}
            isLast={idx === tiers.length - 1}
          />
        ))}
      </div>

      {/* Category eligibility */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Eligible Categories</Label>
        <p className="text-xs text-muted-foreground">
          Leave blank to make all items eligible. Select specific categories to restrict.
        </p>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border rounded-xl p-2">
          {categories.length === 0 && (
            <span className="text-xs text-muted-foreground">Loading categories…</span>
          )}
          {categories.map((cat) => {
            const selected = eligibleCategoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selected
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {selected ? "✓ " : ""}{cat.name}
              </button>
            );
          })}
        </div>
        {eligibleCategoryIds.length > 0 && (
          <p className="text-xs text-emerald-700 font-medium">
            {eligibleCategoryIds.length} category(s) selected
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting || !name.trim() || tiers.length === 0}>
          {submitting ? "Saving…" : initialData ? "Update Campaign" : "Create Campaign"}
        </Button>
      </div>
    </form>
  );
}

