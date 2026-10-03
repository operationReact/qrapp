import { useCallback, useEffect, useMemo, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Building2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { FoodCourtProvider, useFc } from "./context";
import { buildMonthOptions, currentMonthValue, formatMonthLabel, shiftMonth, titleCase } from "./format";
import { useFoodCourts } from "./hooks";
import { foodCourtKeys } from "./keys";
import { CoreSheetHost } from "./components/SheetHost";
import { AppSheet, EmptyState, ErrorState, KebabMenu, SelectField, TabStrip } from "./components/kit";
import OverviewScreen from "./components/OverviewScreen";
import { LeasesScreen, StallsScreen, TenantsScreen } from "./components/ManageScreens";
import { DepositsScreen, ExpensesScreen, RentScreen } from "./components/FinanceScreens";
import { ActionItemsScreen, FoodCourtsScreen, PropertyScreen } from "./components/OpsScreens";

const STORAGE_KEY = "fc.selectedFoodCourt";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "stalls", label: "Stalls" },
  { key: "tenants", label: "Tenants" },
  { key: "finance", label: "Finance" },
  { key: "ops", label: "Operations" },
  { key: "more", label: "More" },
];
const SUBTABS = {
  finance: [
    { key: "rent", label: "Rent" },
    { key: "deposits", label: "Deposits" },
    { key: "expenses", label: "Expenses" },
  ],
  ops: [
    { key: "leases", label: "Leases" },
    { key: "actions", label: "Action Items" },
  ],
  more: [
    { key: "property", label: "Property" },
    { key: "courts", label: "Food Courts" },
  ],
};
const DEFAULT_SUB = { finance: "rent", ops: "leases", more: "property" };

function FoodCourtPicker({ open, onOpenChange, foodCourts, selectedId, onSelect, onAdd }) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (foodCourts || []).filter((item) => !needle || [item.name, item.city, item.code].some((v) => v?.toLowerCase().includes(needle)));
  }, [foodCourts, query]);
  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Select food court"
      footer={<Button variant="outline" className="min-h-11 w-full rounded-xl" onClick={onAdd}>+ Add food court</Button>}
    >
      {(foodCourts?.length ?? 0) > 5 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cc-muted-text)]" aria-hidden="true" />
          <Input aria-label="Search food courts" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search food courts" className="h-11 rounded-xl bg-white pl-9 text-base md:text-sm" />
        </div>
      )}
      <ul className="space-y-2">
        {rows.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex min-h-14 w-full cursor-pointer items-center justify-between gap-2 rounded-[16px] border bg-white px-3.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]",
                item.id === selectedId ? "border-[var(--cc-primary)]" : "border-[var(--cc-border)] hover:border-[var(--cc-primary)]/50",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{item.name}</span>
                <span className="block text-xs text-[var(--cc-secondary-text)]">{item.stallCount ?? item.totalStalls ?? 0} stalls · {titleCase(item.status)}</span>
              </span>
              {item.id === selectedId && <span className="text-xs font-semibold text-[var(--cc-primary)]">Selected</span>}
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="py-6 text-center text-sm text-[var(--cc-muted-text)]">No food courts found.</li>}
      </ul>
    </AppSheet>
  );
}

