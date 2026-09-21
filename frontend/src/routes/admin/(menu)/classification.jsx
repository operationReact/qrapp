import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import AdminHeader from "@/components/admin/AdminHeader";
import ClassificationSection from "@/components/admin/ClassificationSection";
import PairingsSection from "@/components/admin/PairingsSection";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ForkKnifeIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${baseURL}${url}`;
}

// item.category can be a plain string OR an object {id, name, ...}
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
        <p className="text-[11px] text-zinc-400">
          {item.isVeg ? "🟢 Veg" : "🔴 Non-veg"}
          {getCategoryName(item) !== "Uncategorised" ? ` · ${getCategoryName(item)}` : ""}
          {item.available === false ? " · Unavailable" : ""}
        </p>
      </div>

      {/* CTA */}
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-500 group-hover:text-orange-600 shrink-0 transition-colors">
        Edit
        <ArrowRightIcon className="size-3" weight="bold" />
      </span>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ClassificationManagementPage() {
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["menu", "admin-classify", JSON.parse(localStorage.getItem("active-location") || "null")?.id],
    queryFn: () => apiClient.get("/menu", { params: { locationId: JSON.parse(localStorage.getItem("active-location") || "null")?.id } }).then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name?.toLowerCase().includes(q));
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

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <AdminHeader
        title="Recommendation Setup"
        description="Per-item: set Combo Role, Meal Types, and Cuisine Types — then configure Drink, Side, Dessert and Addon pairings. All changes power the smart recommendation engine."
        icon={<ForkKnifeIcon weight="duotone" className="size-5 text-orange-500" />}
      />

      {/* Info strip */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { label: "Combo Role",    example: "Primary · Drink · Dessert · Addon",     color: "bg-orange-50 text-orange-700 border-orange-200" },
          { label: "Meal Types",    example: "Breakfast · Lunch · Dinner · Snack",     color: "bg-amber-50  text-amber-700  border-amber-200" },
          { label: "Cuisine Types", example: "South Indian · North Indian · Chinese",  color: "bg-blue-50   text-blue-700   border-blue-200" },
          { label: "Pairings",      example: "Drink · Side · Dessert · Addon",         color: "bg-green-50  text-green-700  border-green-200" },
        ].map(({ label, example, color }) => (
          <div key={label} className={cn("inline-flex items-center gap-1.5 border rounded-full px-3 py-1 font-medium", color)}>
            <span>{label}</span>
            <span className="font-normal opacity-70">— {example}</span>
          </div>
        ))}
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
              {/* Category label */}
              <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                {category}{" "}
                <span className="font-normal text-zinc-400 normal-case">({catItems.length})</span>
              </p>

              {/* Card */}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm divide-y divide-zinc-100">
                {catItems.map((item) => (
                  <ItemRow key={item.id} item={item} onClick={setSelectedItem} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Classification side sheet ── */}
      <Sheet
        open={!!selectedItem}
        onOpenChange={(open) => { if (!open) setSelectedItem(null); }}
      >
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden">
          {selectedItem && (
            <Tabs defaultValue="classification" className="flex flex-col h-full">

              {/* ── Fixed header ─────────────────────────────────────────── */}
              <div className="shrink-0 border-b border-zinc-100">
                {/* Item info */}
                <SheetHeader className="px-5 pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-100 shrink-0">
                      {resolveImg(selectedItem.imageUrl) ? (
                        <img
                          src={resolveImg(selectedItem.imageUrl)}
                          alt={selectedItem.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
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

                {/* Tab bar */}
                <TabsList variant="line" className="px-5 w-full justify-start gap-4 rounded-none bg-transparent border-0 pb-0">
                  <TabsTrigger value="classification" className="flex items-center gap-1.5 pb-2.5 text-xs font-medium">
                    <ForkKnifeIcon className="size-3.5" weight="duotone" />
                    Classification
                  </TabsTrigger>
                  <TabsTrigger value="pairings" className="flex items-center gap-1.5 pb-2.5 text-xs font-medium">
                    <LinkSimpleIcon className="size-3.5" weight="duotone" />
                    Pairings
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── Scrollable tab panels ─────────────────────────────────── */}
              <TabsContent
                value="classification"
                className="flex-1 overflow-y-auto px-5 py-5 m-0"
              >
                <ClassificationSection
                  key={selectedItem.id}
                  itemId={selectedItem.id}
                  showPairings={false}
                />
              </TabsContent>

              <TabsContent
                value="pairings"
                className="flex-1 overflow-y-auto px-5 py-5 m-0"
              >
                <PairingsSection
                  key={selectedItem.id}
                  itemId={selectedItem.id}
                />
              </TabsContent>

            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export const Route = createFileRoute("/admin/(menu)/classification")({
  component: ClassificationManagementPage,
});
