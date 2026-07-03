import { useQuery } from "@tanstack/react-query";
import PropTypes from "prop-types";
import { fetchItemClassification } from "@/services/classification-service";
import { categoryPairingsOptions } from "@/query/options/recommendations";
import { computePairingHealth } from "@/lib/pairingHealth";
import { apiClient } from "@/services";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";

/**
 * Self-contained Recommendation Health Badge.
 *
 * Fetches source + target classification via React Query (fully deduped –
 * if the cache already holds those entries, no network call is made).
 * Renders a coloured tier pill that opens a popover with factor breakdown.
 *
 * Props:
 *   sourceItemId       – menu item ID of the "source" (item being viewed)
 *   targetItemId       – menu item ID of the "recommended" item
 *   hasExplicitPairing – whether the pair is explicitly configured (default: true)
 */
export default function PairingHealthBadge({
  sourceItemId,
  targetItemId,
  hasExplicitPairing = true,
}) {
  // ── Fetch source classification ─────────────────────────────────────────
  const { data: sourceClassif, isLoading: srcLoading } = useQuery({
    queryKey: ["item-classification", sourceItemId],
    queryFn:  () => fetchItemClassification(sourceItemId),
    enabled:  !!sourceItemId,
    staleTime: 1000 * 60 * 5,
  });

  // ── Fetch target classification ─────────────────────────────────────────
  const { data: targetClassif, isLoading: tgtLoading } = useQuery({
    queryKey: ["item-classification", targetItemId],
    queryFn:  () => fetchItemClassification(targetItemId),
    enabled:  !!targetItemId,
    staleTime: 1000 * 60 * 5,
  });

  // ── Category pairings – shared global cache ──────────────────────────────
  const { data: categoryPairings = [] } = useQuery(categoryPairingsOptions);

  // ── Menu items – same cache key as PairingsSection's add-popover ─────────
  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu", "pairing-picker"],
    queryFn:  () => apiClient.get("/menu").then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  // ── Loading state ────────────────────────────────────────────────────────
  if (srcLoading || tgtLoading) {
    return <Loader2 className="size-3 animate-spin text-zinc-300 shrink-0" />;
  }

  // ── Resolve category IDs from the menu item cache ────────────────────────
  const srcItem         = menuItems.find(m => m.id === sourceItemId);
  const tgtItem         = menuItems.find(m => m.id === targetItemId);
  const sourceCategoryId = srcItem?.category?.id ?? null;
  const targetCategoryId = tgtItem?.category?.id ?? null;

  // ── Compute health ───────────────────────────────────────────────────────
  const health = computePairingHealth({
    sourceClassif,
    targetClassif,
    categoryPairings,
    sourceCategoryId,
    targetCategoryId,
    hasExplicitPairing,
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={e => e.stopPropagation()}
          className={cn(
            "inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full border",
            "cursor-pointer transition-opacity hover:opacity-75 shrink-0",
            health.badge,
          )}
        >
          {health.label}
        </button>
      </PopoverTrigger>

      <PopoverContent side="left" sideOffset={8} className="w-56 p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className={cn("size-2 rounded-full shrink-0", health.dot)} />
          <p className="text-[11px] font-semibold text-zinc-800">{health.label}</p>
        </div>

        {/* Factor reasons */}
        <div className="space-y-1.5">
          {health.reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              {r.ok
                ? <CheckCircleIcon  weight="fill" className="size-3.5 text-emerald-500 shrink-0 mt-px" />
                : <WarningCircleIcon weight="fill" className="size-3.5 text-amber-500  shrink-0 mt-px" />
              }
              <span className={r.ok ? "text-zinc-700" : "text-amber-700"}>
                {r.ok ? "✓" : "⚠"} {r.text}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

PairingHealthBadge.propTypes = {
  sourceItemId:       PropTypes.number.isRequired,
  targetItemId:       PropTypes.number.isRequired,
  hasExplicitPairing: PropTypes.bool,
};

