import { useState, useEffect, useRef, useReducer } from "react";
import PropTypes from "prop-types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, baseURL } from "@/services";
import {
  fetchItemPairingsList,
  addItemPairing,
  removeItemPairing,
  updatePairingPriority,
} from "@/services/recommendation-service";
import { cn } from "@/lib/utils";
import { XCircleIcon, LinkSimpleIcon } from "@phosphor-icons/react";
import { GripVertical, Plus, Search, Loader2 } from "lucide-react";
import PairingHealthBadge from "@/components/admin/PairingHealthBadge";
import { useLocation as useActiveLocation } from "@/context/LocationContext";

// ── Util ──────────────────────────────────────────────────────────────────────

function byPriorityDesc(list) {
  return [...list].sort((a, b) => b.priority - a.priority);
}

// ── Role configuration ────────────────────────────────────────────────────────

const ROLES = [
  {
    key:           "DRINK",
    label:         "Drinks",
    singularLabel: "drink",
    dot:           "bg-blue-400",
    header:        "text-blue-700",
    chip:          "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key:           "SIDE",
    label:         "Sides",
    singularLabel: "side",
    dot:           "bg-green-400",
    header:        "text-green-700",
    chip:          "bg-green-50 text-green-700 border-green-200",
  },
  {
    key:           "DESSERT",
    label:         "Desserts",
    singularLabel: "dessert",
    dot:           "bg-pink-400",
    header:        "text-pink-700",
    chip:          "bg-pink-50 text-pink-700 border-pink-200",
  },
  {
    key:           "ADDON",
    label:         "Addons",
    singularLabel: "addon",
    dot:           "bg-zinc-400",
    header:        "text-zinc-600",
    chip:          "bg-zinc-50 text-zinc-600 border-zinc-200",
  },
];

