import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import AdminHeader from "@/components/admin/AdminHeader";
import ClassificationSection from "@/components/admin/ClassificationSection";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { apiClient, baseURL } from "@/services";
import {
  fetchClassificationCatalogue,
  fetchItemClassificationBatch,
  bulkAddClassification,
  fetchSetupHealth,
} from "@/services/classification-service";
import { cn } from "@/lib/utils";
import {
  ForkKnifeIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  WarningCircleIcon,
  CheckCircleIcon,
  XIcon,
  CaretDownIcon,
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

// An item is set up once it has a combo role, a meal type and a cuisine type.
function isSetUp(cls) {
  return !!cls?.comboRole && (cls?.mealTypes?.length ?? 0) > 0 && (cls?.cuisineTypes?.length ?? 0) > 0;
}

const CHIP_TONES = {
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  warn: "bg-red-50 text-red-600 border-red-200",
};

function Chip({ tone, children }) {
  return (
    <span className={cn("inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", CHIP_TONES[tone])}>
      {children}
    </span>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({ item, cls, ready, checked, onToggle, onOpen }) {
  const src = resolveImg(item.imageUrl);
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3 transition-colors", checked ? "bg-orange-50/60" : "hover:bg-zinc-50/70")}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(item.id)}
        aria-label={`Select ${item.name}`}
        className="size-4 accent-orange-500 shrink-0 cursor-pointer"
      />

      <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
        {src ? (
          <img src={src} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300 text-base">🍽️</div>
        )}
      </div>

      <button type="button" onClick={() => onOpen(item)} className="flex-1 min-w-0 text-left group">
        <p className="text-sm font-medium text-zinc-800 truncate group-hover:text-orange-600 transition-colors">{item.name}</p>
        <p className="text-[11px] text-zinc-400">
          {item.isVeg ? "🟢 Veg" : "🔴 Non-veg"}
          {getCategoryName(item) !== "Uncategorised" ? ` · ${getCategoryName(item)}` : ""}
          {item.available === false ? " · Unavailable" : ""}
        </p>
      </button>

      <div className="hidden md:flex flex-wrap justify-end gap-1 max-w-[50%]">
        {cls?.comboRole && <Chip tone="orange">{cls.comboRole.name}</Chip>}
        {cls?.mealTypes?.map((m) => <Chip key={m.id} tone="amber">{m.name}</Chip>)}
        {cls?.cuisineTypes?.map((c) => <Chip key={c.id} tone="blue">{c.name}</Chip>)}
        {ready && !isSetUp(cls) && (
          <Chip tone="warn">
            <WarningCircleIcon className="size-3" weight="fill" />
            Not set up yet
          </Chip>
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpen(item)}
        className="inline-flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 shrink-0 transition-colors"
      >
        Edit
        <ArrowRightIcon className="size-3" weight="bold" />
      </button>
    </div>
  );
}

// ── Bulk action panel ─────────────────────────────────────────────────────────

// Opens a small panel of options. The user ticks options, then applies them to all selected items.
function BulkPanel({ label, hint, options, single = false, count, disabled, onApply }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState([]);

  const handleOpenChange = (next) => {
    setOpen(next);
    if (next) setPicked([]);
  };

  const toggle = (id) =>
    setPicked((prev) => {
      if (single) return [id];
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });

  const apply = () => {
    onApply(picked);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          {label}
          <CaretDownIcon className="size-3.5 text-zinc-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-3 p-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{label}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>
        </div>

        <div className="max-h-64 overflow-y-auto -mx-1">
          {options.length === 0 && (
            <p className="text-xs text-zinc-400 px-2 py-2">No options available for this location.</p>
          )}
          {options.map((o) => {
            const on = picked.includes(o.id);
            return (
              <div
                key={o.id}
                role="option"
                aria-selected={on}
                tabIndex={0}
                onClick={() => toggle(o.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(o.id); } }}
                className={cn(
                  "flex items-start gap-2.5 rounded-md px-2 py-1.5 cursor-pointer select-none",
                  on ? "bg-orange-50" : "hover:bg-zinc-50",
                )}
              >
                <Checkbox checked={on} tabIndex={-1} className="pointer-events-none mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-zinc-800">{o.name}</p>
                  {o.description && <p className="text-[11px] text-zinc-400 leading-4">{o.description}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <Button size="sm" disabled={picked.length === 0 || count === 0} onClick={apply} className="w-full">
          Apply to {count} selected item{count === 1 ? "" : "s"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// ── Setup health ──────────────────────────────────────────────────────────────

function IssueButton({ label, count, active, onClick }) {
  const ok = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={ok}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        ok && "border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default",
        !ok && active && "border-orange-400 bg-orange-50 text-orange-700",
        !ok && !active && "border-zinc-200 bg-white text-zinc-700 hover:border-orange-300",
      )}
    >
      {ok
        ? <CheckCircleIcon className="size-3.5" weight="fill" />
        : <WarningCircleIcon className="size-3.5 text-amber-500" weight="fill" />}
      {label}
      <span className="font-semibold">{ok ? "All set" : count}</span>
    </button>
  );
}

function SetupHealthPanel({ health, activeIssue, onPick }) {
  const pct = health.totalItems ? Math.round((health.completeItems / health.totalItems) * 100) : 0;
  const issues = [
    { key: "role", label: "Missing role", list: health.missingRole },
    { key: "meal", label: "Missing meal time", list: health.missingMealTime },
    { key: "cuisine", label: "Missing cuisine", list: health.missingCuisine },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-[200px]">
          <p className="text-sm font-semibold text-zinc-900">
            {health.completeItems} of {health.totalItems} items fully set up
          </p>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
            <div className="h-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {issues.map(({ key, label, list }) => (
            <IssueButton
              key={key}
              label={label}
              count={list.length}
              active={activeIssue?.key === key}
              onClick={() =>
                onPick(activeIssue?.key === key ? null : { key, label, ids: new Set(list.map((x) => x.id)) })
              }
            />
          ))}
        </div>
      </div>

      {activeIssue && (
        <p className="text-xs text-zinc-500">
          Showing items: <span className="font-medium text-zinc-800">{activeIssue.label}</span>.{" "}
          <button type="button" onClick={() => onPick(null)} className="text-orange-600 hover:underline">
            Show all items
          </button>
        </p>
      )}

      {health.rolesWithoutItems.length > 0 && (
        <p className="text-xs text-amber-700">
          No items use these roles yet, so their recommendations cannot appear:{" "}
          {health.rolesWithoutItems.map((r) => r.name).join(", ")}.
        </p>
      )}

      {health.brokenRules.length > 0 && (
        <div className="text-xs text-red-600 space-y-0.5">
          <p className="font-semibold">
            {health.brokenRules.length} recommendation rule{health.brokenRules.length === 1 ? "" : "s"} need attention
          </p>
          {health.brokenRules.map((r) => (
            <p key={r.ruleId}>· {r.ruleName}: {r.problem}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ClassificationManagementPage() {
  const { activeLocationId } = useActiveLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [needsOnly, setNeedsOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectedItem, setSelectedItem] = useState(null);
  const [issueFilter, setIssueFilter] = useState(null);

  const { data: health } = useQuery({
    queryKey: ["setup-health", activeLocationId],
    queryFn: () => fetchSetupHealth(activeLocationId),
    enabled: !!activeLocationId,
    staleTime: 1000 * 30,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["menu", "admin-classify", activeLocationId],
    queryFn: () => apiClient.get("/menu", { params: { locationId: activeLocationId } }).then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  });

  const { data: catalogue } = useQuery({
    queryKey: ["classification-catalogue"],
    queryFn: fetchClassificationCatalogue,
    staleTime: 1000 * 60 * 10,
  });

  const itemIdsKey = useMemo(() => items.map((i) => i.id).sort((a, b) => a - b).join(","), [items]);

  const { data: classMap = {}, isSuccess: classReady, isError: classError } = useQuery({
    queryKey: ["item-classification-batch", activeLocationId, itemIdsKey],
    queryFn: () => fetchItemClassificationBatch(itemIdsKey.split(","), activeLocationId),
    enabled: !!activeLocationId && itemIdsKey !== "",
    staleTime: 1000 * 60 * 2,
  });

  const bulkMutation = useMutation({
    mutationFn: (payload) =>
      bulkAddClassification({ itemIds: [...selectedIds], ...payload }, activeLocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-classification-batch"] });
      queryClient.invalidateQueries({ queryKey: ["item-classification"] });
      queryClient.invalidateQueries({ queryKey: ["setup-health"] });
    },
  });

  const needsCount = useMemo(
    () => (classReady ? items.filter((i) => !isSetUp(classMap[i.id])).length : 0),
    [items, classMap, classReady],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!q || i.name?.toLowerCase().includes(q)) &&
        (!needsOnly || (classReady && !isSetUp(classMap[i.id]))) &&
        (!issueFilter || issueFilter.ids.has(i.id)),
    );
  }, [items, search, needsOnly, classMap, classReady, issueFilter]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      const key = getCategoryName(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggleOne = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleGroup = (catItems) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allOn = catItems.every((i) => next.has(i.id));
      catItems.forEach((i) => (allOn ? next.delete(i.id) : next.add(i.id)));
      return next;
    });

  const closeSheet = () => {
    setSelectedItem(null);
    queryClient.invalidateQueries({ queryKey: ["item-classification-batch"] });
    queryClient.invalidateQueries({ queryKey: ["setup-health"] });
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <AdminHeader
        title="Recommendation Setup"
        description="Tell the app what each item is, so it can suggest the right drink, side or dessert with every order. Tick several items to set them all at once."
        icon={<ForkKnifeIcon weight="duotone" className="size-5 text-orange-500" />}
      />

      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        {[
          { label: "Role", question: "What is it in the meal?", examples: "Main, Drink, Dessert, Addon", color: "border-orange-200 bg-orange-50/60 text-orange-700" },
          { label: "Meal time", question: "When do people order it?", examples: "Breakfast, Lunch, Dinner, Snack", color: "border-amber-200 bg-amber-50/60 text-amber-700" },
          { label: "Cuisine", question: "What style of food is it?", examples: "South Indian, North Indian, Chinese", color: "border-blue-200 bg-blue-50/60 text-blue-700" },
        ].map(({ label, question, examples, color }) => (
          <div key={label} className={cn("rounded-lg border px-3 py-2", color)}>
            <p className="font-semibold">{label}: <span className="font-normal text-zinc-700">{question}</span></p>
            <p className="text-zinc-500 mt-0.5">e.g. {examples}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="pl-9"
          />
        </div>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setNeedsOnly(false)}
            className={cn("px-3 py-1.5 rounded-md transition-colors", !needsOnly ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800")}
          >
            All items · {items.length}
          </button>
          <button
            type="button"
            onClick={() => setNeedsOnly(true)}
            className={cn("px-3 py-1.5 rounded-md transition-colors", needsOnly ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800")}
          >
            Not set up yet · {classReady ? needsCount : "…"}
          </button>
        </div>
      </div>

      {health && (
        <SetupHealthPanel health={health} activeIssue={issueFilter} onPick={setIssueFilter} />
      )}

      {classError && (
        <p className="text-xs text-red-600">
          Could not load item setup status. Restart the backend if this persists.
        </p>
      )}

      {selectedIds.size > 0 && activeLocationId && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-white/95 backdrop-blur px-4 py-2.5 shadow-md">
          <span className="text-sm font-semibold text-zinc-900">{selectedIds.size} item{selectedIds.size === 1 ? "" : "s"} selected</span>
          <div className="h-5 w-px bg-zinc-200 mx-1" />
          <BulkPanel
            label="Set role"
            hint="Each item has one role. Items that already have a role keep it."
            options={catalogue?.comboRoles ?? []}
            single
            count={selectedIds.size}
            disabled={bulkMutation.isPending}
            onApply={([id]) => bulkMutation.mutate({ comboRoleId: id })}
          />
          <BulkPanel
            label="Add meal times"
            hint="Adds these to the items. Existing meal times are kept."
            options={catalogue?.mealTypes ?? []}
            count={selectedIds.size}
            disabled={bulkMutation.isPending}
            onApply={(ids) => bulkMutation.mutate({ mealTypeIds: ids })}
          />
          <BulkPanel
            label="Add cuisines"
            hint="Adds these to the items. Existing cuisines are kept."
            options={catalogue?.cuisineTypes ?? []}
            count={selectedIds.size}
            disabled={bulkMutation.isPending}
            onApply={(ids) => bulkMutation.mutate({ cuisineTypeIds: ids })}
          />
          <div className="flex-1" />
          {bulkMutation.isPending && <Loader2 className="size-4 animate-spin text-orange-500" />}
          {bulkMutation.isError && <span className="text-xs text-red-600">Save failed. Try again.</span>}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
          >
            <XIcon className="size-3.5" />
            Clear selection
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" />
          Loading menu items…
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">No items found.</p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([category, catItems]) => {
            const allOn = catItems.every((i) => selectedIds.has(i.id));
            return (
              <div key={category}>
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allOn}
                    onChange={() => toggleGroup(catItems)}
                    aria-label={`Select all in ${category}`}
                    className="size-3.5 accent-orange-500 cursor-pointer"
                  />
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    {category}{" "}
                    <span className="font-normal text-zinc-400 normal-case">({catItems.length})</span>
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm divide-y divide-zinc-100">
                  {catItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      cls={classMap[item.id]}
                      ready={classReady}
                      checked={selectedIds.has(item.id)}
                      onToggle={toggleOne}
                      onOpen={setSelectedItem}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet
        open={!!selectedItem}
        onOpenChange={(open) => { if (!open) closeSheet(); }}
      >
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden">
          {selectedItem && (
            <Tabs defaultValue="classification" className="flex flex-col h-full">
              <div className="shrink-0 border-b border-zinc-100">
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

                <TabsList variant="line" className="px-5 w-full justify-start gap-4 rounded-none bg-transparent border-0 pb-0">
                  <TabsTrigger value="classification" className="flex items-center gap-1.5 pb-2.5 text-xs font-medium">
                    <ForkKnifeIcon className="size-3.5" weight="duotone" />
                    Classification
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="classification"
                className="flex-1 overflow-y-auto px-5 py-5 m-0"
              >
                <ClassificationSection
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
