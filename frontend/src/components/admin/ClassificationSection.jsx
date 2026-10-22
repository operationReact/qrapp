import { useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchClassificationCatalogue,
  fetchItemClassification,
  updateItemClassification,
} from "@/services/classification-service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, UtensilsCrossed } from "lucide-react";
import { useLocation as useActiveLocation } from "@/context/LocationContext";

const ROLE_COLOURS = {
  Primary: "border-orange-400 bg-orange-50 text-orange-700",
  Accompaniment: "border-green-400 bg-green-50 text-green-700",
  Drink: "border-blue-400 bg-blue-50 text-blue-700",
  Dessert: "border-pink-400 bg-pink-50 text-pink-700",
  Addon: "border-zinc-400 bg-zinc-100 text-zinc-700",
};

const TAG_COLOURS = {
  Breakfast: "border-amber-400 bg-amber-50 text-amber-700",
  Lunch: "border-orange-400 bg-orange-50 text-orange-700",
  Dinner: "border-indigo-400 bg-indigo-50 text-indigo-700",
  Snack: "border-lime-400 bg-lime-50 text-lime-700",
  Anytime: "border-gray-400 bg-gray-50 text-gray-700",
  SouthIndian: "border-red-400 bg-red-50 text-red-700",
  NorthIndian: "border-orange-400 bg-orange-50 text-orange-700",
  Chinese: "border-yellow-400 bg-yellow-50 text-yellow-700",
  Italian: "border-green-400 bg-green-50 text-green-700",
  FastFood: "border-pink-400 bg-pink-50 text-pink-700",
  Bakery: "border-amber-400 bg-amber-50 text-amber-700",
  Beverage: "border-blue-400 bg-blue-50 text-blue-700",
  Desserts: "border-purple-400 bg-purple-50 text-purple-700",
  Healthy: "border-lime-400 bg-lime-50 text-lime-700",
};

const CHIP_BASE =
  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const CHIP_IDLE = "border-border bg-background text-muted-foreground hover:bg-muted/60";

function ChipGroup({ options, selected, colourMap, onToggle }) {
  const selectedIds = new Set(selected.map((o) => o.id));
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selectedIds.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            title={opt.description || opt.name}
            onClick={() => onToggle(opt, active)}
            className={cn(CHIP_BASE, active ? (colourMap[opt.name] ?? "border-primary bg-primary/10 text-primary") : CHIP_IDLE)}
          >
            {active && <span className="mr-1.5">✓</span>}
            {opt.name}
          </button>
        );
      })}
    </div>
  );
}
ChipGroup.propTypes = {
  options: PropTypes.array.isRequired,
  selected: PropTypes.array.isRequired,
  colourMap: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const INIT = { comboRole: null, mealTypes: [], cuisineTypes: [], dirty: false };

function classReducer(state, action) {
  switch (action.type) {
    case "LOAD":
      return {
        comboRole: action.payload.comboRole ?? null,
        mealTypes: action.payload.mealTypes ?? [],
        cuisineTypes: action.payload.cuisineTypes ?? [],
        dirty: false,
      };
    case "SET_ROLE":
      return { ...state, comboRole: action.value, dirty: true };
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

function Section({ title, hint, children }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}
Section.propTypes = { title: PropTypes.string.isRequired, hint: PropTypes.string, children: PropTypes.node };

export default function ClassificationSection({ itemId, onChange }) {
  const { activeLocationId } = useActiveLocation();
  const { data: catalogue, isLoading: catalogueLoading } = useQuery({
    queryKey: ["classification-catalogue"],
    queryFn: fetchClassificationCatalogue,
    staleTime: 1000 * 60 * 10,
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["item-classification", activeLocationId, itemId],
    queryFn: () => fetchItemClassification(itemId, activeLocationId),
    enabled: !!itemId && !!activeLocationId,
    staleTime: 1000 * 60 * 2,
  });

  const [state, dispatch] = useReducer(classReducer, INIT);

  useEffect(() => {
    if (existing) dispatch({ type: "LOAD", payload: existing });
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateItemClassification(itemId, {
        comboRoleId: state.comboRole?.id ?? null,
        mealTypeIds: state.mealTypes.map((mt) => mt.id),
        cuisineTypeIds: state.cuisineTypes.map((ct) => ct.id),
      }, activeLocationId),
    onSuccess: (data) => {
      toast.success("Classification saved");
      dispatch({ type: "SAVED" });
      onChange?.(data);
    },
    onError: () => toast.error("Failed to save classification"),
  });

  if (catalogueLoading || existingLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading classification…
      </div>
    );
  }

  const comboRoles = catalogue?.comboRoles ?? [];
  const mealTypeOpts = catalogue?.mealTypes ?? [];
  const cuisineOpts = catalogue?.cuisineTypes ?? [];

  const toggleMulti = (setType) => (opt, active) => {
    const current = setType === "SET_MEAL_TYPES" ? state.mealTypes : state.cuisineTypes;
    dispatch({
      type: setType,
      value: active ? current.filter((o) => o.id !== opt.id) : [...current, opt],
    });
  };

  const toggleRole = (opt, active) => {
    dispatch({ type: "SET_ROLE", value: active ? null : opt });
  };

  const isEmpty = !state.comboRole && state.mealTypes.length === 0 && state.cuisineTypes.length === 0;

  return (
    <div className="space-y-5 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-100">
          <UtensilsCrossed className="size-4 text-purple-600" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Recommendation tags</p>
          <p className="text-[11px] text-muted-foreground">
            Tell the recommendation engine what this item is and when it is eaten. Tap to select, tap again to remove.
          </p>
        </div>
      </div>

      <Section title="1. Combo role" hint="What role does this item play in a meal? Pick one.">
        <ChipGroup
          options={comboRoles}
          selected={state.comboRole ? [state.comboRole] : []}
          colourMap={ROLE_COLOURS}
          onToggle={toggleRole}
        />
      </Section>

      <Section title="2. Meal types" hint="When is this item usually eaten?">
        {mealTypeOpts.length === 0 ? (
          <p className="text-[11px] italic text-muted-foreground">No meal types configured.</p>
        ) : (
          <ChipGroup
            options={mealTypeOpts}
            selected={state.mealTypes}
            colourMap={TAG_COLOURS}
            onToggle={toggleMulti("SET_MEAL_TYPES")}
          />
        )}
      </Section>

      <Section title="3. Cuisine styles" hint="Which cuisine does this item belong to?">
        {cuisineOpts.length === 0 ? (
          <p className="text-[11px] italic text-muted-foreground">No cuisine styles configured.</p>
        ) : (
          <ChipGroup
            options={cuisineOpts}
            selected={state.cuisineTypes}
            colourMap={TAG_COLOURS}
            onToggle={toggleMulti("SET_CUISINE_TYPES")}
          />
        )}
      </Section>

      {isEmpty && (
        <p className="text-[11px] text-muted-foreground">
          Not tagged yet. Items without tags are not suggested by recommendations.
        </p>
      )}

      {state.dirty && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-medium text-amber-700">You have unsaved changes.</p>
          <Button
            type="button"
            size="sm"
            className="w-full gap-2 sm:w-auto"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <><Loader2 className="size-3.5 animate-spin" />Saving…</>
            ) : (
              "Save tags"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

ClassificationSection.propTypes = {
  itemId: PropTypes.number.isRequired,
  onChange: PropTypes.func,
};