function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${baseURL}${url}`;
}

// ── Pairing card (draggable) ──────────────────────────────────────────────────

function PairingCard({
  pairing, onRemove, onDragStart, onDragOver, onDrop, onDragEnd,
  isDragOver, isDragging, removing,
  sourceItemId,
}) {
  const src = resolveImg(pairing.targetItemImageUrl);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, pairing)}
      onDragOver={(e) => onDragOver(e, pairing)}
      onDrop={(e) => onDrop(e, pairing)}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all",
        "cursor-grab active:cursor-grabbing select-none",
        isDragOver
          ? "border-primary/50 bg-primary/5 shadow-sm scale-[1.01]"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm",
        isDragging && "opacity-40",
      )}
    >
      {/* Drag handle */}
      <GripVertical className="size-3.5 text-zinc-300 group-hover:text-zinc-400 shrink-0 transition-colors" />

      {/* Thumbnail */}
      <div className="w-7 h-7 rounded-md overflow-hidden bg-zinc-100 shrink-0">
        {src ? (
          <img src={src} alt={pairing.targetItemName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-300">🍽️</div>
        )}
      </div>

      {/* Name + health badge + price */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[12px] font-medium text-zinc-800 leading-tight truncate flex-1 min-w-0">
            {pairing.targetItemName}
          </p>
          {sourceItemId && (
            <PairingHealthBadge
              sourceItemId={sourceItemId}
              targetItemId={pairing.targetItemId}
            />
          )}
        </div>
        {pairing.targetItemPrice > 0 && (
          <p className="text-[10px] text-zinc-400 leading-none mt-0.5">
            ₹{Number(pairing.targetItemPrice).toFixed(0)}
          </p>
        )}
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(pairing.id)}
        disabled={removing}
        className="shrink-0 text-zinc-300 hover:text-red-500 transition-colors disabled:opacity-40"
        aria-label={`Remove ${pairing.targetItemName}`}
      >
        {removing
          ? <Loader2 className="size-3.5 animate-spin" />
          : <XCircleIcon weight="fill" className="size-3.5" />}
      </button>
    </div>
  );
}
PairingCard.propTypes = {
  pairing:      PropTypes.object.isRequired,
  onRemove:     PropTypes.func.isRequired,
  onDragStart:  PropTypes.func.isRequired,
  onDragOver:   PropTypes.func.isRequired,
  onDrop:       PropTypes.func.isRequired,
  onDragEnd:    PropTypes.func.isRequired,
  isDragOver:   PropTypes.bool,
  isDragging:   PropTypes.bool,
  removing:     PropTypes.bool,
  sourceItemId: PropTypes.number,
};

// ── Add-pairing search popover ────────────────────────────────────────────────

function AddPopover({ role, itemId, existingIds, menuItems, onAdd, adding }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");
  const ref             = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const filtered = menuItems
    .filter((m) => !existingIds.has(m.id) && m.id !== itemId)
    .filter((m) => !q.trim() || m.name?.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 20);

  const pick = (item) => { onAdd(item, role.key); setQ(""); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={adding}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border",
          "border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700",
          "transition-colors disabled:opacity-50",
        )}
      >
        {adding ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
        Add {role.singularLabel}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1.5 w-60 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-zinc-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search items…"
                className="w-full pl-6 pr-2 py-1 text-[12px] bg-muted/40 rounded-md outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-[11px] text-muted-foreground italic">
                {q ? "No items match" : "No more items to add"}
              </p>
            ) : (
              filtered.map((item) => {
                const src = resolveImg(item.imageUrl);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => pick(item)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded overflow-hidden bg-zinc-100 shrink-0">
                      {src
                        ? <img src={src} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[9px]">🍽️</div>
                      }
                    </div>
                    <span className="text-[12px] font-medium text-zinc-700 truncate">{item.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
AddPopover.propTypes = {
  role: PropTypes.object.isRequired,
  itemId: PropTypes.number.isRequired,
  existingIds: PropTypes.instanceOf(Set).isRequired,
  menuItems: PropTypes.array.isRequired,
  onAdd: PropTypes.func.isRequired,
  adding: PropTypes.bool,
};

// ── Role group ────────────────────────────────────────────────────────────────

const MAX_PER_ROLE = 5;

function RoleGroup({ role, pairings, itemId, menuItems, onAdd, onRemove, onReorder, addingRole, removingId }) {
  const [drag, setDrag] = useState({ id: null, overId: null });
  const existingIds = new Set(pairings.map((p) => p.targetItemId));

  const onDragStart = (e, p) => {
    setDrag((d) => ({ ...d, id: p.id }));
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e, p) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (drag.overId !== p.id) setDrag((d) => ({ ...d, overId: p.id }));
  };
  const onDrop = (e, target) => {
    e.preventDefault();
    const { id: dragId } = drag;
    setDrag({ id: null, overId: null });
    if (!dragId || dragId === target.id) return;
    const dragIdx   = pairings.findIndex((p) => p.id === dragId);
    const targetIdx = pairings.findIndex((p) => p.id === target.id);
    if (dragIdx < 0 || targetIdx < 0) return;
    const reordered = [...pairings];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    onReorder(role.key, reordered);
  };
  const onDragEnd = () => setDrag({ id: null, overId: null });

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full shrink-0", role.dot)} />
          <span className={cn("text-xs font-semibold", role.header)}>
            {role.label}
          </span>
          <span className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
            pairings.length >= MAX_PER_ROLE
              ? "bg-amber-100 text-amber-700"
              : "text-zinc-400",
          )}>
            {pairings.length}/{MAX_PER_ROLE}
          </span>
        </div>
        {pairings.length >= MAX_PER_ROLE ? (
          <span
            title={`Max ${MAX_PER_ROLE} pairings per group. Remove one to add another.`}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border border-dashed border-amber-300 text-amber-600 cursor-not-allowed select-none"
          >
            Limit reached
          </span>
        ) : (
          <AddPopover
            role={role}
            itemId={itemId}
            existingIds={existingIds}
            menuItems={menuItems}
            onAdd={onAdd}
            adding={addingRole === role.key}
          />
        )}
      </div>

      {/* Cards */}
      {pairings.length === 0 ? (
        <p className="text-[11px] text-zinc-400 italic py-0.5 pl-1">
          No {role.singularLabel} pairings — add one above.
        </p>
      ) : (
        <div className="space-y-1.5">
          {pairings.map((p) => (
            <PairingCard
              key={p.id}
              pairing={p}
              onRemove={onRemove}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              isDragOver={drag.overId === p.id}
              isDragging={drag.id === p.id}
              removing={removingId === p.id}
              sourceItemId={itemId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
RoleGroup.propTypes = {
  role: PropTypes.object.isRequired,
  pairings: PropTypes.array.isRequired,
  itemId: PropTypes.number.isRequired,
  menuItems: PropTypes.array.isRequired,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired,
  addingRole: PropTypes.string,
  removingId: PropTypes.number,
};

// ── Pairings reducer (mirrors ClassificationSection pattern) ─────────────────

function pairingsReducer(state, action) {
  switch (action.type) {
    case "LOAD":
      return byPriorityDesc(action.payload);
    case "ADD":
      return byPriorityDesc([...state.filter((p) => p.id !== action.payload.id), action.payload]);
    case "REMOVE":
      return state.filter((p) => p.id !== action.payload);
    case "REORDER_ROLE": {
      const others = state.filter((p) => p.pairingRole !== action.roleKey);
      return byPriorityDesc([...others, ...action.items]);
    }
    case "REVERT":
      return byPriorityDesc(action.payload ?? []);
    default:
      return state;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function PairingsSection({ itemId }) {
  const qc = useQueryClient();
  const { activeLocationId } = useActiveLocation();

  // ── Server state ─────────────────────────────────────────────────────────
  const { data: serverPairings, isLoading } = useQuery({
    queryKey: ["item-pairings", activeLocationId, itemId],
    queryFn:  () => fetchItemPairingsList(itemId, activeLocationId),
    enabled:  !!itemId && !!activeLocationId,
    staleTime: 1000 * 30,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu", "pairing-picker", JSON.parse(localStorage.getItem("active-location") || "null")?.id],
    queryFn:  () => apiClient.get("/menu", { params: { locationId: JSON.parse(localStorage.getItem("active-location") || "null")?.id } }).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });

  // ── Local optimistic state (useReducer mirrors ClassificationSection) ─────
  const [local, dispatch]          = useReducer(pairingsReducer, []);
  const [addingRole, setAddingRole] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  // Sync server → local (same pattern as ClassificationSection's "LOAD")
  useEffect(() => {
    if (serverPairings) dispatch({ type: "LOAD", payload: serverPairings });
  }, [serverPairings]);

  // ── Add mutation (optimistic) ─────────────────────────────────────────────
  const addMut = useMutation({
    mutationFn: addItemPairing,
    // Optimistic: insert a temp entry immediately so the user sees it right away
    onMutate: ({ targetItemId, pairingRole, priority }) => {
      const tempId   = -(Date.now()); // negative temp ID so it won't clash with real IDs
      const menuItem = menuItems.find((m) => m.id === targetItemId);
      const tempPairing = {
        id:                  tempId,
        sourceItemId:        itemId,
        targetItemId,
        targetItemName:      menuItem?.name       ?? "Adding…",
        targetItemImageUrl:  menuItem?.imageUrl   ?? null,
        targetItemPrice:     menuItem?.price      ?? 0,
        pairingRole,
        priority,
        isActive: true,
      };
      dispatch({ type: "ADD", payload: tempPairing });
      return { tempId };
    },
    onSuccess: (created, _vars, context) => {
      // Swap temp entry for the real one from the server
      dispatch({ type: "REMOVE", payload: context.tempId });
      dispatch({ type: "ADD",    payload: created });
      toast.success("Pairing added");
      qc.invalidateQueries({ queryKey: ["item-pairings", itemId] });
    },
    onError: (err, _vars, context) => {
      // Rollback the optimistic entry
      dispatch({ type: "REMOVE", payload: context.tempId });
      toast.error(err?.response?.data?.error ?? "Failed to add pairing");
    },
    onSettled: () => setAddingRole(null),
  });

  // ── Remove mutation ───────────────────────────────────────────────────────
  const removeMut = useMutation({
    mutationFn: (id) => removeItemPairing(id),
    onSuccess: (_data, id) => {
      dispatch({ type: "REMOVE", payload: id });
      toast.success("Pairing removed");
      qc.invalidateQueries({ queryKey: ["item-pairings", itemId] });
    },
    onError: () => toast.error("Failed to remove pairing"),
    onSettled: () => setRemovingId(null),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAdd = (menuItem, roleKey) => {
    setAddingRole(roleKey);
    const top = Math.max(0, ...local.filter((p) => p.pairingRole === roleKey).map((p) => p.priority));
    addMut.mutate({ sourceItemId: itemId, targetItemId: menuItem.id, pairingRole: roleKey, priority: top + 10 });
  };

  const handleRemove = (id) => {
    setRemovingId(id);
    removeMut.mutate(id);
  };

  const handleReorder = (roleKey, reordered) => {
    const updated = reordered.map((p, i) => ({ ...p, priority: (reordered.length - i) * 10 }));

    // Optimistic update
    dispatch({ type: "REORDER_ROLE", roleKey, items: updated });

    // Persist
    Promise.all(updated.map((p) => updatePairingPriority(p.id, p.priority)))
      .then(() => qc.invalidateQueries({ queryKey: ["item-pairings", itemId] }))
      .catch(() => {
        dispatch({ type: "REVERT", payload: serverPairings });
        toast.error("Failed to save order");
      });
  };

  const pairingsForRole = (key) => local.filter((p) => p.pairingRole === key);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="size-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
          <LinkSimpleIcon weight="fill" className="size-4 text-orange-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Recommended Pairings</p>
          <p className="text-[11px] text-muted-foreground">
            Max 5 per group · Drag to reorder priority · Top items shown to customers first.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading pairings…
        </div>
      ) : (
        <div className="space-y-4">
          {ROLES.map((role) => (
            <RoleGroup
              key={role.key}
              role={role}
              pairings={pairingsForRole(role.key)}
              itemId={itemId}
              menuItems={menuItems}
              onAdd={handleAdd}
              onRemove={handleRemove}
              onReorder={handleReorder}
              addingRole={addingRole}
              removingId={removingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

PairingsSection.propTypes = {
  itemId: PropTypes.number.isRequired,
};
