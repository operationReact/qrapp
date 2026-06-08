import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { ForkKnifeIcon, XCircleIcon } from "@phosphor-icons/react";

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

function ItemRow({ item, roles, onAssign, onClear, saving }) {
  const src = resolveImg(item.imageUrl);
  const isSaving = saving === item.itemId;

  return (
    <tr className="border-b border-zinc-100 hover:bg-zinc-50/60 transition-colors">
      {/* Image + name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
            {src ? (
              <img src={src} alt={item.itemName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-300 text-lg">
                🍽️
              </div>
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
          <span
            className={cn(
              "inline-flex items-center gap-1 border text-xs font-semibold px-2 py-0.5 rounded-full",
              ROLE_COLORS[item.roleName] ?? ROLE_COLORS.Addon,
            )}
          >
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
            defaultValue={item.roleId ?? ""}
            disabled={isSaving}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                onClear(item.itemId);
              } else {
                onAssign(item.itemId, Number(val));
              }
            }}
            className="text-xs rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400/40 disabled:opacity-50 cursor-pointer"
          >
            <option value="">— No role —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Clear button (only when role set) */}
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

          {/* Saving indicator */}
          {isSaving && (
            <span className="text-[10px] text-orange-500 font-medium animate-pulse">
              Saving…
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function MealRolesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [savingId, setSavingId] = useState(null);

  const { data: roles   = [], isLoading: rolesLoading } = useQuery({ queryKey: ["meal-roles"],        queryFn: fetchMealRoles,          staleTime: Infinity });
  const { data: items   = [], isLoading: itemsLoading } = useQuery({ queryKey: ["meal-role-items"],   queryFn: fetchItemsWithMealRoles, staleTime: 0 });

  const assignMut = useMutation({
    mutationFn: ({ itemId, roleId }) => assignMealRole(itemId, roleId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["meal-role-items"] }),
  });
  const clearMut  = useMutation({
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

  const filtered = items.filter((i) =>
    i.itemName.toLowerCase().includes(filter.toLowerCase()),
  );

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
              <span className="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px]">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search items…"
        className="w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
      />

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-zinc-400 animate-pulse">
            Loading items…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">
            No items found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Item
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Current Role
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Assign Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <ItemRow
                    key={item.itemId}
                    item={item}
                    roles={roles}
                    onAssign={handleAssign}
                    onClear={handleClear}
                    saving={savingId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