function Shell({ foodCourts, selectId }) {
  const fc = useFc();
  const queryClient = useQueryClient();
  const fetching = useIsFetching({ queryKey: foodCourtKeys.all }) > 0;
  const [tab, setTab] = useState("overview");
  const [subs, setSubs] = useState(DEFAULT_SUB);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [monthPicker, setMonthPicker] = useState(false);

  const goto = useCallback((nextTab, sub) => {
    setTab(nextTab);
    if (sub) setSubs((current) => ({ ...current, [nextTab]: sub }));
    window.scrollTo({ top: 0 });
  }, []);
  const refresh = () => queryClient.invalidateQueries({ queryKey: foodCourtKeys.all });

  const current = fc.foodCourt;
  const subItems = SUBTABS[tab];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3 px-3 pb-24 pt-2 sm:px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label="Change food court"
          className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-[16px] border border-[var(--cc-border)] bg-white px-3.5 py-1.5 text-left transition hover:border-[var(--cc-primary)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--cc-muted-text)]">Food Court</span>
            <span className="block truncate text-sm font-bold text-[var(--cc-text)]">{current.name}</span>
            <span className="block text-[11px] text-[var(--cc-secondary-text)]">
              {fc.stalls.data ? `${fc.stalls.data.length} stalls` : `${current.stallCount ?? 0} stalls`} · {titleCase(current.status)}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-[var(--cc-muted-text)]" aria-hidden="true" />
        </button>
        <KebabMenu
          label="Food court menu"
          items={[
            { label: "Add tenant", onSelect: () => fc.open("tenant-form") },
            { label: "Add stall", onSelect: () => fc.open("stall-form") },
            { label: "Add expense", onSelect: () => fc.open("expense-form") },
            { label: "Edit food court", onSelect: () => fc.open("food-court-form", { foodCourt: current }) },
            { label: "Add food court", onSelect: () => fc.open("food-court-form", { onSaved: (saved) => saved?.id && selectId(saved.id) }) },
            { label: "Refresh data", onSelect: refresh },
          ]}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Previous month" onClick={() => fc.setMonth(shiftMonth(fc.month, -1))} className="grid size-11 cursor-pointer place-items-center rounded-xl border border-[var(--cc-border)] bg-white hover:border-[var(--cc-primary)]/50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setMonthPicker(true)} aria-label={`Month: ${formatMonthLabel(fc.month)}. Change month`} className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--cc-border)] bg-white text-sm font-bold hover:border-[var(--cc-primary)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]">
          {formatMonthLabel(fc.month)} <ChevronDown className="size-4 text-[var(--cc-muted-text)]" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Next month" onClick={() => fc.setMonth(shiftMonth(fc.month, 1))} className="grid size-11 cursor-pointer place-items-center rounded-xl border border-[var(--cc-border)] bg-white hover:border-[var(--cc-primary)]/50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]">
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Refresh data" title="Refresh" onClick={refresh} className="grid size-11 cursor-pointer place-items-center rounded-xl text-[var(--cc-secondary-text)] hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]">
          <RefreshCw className={cn("size-[18px]", fetching && "animate-spin")} aria-hidden="true" />
        </button>
      </div>

      <div className="sticky top-0 z-20 -mx-3 bg-[var(--cc-page)] px-3 sm:-mx-4 sm:px-4">
        <TabStrip label="Food court sections" items={TABS} value={tab} onChange={(key) => goto(key)} />
        {subItems && (
          <TabStrip variant="pill" label={`${tab} sections`} items={subItems} value={subs[tab]} onChange={(key) => setSubs((s) => ({ ...s, [tab]: key }))} className="pt-2" />
        )}
      </div>

      <main className="pt-1">
        {tab === "overview" && <OverviewScreen goto={goto} />}
        {tab === "stalls" && <StallsScreen />}
        {tab === "tenants" && <TenantsScreen />}
        {tab === "finance" && subs.finance === "rent" && <RentScreen />}
        {tab === "finance" && subs.finance === "deposits" && <DepositsScreen />}
        {tab === "finance" && subs.finance === "expenses" && <ExpensesScreen />}
        {tab === "ops" && subs.ops === "leases" && <LeasesScreen />}
        {tab === "ops" && subs.ops === "actions" && <ActionItemsScreen />}
        {tab === "more" && subs.more === "property" && <PropertyScreen />}
        {tab === "more" && subs.more === "courts" && <FoodCourtsScreen foodCourts={foodCourts} onSelect={selectId} />}
      </main>

      <CoreSheetHost />

      <FoodCourtPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        foodCourts={foodCourts.data}
        selectedId={current.id}
        onSelect={(id) => { selectId(id); setPickerOpen(false); }}
        onAdd={() => { setPickerOpen(false); fc.open("food-court-form", { onSaved: (saved) => saved?.id && selectId(saved.id) }); }}
      />

      <AppSheet open={monthPicker} onOpenChange={setMonthPicker} title="Choose month">
        <SelectField
          label="Month"
          value={fc.month}
          onChange={(value) => { fc.setMonth(value); setMonthPicker(false); }}
          options={buildMonthOptions(fc.month)}
        />
      </AppSheet>
    </div>
  );
}

export function FoodCourtDashboard() {
  const foodCourts = useFoodCourts();
  const [selectedId, setSelectedId] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [month, setMonth] = useState(currentMonthValue);

  const list = useMemo(() => foodCourts.data ?? [], [foodCourts.data]);
  const current = list.find((item) => item.id === selectedId) ?? list.find((item) => item.status === "ACTIVE") ?? list[0] ?? null;

  const selectId = useCallback((id) => {
    setSelectedId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // storage unavailable; selection stays in memory
    }
  }, []);

  useEffect(() => {
    document.title = "Food Court Management";
  }, []);

  if (foodCourts.isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-3 px-3 pt-2 sm:px-4" aria-busy="true" aria-label="Loading food courts">
        <Skeleton className="h-12 w-full rounded-[16px]" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-[16px]" />
      </div>
    );
  }
  if (foodCourts.isError) {
    return (
      <div className="mx-auto w-full max-w-md px-3 pt-6">
        <ErrorState message="Unable to load food courts." onRetry={foodCourts.refetch} />
      </div>
    );
  }
  if (!current) {
    return (
      <FoodCourtProvider foodCourt={null} month={month} setMonth={setMonth}>
        <EmptyOnboarding selectId={selectId} />
      </FoodCourtProvider>
    );
  }

  return (
    <FoodCourtProvider key={current.id} foodCourt={current} month={month} setMonth={setMonth}>
      <Shell foodCourts={foodCourts} selectId={selectId} />
    </FoodCourtProvider>
  );
}

function EmptyOnboarding({ selectId }) {
  const fc = useFc();
  return (
    <div className="mx-auto w-full max-w-md px-3 pt-6">
      <EmptyState
        icon={Building2}
        title="No food courts yet"
        description="Create your first food court to manage stalls, tenants and rent."
        action={<Button className="min-h-11 rounded-xl" onClick={() => fc.open("food-court-form", { onSaved: (saved) => saved?.id && selectId(saved.id) })}>+ Add food court</Button>}
      />
      <CoreSheetHost />
    </div>
  );
}

