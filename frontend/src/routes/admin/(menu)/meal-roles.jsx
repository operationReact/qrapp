import { createFileRoute } from "@tanstack/react-router";


import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMealRoles,
  fetchItemsWithMealRoles,
  assignMealRole,
  clearMealRole,
} from "@/services/recommendation-service";
import AdminHeader from "@/components/admin/AdminHeader";
import { cn } from "@/lib/utils";
import { baseURL } from "@/services";
import {
  ForkKnifeIcon,
  XCircleIcon,
  CheckSquareIcon,
  SquareIcon,
  MinusSquareIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/(menu)/meal-roles")({
  component: MealRolesPage,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const resolveImg = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${baseURL}${url}`;
};

const ROLE_COLORS = {
  Main:    "bg-orange-100 text-orange-700 border-orange-200",
  Side:    "bg-green-100  text-green-700  border-green-200",
  Drink:   "bg-blue-100   text-blue-700   border-blue-200",
  Dessert: "bg-pink-100   text-pink-700   border-pink-200",
  Addon:   "bg-zinc-100   text-zinc-600   border-zinc-200",
};

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({ item, roles, onAssign, onClear, saving, selected, onToggleSelect }) {
  const src      = resolveImg(item.imageUrl);
  const isSaving = saving === item.itemId;

  return (
    <tr
      className={cn(
        "border-b border-zinc-100 transition-colors",
        selected ? "bg-orange-50/60" : "hover:bg-zinc-50/40",
      )}
    >
      {/* Checkbox */}
      <td className="px-3 py-3 w-10">
        <button
          type="button"
          onClick={() => onToggleSelect(item.itemId)}
          className="text-zinc-400 hover:text-orange-500 transition-colors"
        >
          {selected
            ? <CheckSquareIcon weight="fill" className="size-4 text-orange-500" />
            : <SquareIcon weight="regular" className="size-4" />}
        </button>
      </td>

      {/* Image + name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
            {src ? (
              <img src={src} alt={item.itemName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-300 text-base">🍽️</div>
            )}
          </div>
          <span className="text-sm font-medium text-zinc-800 truncate max-w-[200px]">
            {item.itemName}
          </span>
        </div>
      </td>

      {/* Current role badge */}
      <td className="py-3 px-4">
        {item.roleName ? (
          <span className={cn(
            "inline-flex items-center gap-1 border text-xs font-semibold px-2 py-0.5 rounded-full",
            ROLE_COLORS[item.roleName] ?? ROLE_COLORS.Addon,
          )}>
            {item.roleName}
          </span>
        ) : (
          <span className="text-xs text-zinc-400 italic">None</span>
        )}
      </td>

      {/* Role selector */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <select
            key={item.roleId ?? "none"}
            defaultValue={item.roleId ?? ""}
            disabled={isSaving}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") onClear(item.itemId);
              else onAssign(item.itemId, Number(val));
            }}
            className="text-xs rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400/40 disabled:opacity-50 cursor-pointer"
          >
            <option value="">— No role —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          {item.roleId && (
            <button
              type="button"
              onClick={() => onClear(item.itemId)}
              disabled={isSaving}
              aria-label={`Clear role for ${item.itemName}`}
              className="text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40"
            >
              <XCircleIcon weight="fill" className="size-4" />
            </button>
          )}

          {isSaving && (
            <span className="text-[10px] text-orange-500 font-medium animate-pulse">Saving…</span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Category section ──────────────────────────────────────────────────────────

function CategorySection({ categoryName, items, roles, onAssign, onClear, saving, selectedIds, onToggleSelect, onToggleAll }) {
  const ids       = items.map((i) => i.itemId);
  const allSel    = ids.every((id) => selectedIds.has(id));
  const someSel   = ids.some((id)  => selectedIds.has(id));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      {/* Category header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
        <button
          type="button"
          onClick={() => onToggleAll(ids, allSel)}
          className="text-zinc-400 hover:text-orange-500 transition-colors shrink-0"
          aria-label={allSel ? "Deselect all in category" : "Select all in category"}
        >
          {allSel
            ? <CheckSquareIcon weight="fill" className="size-4 text-orange-500" />
            : someSel
              ? <MinusSquareIcon weight="fill" className="size-4 text-orange-400" />
              : <SquareIcon weight="regular" className="size-4" />}
        </button>
        <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">
          {categoryName ?? "Uncategorised"}
        </span>
        <span className="ml-1 text-xs text-zinc-400">({items.length})</span>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="w-10" />
              <th className="text-left px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Item</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Assign</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ItemRow
                key={item.itemId}
                item={item}
                roles={roles}
                onAssign={onAssign}
                onClear={onClear}
                saving={saving}
                selected={selectedIds.has(item.itemId)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function MealRolesPage() {
  const qc = useQueryClient();
  const [filter, setFilter]         = useState("");
  const [savingId, setSavingId]     = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkRoleId, setBulkRoleId] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const { data: roles = [],  isLoading: rolesLoading } = useQuery({
    queryKey: ["meal-roles"],
    queryFn:  fetchMealRoles,
    staleTime: Infinity,
  });
  const { data: items = [],  isLoading: itemsLoading } = useQuery({
    queryKey: ["meal-role-items"],
    queryFn:  fetchItemsWithMealRoles,
    staleTime: 0,
  });

  const assignMut = useMutation({
    mutationFn: ({ itemId, roleId }) => assignMealRole(itemId, roleId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["meal-role-items"] }),
  });
  const clearMut = useMutation({
    mutationFn: (itemId) => clearMealRole(itemId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["meal-role-items"] }),
  });

  const handleAssign = async (itemId, roleId) => {
    setSavingId(itemId);
    try { await assignMut.mutateAsync({ itemId, roleId }); }
    finally { setSavingId(null); }
  };
  const handleClear = async (itemId) => {
    setSavingId(itemId);
    try { await clearMut.mutateAsync(itemId); }
    finally { setSavingId(null); }
  };

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = (ids, currentlyAllSelected) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (currentlyAllSelected) ids.forEach((id) => next.delete(id));
      else                       ids.forEach((id) => next.add(id));
      return next;
    });

  // ── Bulk assign ────────────────────────────────────────────────────────────
  const handleBulkAssign = async () => {
    if (!bulkRoleId || selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      await Promise.all(
        [...selectedIds].map((itemId) =>
          assignMealRole(itemId, Number(bulkRoleId)),
        ),
      );
      await qc.invalidateQueries({ queryKey: ["meal-role-items"] });
      toast.success(`Role assigned to ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      setBulkRoleId("");
    } catch {
      toast.error("Some assignments failed — please retry");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkClear = async () => {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      await Promise.all([...selectedIds].map((itemId) => clearMealRole(itemId)));
      await qc.invalidateQueries({ queryKey: ["meal-role-items"] });
      toast.success(`Role cleared from ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      setBulkRoleId("");
    } catch {
      toast.error("Some clear operations failed — please retry");
    } finally {
      setBulkSaving(false);
    }
  };

  // ── Grouping ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    filter.trim()
      ? items.filter((i) => i.itemName.toLowerCase().includes(filter.toLowerCase()))
      : items,
    [items, filter],
  );

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      const key = item.categoryName ?? "Uncategorised";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const isLoading = rolesLoading || itemsLoading;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <AdminHeader
        title="Meal Roles"
        description="Assign Main · Side · Drink · Dessert roles to menu items. Used by the 'Complete Your Meal' feature."
        icon={<ForkKnifeIcon weight="duotone" className="size-5 text-orange-500" />}
      />

      {/* Stats strip */}
      <div className="flex flex-wrap gap-3">
        {roles.map((role) => {
          const count = items.filter((i) => i.roleName === role.name).length;
          return (
            <div
              key={role.id}
              className={cn(
                "inline-flex items-center gap-2 border text-xs font-semibold px-3 py-1.5 rounded-full",
                ROLE_COLORS[role.name] ?? ROLE_COLORS.Addon,
              )}
            >
              {role.name}
              <span className="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px]">{count}</span>
            </div>
          );
        })}
        <div className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 text-xs font-semibold px-3 py-1.5 rounded-full text-zinc-500">
          No role
          <span className="bg-white/80 rounded-full px-1.5 py-0.5 text-[10px]">
            {items.filter((i) => !i.roleName).length}
          </span>
        </div>
      </div>

      {/* Search + select-all */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setSelectedIds(new Set()); }}
          placeholder="Search items…"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 w-full max-w-xs"
        />
        {selectedIds.size > 0 && (
          <span className="text-xs text-zinc-500">
            <span className="font-semibold text-orange-600">{selectedIds.size}</span> selected
          </span>
        )}
      </div>

      {/* ── Sticky Bulk Assign Bar ── */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-orange-50 border-y border-orange-200 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-orange-800">
            {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
          </span>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <select
              value={bulkRoleId}
              onChange={(e) => setBulkRoleId(e.target.value)}
              disabled={bulkSaving}
              className="text-sm rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400/40 disabled:opacity-50"
            >
              <option value="">— Pick a role —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            <button
              type="button"
              disabled={!bulkRoleId || bulkSaving}
              onClick={handleBulkAssign}
              className="px-4 py-1.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 transition-colors"
            >
              {bulkSaving ? "Saving…" : "Assign to all"}
            </button>

            <button
              type="button"
              disabled={bulkSaving}
              onClick={handleBulkClear}
              className="px-4 py-1.5 rounded-lg border border-zinc-300 bg-white text-zinc-600 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40 transition-colors"
            >
              Clear roles
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Category groups ── */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400">
          No items found.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([catName, catItems]) => (
            <CategorySection
              key={catName}
              categoryName={catName}
              items={catItems}
              roles={roles}
              onAssign={handleAssign}
              onClear={handleClear}
              saving={savingId}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}

