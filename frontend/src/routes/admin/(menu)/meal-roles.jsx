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
  CheckSquareIcon,
  SquareIcon,
  MinusSquareIcon,
  XIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  Main: "bg-orange-100 text-orange-700 border-orange-200",
  Side: "bg-green-100  text-green-700  border-green-200",
  Drink: "bg-blue-100   text-blue-700   border-blue-200",
  Dessert: "bg-pink-100   text-pink-700   border-pink-200",
  Addon: "bg-zinc-100   text-zinc-600   border-zinc-200",
};

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  roles,
  onAssign,
  onClear,
  saving,
  selected,
  onToggleSelect,
}) {
  const src = resolveImg(item.imageUrl);
  const isSaving = saving === item.itemId;

  return (
    <tr
      className={cn(
        "border-b border-zinc-100",
        selected ? "bg-primary/5" : "hover:bg-zinc-100",
      )}
    >
      {/* Checkbox */}
      <td className="px-3 py-3 w-10">
        <button
          type="button"
          onClick={() => onToggleSelect(item.itemId)}
          className="text-zinc-400 hover:text-primary transition-colors"
        >
          {selected ? (
            <CheckSquareIcon weight="fill" className="size-4 text-primary" />
          ) : (
            <SquareIcon weight="regular" className="size-4" />
          )}
        </button>
      </td>

      {/* Image + name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
            {src ? (
              <img
                src={src}
                alt={item.itemName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-300 text-base">
                🍽️
              </div>
            )}
          </div>
          <span className="text-sm font-medium truncate max-w-[200px]">
            {item.itemName}
          </span>
        </div>
      </td>

      {/* Current role badge */}
      <td className="py-3 px-4">
        {item.roleName ? (
          <Badge
            className={cn(
              ROLE_COLORS[item.roleName] ?? ROLE_COLORS.Addon,
            )}
          >
            {item.roleName}
          </Badge>
        ) : (
          <span className="text-xs text-zinc-600">None</span>
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
            className="text-xs rounded-sm border border-zinc-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 cursor-pointer"
          >
            <option value="">— No role —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {item.roleId && (
            <Button
              type="ghost"
              variant="outline"
              size="icon-sm"
              onClick={() => onClear(item.itemId)}
              disabled={isSaving}
              aria-label={`Clear role for ${item.itemName}`}
            >
              <XIcon weight="bold" />
            </Button>
          )}

          {isSaving && (
            <span className="text-xs text-primary font-medium animate-pulse">
              Saving…
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Category section ──────────────────────────────────────────────────────────

function CategorySection({
  categoryName,
  items,
  roles,
  onAssign,
  onClear,
  saving,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}) {
  const ids = items.map((i) => i.itemId);
  const allSel = ids.every((id) => selectedIds.has(id));
  const someSel = ids.some((id) => selectedIds.has(id));

  return (
    <div className="rounded-lg bg-white overflow-clip">
      {/* Category header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
        <button
          type="button"
          onClick={() => onToggleAll(ids, allSel)}
          className="text-zinc-400 hover:text-orange-500 transition-colors shrink-0"
          aria-label={
            allSel ? "Deselect all in category" : "Select all in category"
          }
        >
          {allSel ? (
            <CheckSquareIcon weight="fill" className="size-4 text-primary" />
          ) : someSel ? (
            <MinusSquareIcon weight="fill" className="size-4 text-primary" />
          ) : (
            <SquareIcon weight="regular" className="size-4" />
          )}
        </button>
        <span className="text-sm font-medium text-zinc-600">
          {categoryName ?? "Uncategorised"}
        </span>
        <span className="text-xs text-zinc-500">({items.length})</span>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="w-10" />
              <th className="text-left px-4 py-2 text-sm font-medium text-zinc-500">
                Item
              </th>
              <th className="text-left px-4 py-2 text-sm font-medium text-zinc-500">
                Role
              </th>
              <th className="text-left px-4 py-2 text-sm font-medium text-zinc-500">
                Assign
              </th>
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
  const [filter, setFilter] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkRoleId, setBulkRoleId] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["meal-roles"],
    queryFn: fetchMealRoles,
    staleTime: Infinity,
  });
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["meal-role-items"],
    queryFn: fetchItemsWithMealRoles,
    staleTime: 0,
  });

  const assignMut = useMutation({
    mutationFn: ({ itemId, roleId }) => assignMealRole(itemId, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meal-role-items"] }),
  });
  const clearMut = useMutation({
    mutationFn: (itemId) => clearMealRole(itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meal-role-items"] }),
  });

  const handleAssign = async (itemId, roleId) => {
    setSavingId(itemId);
    try {
      await assignMut.mutateAsync({ itemId, roleId });
    } finally {
      setSavingId(null);
    }
  };
  const handleClear = async (itemId) => {
    setSavingId(itemId);
    try {
      await clearMut.mutateAsync(itemId);
    } finally {
      setSavingId(null);
    }
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
      else ids.forEach((id) => next.add(id));
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
      toast.success(
        `Role assigned to ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}`,
      );
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
      await Promise.all(
        [...selectedIds].map((itemId) => clearMealRole(itemId)),
      );
      await qc.invalidateQueries({ queryKey: ["meal-role-items"] });
      toast.success(
        `Role cleared from ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}`,
      );
      setSelectedIds(new Set());
      setBulkRoleId("");
    } catch {
      toast.error("Some clear operations failed — please retry");
    } finally {
      setBulkSaving(false);
    }
  };

  // ── Grouping ───────────────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      filter.trim()
        ? items.filter((i) =>
            i.itemName.toLowerCase().includes(filter.toLowerCase()),
          )
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
    <>
      <AdminHeader
        title="Meal Roles"
        description="Assign Main · Side · Drink · Dessert roles to menu items. Used by the 'Complete Your Meal' feature."
      />
      <div className="p-4 space-y-4 md:space-y-6">
        {/* Stats strip */}
        <div className="flex flex-wrap gap-3">
          {roles.map((role) => {
            const count = items.filter((i) => i.roleName === role.name).length;
            return (
              <div
                key={role.id}
                className={cn(
                  "inline-flex items-center gap-2 border text-xs font-medium px-3 py-1.5 rounded-sm",
                  ROLE_COLORS[role.name] ?? ROLE_COLORS.Addon,
                )}
              >
                {role.name}
                <Badge className="bg-white/60 text-foreground">
                  {count}
                </Badge>
              </div>
            );
          })}
          <div className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 text-xs font-medium px-3 py-1.5 rounded-sm text-zinc-600">
            No role
            <Badge className="bg-white/80 text-foreground">
              {items.filter((i) => !i.roleName).length}
            </Badge>
          </div>
        </div>

        {/* Search + select-all */}
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            type="search"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setSelectedIds(new Set());
            }}
            placeholder="Search items…"
            className="max-w-xs"
          />
          {selectedIds.size > 0 && (
            <span className="text-xs text-zinc-500">
              <span className="font-semibold text-orange-600">
                {selectedIds.size}
              </span>{" "}
              selected
            </span>
          )}
        </div>

        {/* ── Sticky Bulk Assign Bar ── */}
        {selectedIds.size > 0 && (
          <div className="sticky top-15 z-50 shadow-sm px-4 py-2 bg-white rounded-lg border border-zinc-200 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-primary">
              {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
            </span>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <select
                value={bulkRoleId}
                onChange={(e) => setBulkRoleId(e.target.value)}
                disabled={bulkSaving}
                className="text-sm rounded-sm border bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="">— Pick a role —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                size="sm"
                disabled={!bulkRoleId || bulkSaving}
                onClick={handleBulkAssign}
              >
                {bulkSaving ? "Saving…" : "Assign to all"}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkSaving}
                onClick={handleBulkClear}
              >
                Clear roles
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Category groups ── */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-xl bg-zinc-100 animate-pulse"
              />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
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
    </>
  );
}
