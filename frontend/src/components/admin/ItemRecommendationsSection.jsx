import { useState, useEffect, useReducer, useRef } from "react";
import PropTypes from "prop-types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, baseURL } from "@/services";
import {
  fetchRecommendationsForItem,
  addRecommendation,
  deleteRecommendation,
  toggleRecommendation,
  updateRecommendationOrder,
} from "@/services/recommendation-service";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  ListPlusIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { GripVertical, Plus, Search, Loader2 } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function byOrderAsc(list) {
  return [...list].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${baseURL}${url}`;
}

// ── Recommendation card (draggable) ──────────────────────────────────────────

function RecCard({
  rec, onRemove, onToggle,
  onDragStart, onDragOver, onDrop, onDragEnd,
  isDragOver, isDragging,
  removing, toggling,
}) {
  const src = resolveImg(rec.targetItemImageUrl);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, rec)}
      onDragOver={(e) => onDragOver(e, rec)}
      onDrop={(e) => onDrop(e, rec)}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all",
        "cursor-grab active:cursor-grabbing select-none",
        isDragOver
          ? "border-primary/50 bg-primary/5 shadow-sm scale-[1.01]"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm",
        isDragging && "opacity-40",
        !rec.isActive && "opacity-60",
      )}
    >
      {/* Drag handle */}
      <GripVertical className="size-3.5 text-zinc-300 group-hover:text-zinc-400 shrink-0 transition-colors" />

      {/* Thumbnail */}
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
        {src ? (
          <img src={src} alt={rec.targetItemName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-300">🍽️</div>
        )}
      </div>

      {/* Name + price */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium leading-tight truncate", !rec.isActive && "line-through text-zinc-400")}>
          {rec.targetItemName}
        </p>
        {rec.targetItemPrice > 0 && (
          <p className="text-[11px] text-zinc-400 mt-0.5">
            ₹{Number(rec.targetItemPrice).toFixed(0)}
          </p>
        )}
      </div>

      {/* Active toggle */}
      <Switch
        checked={!!rec.isActive}
        onCheckedChange={() => onToggle(rec.id)}
        disabled={toggling}
        className="shrink-0 cursor-pointer"
        aria-label={rec.isActive ? "Deactivate" : "Activate"}
      />

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(rec.id)}
        disabled={removing}
        className="shrink-0 text-zinc-300 hover:text-red-500 transition-colors disabled:opacity-40"
        aria-label={`Remove ${rec.targetItemName}`}
      >
        {removing
          ? <Loader2 className="size-3.5 animate-spin" />
          : <XCircleIcon weight="fill" className="size-3.5" />}
      </button>
    </div>
  );
}

RecCard.propTypes = {
  rec:          PropTypes.object.isRequired,
  onRemove:     PropTypes.func.isRequired,
  onToggle:     PropTypes.func.isRequired,
  onDragStart:  PropTypes.func.isRequired,
  onDragOver:   PropTypes.func.isRequired,
  onDrop:       PropTypes.func.isRequired,
  onDragEnd:    PropTypes.func.isRequired,
  isDragOver:   PropTypes.bool,
  isDragging:   PropTypes.bool,
  removing:     PropTypes.bool,
  toggling:     PropTypes.bool,
};

// ── Add-item search popover ───────────────────────────────────────────────────

function AddPopover({ itemId, existingTargetIds, menuItems, onAdd, adding }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");
  const ref             = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const filtered = menuItems
    .filter((m) => !existingTargetIds.has(m.id) && m.id !== itemId)
    .filter((m) => !q.trim() || m.name?.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 20);

  const pick = (item) => { onAdd(item); setQ(""); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={adding}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border",
          "border-dashed border-orange-300 text-orange-600 hover:border-orange-400 hover:bg-orange-50",
          "transition-colors disabled:opacity-50",
        )}
      >
        {adding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        Add recommendation
      </button>

      {open && (
        <div className="absolute z-50 top-full right-0 mt-1.5 w-64 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search menu items…"
                className="w-full pl-7 pr-2 py-1.5 text-[12px] bg-muted/40 rounded-md outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
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
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                      {src
                        ? <img src={src} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[9px]">🍽️</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-zinc-700 truncate">{item.name}</p>
                      {item.sellingPrice > 0 && (
                        <p className="text-[10px] text-zinc-400">₹{Number(item.sellingPrice).toFixed(0)}</p>
                      )}
                    </div>
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
  itemId:            PropTypes.number.isRequired,
  existingTargetIds: PropTypes.instanceOf(Set).isRequired,
  menuItems:         PropTypes.array.isRequired,
  onAdd:             PropTypes.func.isRequired,
  adding:            PropTypes.bool,
};

// ── Reducer ───────────────────────────────────────────────────────────────────

function recsReducer(state, action) {
  switch (action.type) {
    case "LOAD":
      return byOrderAsc(action.payload);
    case "ADD":
      return byOrderAsc([...state.filter((r) => r.id !== action.payload.id), action.payload]);
    case "REMOVE":
      return state.filter((r) => r.id !== action.payload);
    case "TOGGLE":
      return state.map((r) => r.id === action.payload ? { ...r, isActive: !r.isActive } : r);
    case "REORDER":
      return action.payload;
    case "REVERT":
      return byOrderAsc(action.payload ?? []);
    default:
      return state;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Per-item "Goes Well With" recommendation manager.
 *
 * Shows all L1 manual recommendations where `itemId` is the source item.
 * Supports add, remove, toggle active, and drag-to-reorder.
 */
export default function ItemRecommendationsSection({ itemId }) {
  const qc = useQueryClient();

  const { data: serverRecs, isLoading } = useQuery({
    queryKey: ["item-recs", itemId],
    queryFn:  () => fetchRecommendationsForItem(itemId),
    enabled:  !!itemId,
    staleTime: 1000 * 30,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu", "rec-picker"],
    queryFn:  () => apiClient.get("/menu").then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const [local, dispatch]      = useReducer(recsReducer, []);
  const [adding, setAdding]    = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [drag, setDrag]        = useState({ id: null, overId: null });

  useEffect(() => {
    if (serverRecs) dispatch({ type: "LOAD", payload: serverRecs });
  }, [serverRecs]);

  // ── Add mutation ──────────────────────────────────────────────────────────
  const addMut = useMutation({
    mutationFn: addRecommendation,
    onSuccess: (created) => {
      dispatch({ type: "ADD", payload: created });
      toast.success("Recommendation added");
      qc.invalidateQueries({ queryKey: ["item-recs", itemId] });
      qc.invalidateQueries({ queryKey: ["growth", "recommendations"] });
    },
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to add recommendation"),
    onSettled: () => setAdding(false),
  });

  // ── Remove mutation ───────────────────────────────────────────────────────
  const removeMut = useMutation({
    mutationFn: deleteRecommendation,
    onSuccess: (_data, id) => {
      dispatch({ type: "REMOVE", payload: id });
      toast.success("Recommendation removed");
      qc.invalidateQueries({ queryKey: ["item-recs", itemId] });
      qc.invalidateQueries({ queryKey: ["growth", "recommendations"] });
    },
    onError: () => toast.error("Failed to remove recommendation"),
    onSettled: () => setRemovingId(null),
  });

  // ── Toggle mutation ───────────────────────────────────────────────────────
  const toggleMut = useMutation({
    mutationFn: toggleRecommendation,
    onSuccess: (_data, id) => {
      dispatch({ type: "TOGGLE", payload: id });
      qc.invalidateQueries({ queryKey: ["item-recs", itemId] });
      qc.invalidateQueries({ queryKey: ["growth", "recommendations"] });
    },
    onError: () => toast.error("Failed to update recommendation"),
    onSettled: () => setTogglingId(null),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAdd = (menuItem) => {
    setAdding(true);
    const maxOrder = Math.max(0, ...local.map((r) => r.displayOrder ?? 0));
    addMut.mutate({ sourceItemId: itemId, targetItemId: menuItem.id, displayOrder: maxOrder + 1 });
  };

  const handleRemove = (id) => {
    setRemovingId(id);
    removeMut.mutate(id);
  };

  const handleToggle = (id) => {
    setTogglingId(id);
    toggleMut.mutate(id);
  };

  // Drag handlers
  const onDragStart = (e, rec) => {
    setDrag((d) => ({ ...d, id: rec.id }));
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e, rec) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (drag.overId !== rec.id) setDrag((d) => ({ ...d, overId: rec.id }));
  };
  const onDrop = (e, target) => {
    e.preventDefault();
    const { id: dragId } = drag;
    setDrag({ id: null, overId: null });
    if (!dragId || dragId === target.id) return;

    const dragIdx   = local.findIndex((r) => r.id === dragId);
    const targetIdx = local.findIndex((r) => r.id === target.id);
    if (dragIdx < 0 || targetIdx < 0) return;

    const reordered = [...local];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    // Assign new displayOrder values
    const updated = reordered.map((r, i) => ({ ...r, displayOrder: i + 1 }));
    dispatch({ type: "REORDER", payload: updated });

    // Persist all order changes
    Promise.all(updated.map((r) => updateRecommendationOrder(r.id, r.displayOrder)))
      .then(() => qc.invalidateQueries({ queryKey: ["item-recs", itemId] }))
      .catch(() => {
        dispatch({ type: "REVERT", payload: serverRecs });
        toast.error("Failed to save order");
      });
  };
  const onDragEnd = () => setDrag({ id: null, overId: null });

  const existingTargetIds = new Set(local.map((r) => r.targetItemId));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <ListPlusIcon weight="fill" className="size-4 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Goes Well With</p>
            <p className="text-[11px] text-muted-foreground">
              Items recommended in the cart. Drag to reorder.
            </p>
          </div>
        </div>
        <AddPopover
          itemId={itemId}
          existingTargetIds={existingTargetIds}
          menuItems={menuItems}
          onAdd={handleAdd}
          adding={adding}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading recommendations…
        </div>
      ) : local.length === 0 ? (
        <div className="text-center py-6 rounded-lg border border-dashed border-zinc-200">
          <p className="text-[13px] text-zinc-400">
            No recommendations yet.
          </p>
          <p className="text-[11px] text-zinc-300 mt-0.5">
            Click "Add recommendation" to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {local.map((rec) => (
            <RecCard
              key={rec.id}
              rec={rec}
              onRemove={handleRemove}
              onToggle={handleToggle}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              isDragOver={drag.overId === rec.id}
              isDragging={drag.id === rec.id}
              removing={removingId === rec.id}
              toggling={togglingId === rec.id}
            />
          ))}
        </div>
      )}

      {local.length > 0 && (
        <p className="text-[10px] text-zinc-400 text-right">
          {local.filter((r) => r.isActive).length} active · {local.length} total
        </p>
      )}
    </div>
  );
}

ItemRecommendationsSection.propTypes = {
  itemId: PropTypes.number.isRequired,
};

