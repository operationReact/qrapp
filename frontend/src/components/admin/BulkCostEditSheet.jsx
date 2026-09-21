import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkUpdateEstimatedCosts } from "@/services/menu-service";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  WarningCircleIcon,
  CheckCircleIcon,
  CurrencyInrIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { ButtonGroup } from "../ui/button-group";
import { useLocation as useActiveLocation } from "@/context/LocationContext";

// ── helpers ──────────────────────────────────────────────────────────────────

function calcMargin(price, cost) {
  const p = Number(price);
  const c = Number(cost);
  if (!p || p <= 0 || isNaN(c) || cost === "" || cost == null) return null;
  return (((p - c) / p) * 100).toFixed(1);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BulkCostEditSheet({ open, onOpenChange, items = [] }) {
  const queryClient = useQueryClient();
  const { activeLocationId } = useActiveLocation();

  // localCosts: { [itemId]: string } — tracks edited values in this session
  const [localCosts, setLocalCosts] = useState({});
  const [filterMissing, setFilterMissing] = useState(false);
  const [search, setSearch] = useState("");

  // Reset state when sheet opens
  const handleOpenChange = (next) => {
    if (next) {
      setLocalCosts({});
      setFilterMissing(false);
      setSearch("");
    }
    onOpenChange(next);
  };

  const saveMutation = useMutation({
    mutationFn: (updates) => bulkUpdateEstimatedCosts(updates, activeLocationId),
    onSuccess: (data) => {
      toast.success(`Costs updated`, {
        description: `${data.updated} item${data.updated !== 1 ? "s" : ""} updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ["menu", activeLocationId] });
      handleOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to save costs. Please try again.");
    },
  });

  const handleCostChange = (id, value) => {
    setLocalCosts((prev) => ({ ...prev, [id]: value }));
  };

  // Build the list of pending saves (only items whose cost was actually changed)
  const pendingUpdates = useMemo(() => {
    return Object.entries(localCosts)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)) && Number(v) >= 0)
      .map(([id, v]) => ({ id: Number(id), estimatedCost: Number(v) }));
  }, [localCosts]);

  const handleSave = () => {
    if (pendingUpdates.length === 0) {
      toast.info("No changes to save.");
      return;
    }
    saveMutation.mutate(pendingUpdates);
  };

  // Derived display list
  const displayItems = useMemo(() => {
    let list = items;
    if (filterMissing) {
      list = list.filter((item) => {
        const localCost = localCosts[item.id];
        const hasCost =
          localCost !== undefined
            ? localCost !== "" && !isNaN(Number(localCost))
            : item.estimatedCost != null;
        return !hasCost;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((item) => item.name?.toLowerCase().includes(q));
    }
    return list;
  }, [items, filterMissing, search, localCosts]);

  // Coverage stats
  const activeItems = useMemo(() => items.filter((i) => i.available), [items]);
  const coveredActive = useMemo(
    () =>
      activeItems.filter((i) => {
        const lc = localCosts[i.id];
        return lc !== undefined
          ? lc !== "" && !isNaN(Number(lc))
          : i.estimatedCost != null;
      }).length,
    [activeItems, localCosts],
  );

  const coveragePct =
    activeItems.length > 0
      ? Math.round((coveredActive / activeItems.length) * 100)
      : 100;

  const missingCount = activeItems.length - coveredActive;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader className="border-b">
          <SheetTitle className="font-semibold">Set Estimated Costs</SheetTitle>
          <SheetDescription>
            Set per-unit production cost for each menu item to enable
            profitability reporting.
          </SheetDescription>
        </SheetHeader>

        {/* Coverage strip */}
        <div
          className={cn(
            "rounded-lg mx-4 border py-4 px-2 items-center gap-3 shrink-0",
            coveragePct === 100
              ? "bg-emerald-50 border-emerald-200"
              : missingCount > 0
                ? "bg-amber-50 border-amber-200"
                : "bg-zinc-50 border-zinc-200",
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {missingCount > 0 ? (
                <WarningCircleIcon
                  weight="fill"
                  className="size-4 text-amber-500 shrink-0"
                />
              ) : (
                <CheckCircleIcon
                  weight="fill"
                  className="size-4 text-emerald-500 shrink-0"
                />
              )}
              <span className="text-sm font-semibold">
                {coveragePct}% cost coverage
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 ml-6">
              {coveredActive} of {activeItems.length} active items have a cost
              set.
            </p>
            {missingCount > 0 && (
              <Badge className="ml-6 mt-2 bg-amber-100 text-amber-700 border-amber-300 text-xs">
                {missingCount} active item{missingCount !== 1 ? "s" : ""}{" "}
                missing cost
              </Badge>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex px-4 gap-2 shrink-0">
          <ButtonGroup className="w-full">
            <InputGroup>
              <InputGroupAddon>
                <MagnifyingGlassIcon />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search items…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
            <Button
              size="xs"
              variant={filterMissing ? "branded-secondary" : "outline"}
              className="h-9"
              onClick={() => setFilterMissing((v) => !v)}
            >
              <WarningCircleIcon weight={filterMissing ? "fill" : "regular"} />
              Missing Only
            </Button>
          </ButtonGroup>
        </div>

        {/* Item list */}
        <div className="flex-1 px-4 overflow-y-auto space-y-2 -mr-0.5 no-scrollbar">
          {displayItems.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {filterMissing
                ? "All active items have a cost set 🎉"
                : "No items found."}
            </div>
          )}
          {displayItems.map((item) => {
            const currentCost =
              localCosts[item.id] !== undefined
                ? localCosts[item.id]
                : item.estimatedCost != null
                  ? String(item.estimatedCost)
                  : "";

            const hasLocalCost =
              currentCost !== "" && !isNaN(Number(currentCost));
            const isDirty = localCosts[item.id] !== undefined;
            const margin = calcMargin(item.price, currentCost);
            const isMissing = !hasLocalCost && item.available;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                  isMissing
                    ? "border-amber-200 bg-amber-50/50"
                    : isDirty
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-zinc-100 bg-white hover:bg-zinc-50/60",
                )}
              >
                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">
                      {item.name}
                    </span>
                    {!item.available && (
                      <Badge className="bg-zinc-100 text-zinc-500 shrink-0">
                        Draft
                      </Badge>
                    )}
                    {isDirty && (
                      <Badge className="bg-emerald-100 text-emerald-700 shrink-0">
                        Modified
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>₹{item.price}</span>
                    {margin != null && (
                      <span
                        className={cn(
                          "font-medium",
                          Number(margin) >= 60
                            ? "text-emerald-600"
                            : Number(margin) >= 30
                              ? "text-amber-600"
                              : "text-red-600",
                        )}
                      >
                        → {margin}% margin
                      </span>
                    )}
                  </div>
                </div>

                {/* Cost input */}
                <div className="relative w-28 shrink-0">
                  <CurrencyInrIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentCost}
                    onChange={(e) => handleCostChange(item.id, e.target.value)}
                    placeholder="0.00"
                    className="pl-6 h-8 text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <SheetFooter className="border-t pt-3 gap-2 shrink-0">
          <div className="text-xs text-muted-foreground flex-1 self-center">
            {pendingUpdates.length > 0
              ? `${pendingUpdates.length} change${pendingUpdates.length !== 1 ? "s" : ""} ready to save`
              : "No changes yet"}
          </div>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || pendingUpdates.length === 0}
          >
            {saveMutation.isPending
              ? "Saving…"
              : `Save ${pendingUpdates.length > 0 ? `(${pendingUpdates.length})` : ""}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

BulkCostEditSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  items: PropTypes.array,
};
