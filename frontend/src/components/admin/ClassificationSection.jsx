import { useEffect, useState, useReducer } from "react";
import PropTypes from "prop-types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchClassificationCatalogue,
  fetchItemClassification,
  updateItemClassification,
} from "@/services/classification-service";
import PairingsSection from "@/components/admin/PairingsSection";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ForkKnifeIcon,
  CoffeeIcon,
  SunIcon,
  GlobeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { Loader2, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── colour maps ──────────────────────────────────────────────────────────────

const ROLE_COLOURS = {
  Primary:       "bg-orange-100 text-orange-700 border-orange-200",
  Accompaniment: "bg-green-100  text-green-700  border-green-200",
  Drink:         "bg-blue-100   text-blue-700   border-blue-200",
  Dessert:       "bg-pink-100   text-pink-700   border-pink-200",
  Addon:         "bg-zinc-100   text-zinc-600   border-zinc-200",
};

const MEAL_COLOURS = {
  Breakfast: "bg-amber-50  text-amber-700  border-amber-200",
  Lunch:     "bg-orange-50 text-orange-700 border-orange-200",
  Dinner:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  Snack:     "bg-lime-50   text-lime-700   border-lime-200",
  Anytime:   "bg-gray-50   text-gray-600   border-gray-200",
};

const CUISINE_COLOURS = {
  SouthIndian: "bg-red-50     text-red-700     border-red-200",
  NorthIndian: "bg-orange-50  text-orange-700  border-orange-200",
  Chinese:     "bg-yellow-50  text-yellow-700  border-yellow-200",
  Italian:     "bg-green-50   text-green-700   border-green-200",
  FastFood:    "bg-pink-50    text-pink-700    border-pink-200",
  Bakery:      "bg-amber-50   text-amber-700   border-amber-200",
  Beverage:    "bg-blue-50    text-blue-700    border-blue-200",
  Desserts:    "bg-purple-50  text-purple-700  border-purple-200",
};

// ─── Chip component ───────────────────────────────────────────────────────────

function Chip({ label, colourClass, onRemove }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
        colourClass || "bg-muted text-muted-foreground border-border"
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full hover:bg-black/10 transition-colors"
          aria-label={`Remove ${label}`}
        >
          <XCircleIcon className="size-3" weight="fill" />
        </button>
      )}
    </span>
  );
}
Chip.propTypes = { label: PropTypes.string, colourClass: PropTypes.string, onRemove: PropTypes.func };

// ─── Multi-select pill row ────────────────────────────────────────────────────

