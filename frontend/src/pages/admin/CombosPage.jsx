import { useState, useMemo } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  SortAscendingIcon,
  GridFourIcon,
  LightbulbIcon,
  PlusIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import ComboKpiCards from "@/components/admin/combo/ComboKpiCards";
import ComboCard from "@/components/admin/combo/ComboCard";
import CreateComboSheet from "@/components/admin/combo/CreateComboSheet";
import { useComboList, useComboSummary, useComboMutations } from "@/hooks/useCombos";

// ── Status tab config ──────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "ALL",      label: "All Combos" },
  { key: "ACTIVE",   label: "Active" },
  { key: "INACTIVE", label: "Inactive" },
  { key: "DRAFT",    label: "Scheduled" },
];

export default function CombosPage() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Build query params from current filters
  const queryParams = useMemo(() => {
    const p = { size: 50 };
    if (search) p.search = search;
    if (activeTab === "ACTIVE") p.isActive = true;
    if (activeTab === "INACTIVE") p.isActive = false;
    if (activeTab === "DRAFT") p.status = "DRAFT";
    return p;
  }, [search, activeTab]);

  const list = useComboList(queryParams);
  const summary = useComboSummary();

  const combos = list.data?.content ?? list.data ?? [];
  const s = summary.data;

  // Tab counts derived from summary
  const tabCounts = {
    ALL: s?.totalCombos ?? combos.length,
    ACTIVE: s?.activeCombos ?? 0,
    INACTIVE: s ? (s.totalCombos - s.activeCombos) : 0,
    DRAFT: 0,
  };

  const mutations = useComboMutations(() => {
    list.refetch();
    summary.refetch();
  });

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleToggle = async (combo, newStatus) => {
    setTogglingId(combo.id);
    try {
      await mutations.updateStatus(combo.id, newStatus);
      toast.success(`Combo ${newStatus === "ACTIVE" ? "activated" : "deactivated"}`);
    } catch {
      toast.error(mutations.mutError ?? "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleSave = async (payload) => {
    try {
      if (editingCombo) {
        await mutations.update(editingCombo.id, payload);
        toast.success("Combo updated");
      } else {
        await mutations.create(payload);
        toast.success("Combo created");
      }
      setSheetOpen(false);
      setEditingCombo(null);
    } catch {
      toast.error(mutations.mutError ?? "Failed to save combo");
    }
  };

  const handleEdit = (combo) => {
    setEditingCombo(combo);
    setSheetOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await mutations.remove(deleteTarget.id);
      toast.success("Combo deleted");
      setDeleteTarget(null);
    } catch {
      toast.error(mutations.mutError ?? "Failed to delete");
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-zinc-50 dark:bg-zinc-950 pb-24">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-zinc-500" />
            <div>
              <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                Combo Builder
              </h1>
              <p className="text-[11px] text-zinc-400">Create and manage combos</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              <MagnifyingGlassIcon size={18} weight="bold" />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              <FunnelIcon size={18} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="pt-4 pb-2">
        <ComboKpiCards summary={summary.data} loading={summary.loading} />
      </div>

      {/* ── Status Tabs ───────────────────────────────────────────────── */}
      <div className="px-4 mt-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {STATUS_TABS.map((tab) => {
            const count = tabCounts[tab.key];
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 min-h-[38px] px-4 rounded-full text-sm font-medium transition-colors border ${
                  active
                    ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      active ? "bg-white/25 text-white" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search + Sort + Category ──────────────────────────────────── */}
      <div className="px-4 mt-3 flex gap-2">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <MagnifyingGlassIcon
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onBlur={() => setSearch(searchInput.trim())}
            placeholder="Search combos..."
            className="pl-8 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-xl"
          />
        </form>
        <button className="flex-shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          <SortAscendingIcon size={15} weight="bold" />
          Sort
        </button>
        <button className="flex-shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          <GridFourIcon size={15} weight="bold" />
          Category
        </button>
      </div>

      {/* ── Combo List ────────────────────────────────────────────────── */}
      <div className="px-4 mt-4 space-y-3">
        {list.loading && (
          <>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 animate-pulse"
              />
            ))}
          </>
        )}

        {!list.loading && list.error && (
          <div className="text-center py-12">
            <p className="text-sm text-red-500">Failed to load combos</p>
            <button
              onClick={list.refetch}
              className="mt-2 text-xs text-violet-600 underline min-h-[44px] px-4"
            >
              Retry
            </button>
          </div>
        )}

        {!list.loading && !list.error && combos.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🍱</p>
            <p className="text-sm font-medium text-zinc-500">No combos yet</p>
            <p className="text-xs text-zinc-400 mt-1">Tap + to create your first combo</p>
          </div>
        )}

        {combos.map((combo) => (
          <ComboCard
            key={combo.id}
            combo={combo}
            toggling={togglingId === combo.id}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={(c) => setDeleteTarget(c)}
          />
        ))}
      </div>

      {/* ── Tip Banner ────────────────────────────────────────────────── */}
      {!list.loading && combos.length > 0 && (
        <div className="mx-4 mt-4 flex items-center gap-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-2xl px-4 py-3">
          <LightbulbIcon size={20} className="text-violet-500 flex-shrink-0" weight="fill" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
              Tip: Increase Combo Sales
            </p>
            <p className="text-[11px] text-violet-500 dark:text-violet-400 mt-0.5">
              Featured combos on homepage get 2.4× more orders!
            </p>
          </div>
          <CaretRightIcon size={14} className="text-violet-400 flex-shrink-0" />
        </div>
      )}

      {/* ── FAB – Create Combo ────────────────────────────────────────── */}
      <button
        onClick={() => { setEditingCombo(null); setSheetOpen(true); }}
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-semibold px-5 h-12 rounded-full shadow-lg shadow-violet-200 dark:shadow-violet-900/40 transition-all"
      >
        <PlusIcon size={18} weight="bold" />
        Create Combo
      </button>

      {/* ── Create / Edit Sheet ───────────────────────────────────────── */}
      <CreateComboSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingCombo(null); }}
        initialData={editingCombo}
        onSave={handleSave}
        busy={mutations.busy}
      />

      {/* ── Delete Confirm Dialog ─────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Combo?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.comboName}</strong> will be permanently removed. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={mutations.busy}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {mutations.busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

