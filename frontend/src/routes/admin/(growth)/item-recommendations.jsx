import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import PairingsSection from "@/components/admin/PairingsSection";
import { fetchItemClassification } from "@/services/classification-service";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { apiClient, baseURL } from "@/services";
import { cn } from "@/lib/utils";
import {
  MagnifyingGlassIcon,
  ArrowRightIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";

// ── Classification chip colours (mirrors ClassificationSection.jsx) ───────────

const MEAL_CHIP = {
  Breakfast: "bg-amber-50  text-amber-700  border-amber-200",
  Lunch:     "bg-orange-50 text-orange-700 border-orange-200",
  Dinner:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  Snack:     "bg-lime-50   text-lime-700   border-lime-200",
  Anytime:   "bg-gray-50   text-gray-600   border-gray-200",
};
const CUISINE_CHIP = {
  SouthIndian: "bg-red-50    text-red-700    border-red-200",
  NorthIndian: "bg-orange-50 text-orange-700 border-orange-200",
  Chinese:     "bg-yellow-50 text-yellow-700 border-yellow-200",
  Italian:     "bg-green-50  text-green-700  border-green-200",
  FastFood:    "bg-pink-50   text-pink-700   border-pink-200",
  Bakery:      "bg-amber-50  text-amber-700  border-amber-200",
  Beverage:    "bg-blue-50   text-blue-700   border-blue-200",
  Desserts:    "bg-purple-50 text-purple-700 border-purple-200",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${baseURL}${url}`;
}

function getCategoryName(item) {
  if (item.categoryName) return item.categoryName;
  if (!item.category) return "Uncategorised";
  if (typeof item.category === "string") return item.category;
  return item.category?.name ?? "Uncategorised";
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({ item, onClick }) {
  const src = resolveImg(item.imageUrl);

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-50/60 transition-colors group"
    >
      {/* Thumbnail */}
      <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
        {src ? (
          <img src={src} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300 text-base">
            🍽️
          </div>
        )}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">{item.name}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">
          {item.isVeg ? "🟢 Veg" : "🔴 Non-veg"}
          {getCategoryName(item) !== "Uncategorised" ? ` · ${getCategoryName(item)}` : ""}
          {item.available === false ? " · Unavailable" : ""}
        </p>
      </div>

      {/* CTA */}
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-500 group-hover:text-orange-600 shrink-0 transition-colors">
        Manage
        <ArrowRightIcon className="size-3" weight="bold" />
      </span>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ItemPairingsPage() {
  const [search, setSearch]         = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  // Full menu list
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["menu", "admin-item-recs"],
    queryFn: () => apiClient.get("/menu").then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  });

  // Classification of the currently-open item — powers the quality context strip
  const { data: itemClassification } = useQuery({
    queryKey: ["item-classification", selectedItem?.id],
    queryFn:  () => fetchItemClassification(selectedItem.id),
    enabled:  !!selectedItem?.id,
    staleTime: 1000 * 60 * 5,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((i) => i.name?.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      const key = getCategoryName(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const hasMealContext  = !!itemClassification?.mealTypes?.length;
  const hasCuisineCtx  = !!itemClassification?.cuisineTypes?.length;
  const hasAnyContext   = hasMealContext || hasCuisineCtx;

  return (
    <div className="px-4 pt-6 pb-8 space-y-5">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[28px] leading-tight">
          Item Pairings
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xl leading-relaxed">
          Curate Drinks, Sides, Desserts, and Addons for each item. When a customer adds an item to their cart these pairings appear as &ldquo;Goes Well With&rdquo; suggestions.
        </p>
      </div>

      {/* Info strip */}
      <div className="flex flex-wrap gap-2 text-xs">
        <div className="inline-flex items-center gap-1.5 border rounded-full px-3 py-1 font-medium bg-orange-50 text-orange-700 border-orange-200">
          <span>{items.length} total items</span>
        </div>
        <div className="inline-flex items-center gap-1.5 border rounded-full px-3 py-1 font-normal bg-zinc-50 text-zinc-500 border-zinc-200">
          Organised by type: Drink · Side · Dessert · Addon
        </div>
        <div className="inline-flex items-center gap-1.5 border rounded-full px-3 py-1 font-normal bg-zinc-50 text-zinc-500 border-zinc-200">
          Drag cards to reorder within each type
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="pl-9"
        />
      </div>

      {/* Item list */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" />
          Loading menu items…
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">No items found.</p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([category, catItems]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                {category}{" "}
                <span className="font-normal text-zinc-400 normal-case">
                  ({catItems.length})
                </span>
              </p>

              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm divide-y divide-zinc-100">
                {catItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onClick={setSelectedItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Side sheet ── */}
      <Sheet
        open={!!selectedItem}
        onOpenChange={(open) => { if (!open) setSelectedItem(null); }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col overflow-y-auto gap-0 p-0"
        >
          {selectedItem && (
            <>
              {/* Sheet header */}
              <SheetHeader className="px-5 py-4 border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 shrink-0">
                    {resolveImg(selectedItem.imageUrl) ? (
                      <img
                        src={resolveImg(selectedItem.imageUrl)}
                        alt={selectedItem.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">
                        🍽️
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-base leading-tight truncate">
                      {selectedItem.name}
                    </SheetTitle>
                    <SheetDescription className="text-xs mt-0.5">
                      {getCategoryName(selectedItem)}
                      {" · "}
                      {selectedItem.isVeg ? "🟢 Veg" : "🔴 Non-veg"}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* ── Classification quality context ── */}
              <div className="px-5 pt-4 pb-0 space-y-2.5">
                {/* How it works hint */}
                <div className="rounded-lg bg-orange-50 border border-orange-100 px-3 py-2.5 text-[11px] text-orange-700 leading-relaxed">
                  <strong>How this works:</strong> When a customer adds{" "}
                  <span className="font-semibold">{selectedItem.name}</span> to their cart,
                  the pairings below appear as "Goes Well With" suggestions, grouped by type.
                </div>

                {/* Meal context chips */}
                {hasMealContext && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide shrink-0">
                      Meal
                    </span>
                    {itemClassification.mealTypes.map((mt) => (
                      <span
                        key={mt.id}
                        className={cn(
                          "inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border",
                          MEAL_CHIP[mt.name] ?? "bg-gray-50 text-gray-600 border-gray-200",
                        )}
                      >
                        {mt.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Cuisine context chips */}
                {hasCuisineCtx && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide shrink-0">
                      Cuisine
                    </span>
                    {itemClassification.cuisineTypes.map((ct) => (
                      <span
                        key={ct.id}
                        className={cn(
                          "inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border",
                          CUISINE_CHIP[ct.name] ?? "bg-gray-50 text-gray-600 border-gray-200",
                        )}
                      >
                        {ct.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Warning if no classification set */}
                {itemClassification && !hasAnyContext && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
                    <WarningCircleIcon weight="fill" className="size-3.5 shrink-0" />
                    No meal or cuisine type set — pairing quality cannot be evaluated.
                    Set classification on the Classification page.
                  </div>
                )}
              </div>

              {/* Pairings section */}
              <div className="px-5 py-5 flex-1">
                <PairingsSection
                  key={selectedItem.id}
                  itemId={selectedItem.id}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Route export at the bottom — component must be declared before Route so the
// TanStack Router Vite plugin can resolve it statically at build time.
export const Route = createFileRoute("/admin/(growth)/item-recommendations")({
  component: ItemPairingsPage,
});