function MultiSelect({ options, selected, onChange, colourMap, placeholder }) {
  const selectedSet = new Set(selected.map((o) => o.id));
  const available = options.filter((o) => !selectedSet.has(o.id));

  const [open, setOpen] = useState(false);

  const add = (opt) => {
    onChange([...selected, opt]);
    setOpen(false);
  };
  const remove = (id) => onChange(selected.filter((o) => o.id !== id));

  return (
    <div className="space-y-1.5">
      {/* Chips row */}
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {selected.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.name}
            colourClass={colourMap?.[opt.name]}
            onRemove={() => remove(opt.id)}
          />
        ))}
        {selected.length === 0 && (
          <span className="text-[11px] text-muted-foreground italic">{placeholder}</span>
        )}
      </div>

      {/* Add button */}
      {available.length > 0 && (
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary border border-primary/30 rounded-lg px-2 py-1 hover:bg-primary/5 transition-colors"
          >
            + Add <ChevronDown className="size-3" />
          </button>
          {open && (
            <div className="absolute z-50 top-full left-0 mt-1 w-44 rounded-xl border border-border bg-popover shadow-lg py-1 text-sm">
              {available.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => add(opt)}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted/60 text-[12px] font-medium transition-colors"
                >
                  {opt.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
MultiSelect.propTypes = {
  options: PropTypes.array.isRequired,
  selected: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  colourMap: PropTypes.object,
  placeholder: PropTypes.string,
};

// ─── Main ClassificationSection ───────────────────────────────────────────────

const INIT = { comboRoleId: null, mealTypes: [], cuisineTypes: [], dirty: false };

function classReducer(state, action) {
  switch (action.type) {
    case "LOAD":
      return {
        comboRoleId: action.payload.comboRole?.id ?? null,
        mealTypes:   action.payload.mealTypes   ?? [],
        cuisineTypes: action.payload.cuisineTypes ?? [],
        dirty: false,
      };
    case "SET_ROLE":
      return { ...state, comboRoleId: action.value, dirty: true };
    case "SET_MEAL_TYPES":
      return { ...state, mealTypes: action.value, dirty: true };
    case "SET_CUISINE_TYPES":
      return { ...state, cuisineTypes: action.value, dirty: true };
    case "SAVED":
      return { ...state, dirty: false };
    default:
      return state;
  }
}

export default function ClassificationSection({ itemId, onChange, showPairings = true }) {
  const { data: catalogue, isLoading: catalogueLoading } = useQuery({
    queryKey: ["classification-catalogue"],
    queryFn: fetchClassificationCatalogue,
    staleTime: 1000 * 60 * 10,
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["item-classification", itemId],
    queryFn: () => fetchItemClassification(itemId),
    enabled: !!itemId,
    staleTime: 1000 * 60 * 2,
  });

  const [state, dispatch] = useReducer(classReducer, INIT);

  useEffect(() => {
    if (existing) dispatch({ type: "LOAD", payload: existing });
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateItemClassification(itemId, {
        comboRoleId:    state.comboRoleId ?? null,
        mealTypeIds:    state.mealTypes.map((mt) => mt.id),
        cuisineTypeIds: state.cuisineTypes.map((ct) => ct.id),
      }),
    onSuccess: (data) => {
      toast.success("Classification saved");
      dispatch({ type: "SAVED" });
      onChange?.(data);
    },
    onError: () => toast.error("Failed to save classification"),
  });

  const isLoading = catalogueLoading || existingLoading;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading classification…
      </div>
    );
  }

  const comboRoles   = catalogue?.comboRoles   ?? [];
  const mealTypeOpts = catalogue?.mealTypes    ?? [];
  const cuisineOpts  = catalogue?.cuisineTypes  ?? [];

  const selectedRoleName = comboRoles.find((r) => r.id === state.comboRoleId)?.name;

  return (
    <div className="space-y-4">
      {/* ── Dimensions 1–3 ── */}
      <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <div className="size-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
          <ForkKnifeIcon weight="fill" className="size-4 text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Meal Recommendation Classification</p>
          <p className="text-[11px] text-muted-foreground">
            Used by the recommendation engine to suggest contextually relevant items.
          </p>
        </div>
      </div>

      {/* ── Dimension 1: Combo Role ── */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <CoffeeIcon weight="duotone" className="size-3.5 text-orange-500" />
          Combo Role
          <span className="text-[10px] font-normal text-muted-foreground">(what role does this item play?)</span>
        </label>
        <div className="flex items-center gap-2">
          <Select
            value={state.comboRoleId ? String(state.comboRoleId) : ""}
            onValueChange={(val) =>
              dispatch({ type: "SET_ROLE", value: val === "" ? null : Number(val) })
            }
          >
            <SelectTrigger className="h-9 text-xs flex-1">
              <SelectValue placeholder="Select a role…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">— None —</SelectItem>
              {comboRoles.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  <div className="flex flex-col">
                    <span className="font-medium">{r.name}</span>
                    {r.description && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                        {r.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRoleName && (
            <Chip label={selectedRoleName} colourClass={ROLE_COLOURS[selectedRoleName]} />
          )}
        </div>
      </div>

      {/* ── Dimension 2: Meal Types ── */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <SunIcon weight="duotone" className="size-3.5 text-amber-500" />
          Meal Types
          <span className="text-[10px] font-normal text-muted-foreground">(when is this item consumed?)</span>
        </label>
        <MultiSelect
          options={mealTypeOpts}
          selected={state.mealTypes}
          colourMap={MEAL_COLOURS}
          placeholder="No meal types assigned"
          onChange={(v) => dispatch({ type: "SET_MEAL_TYPES", value: v })}
        />
      </div>

      {/* ── Dimension 3: Cuisine Types ── */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <GlobeIcon weight="duotone" className="size-3.5 text-blue-500" />
          Cuisine Types
          <span className="text-[10px] font-normal text-muted-foreground">(what cuisine style?)</span>
        </label>
        <MultiSelect
          options={cuisineOpts}
          selected={state.cuisineTypes}
          colourMap={CUISINE_COLOURS}
          placeholder="No cuisine types assigned"
          onChange={(v) => dispatch({ type: "SET_CUISINE_TYPES", value: v })}
        />
      </div>

      {/* ── Save classification button ── */}
      {state.dirty && (
        <Button
          type="button"
          size="sm"
          className="w-full gap-2"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? (
            <><Loader2 className="size-3.5 animate-spin" />Saving…</>
          ) : (
            <><CheckCircleIcon weight="fill" className="size-3.5" />Save Classification</>
          )}
        </Button>
      )}
      </div>

      {/* ── Dimension 4: Recommended Pairings ── */}
      {showPairings && <PairingsSection itemId={itemId} />}
    </div>
  );
}

ClassificationSection.propTypes = {
  itemId:       PropTypes.number.isRequired,
  onChange:     PropTypes.func,
  showPairings: PropTypes.bool,
};

