import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { baseURL } from "../../services";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  ArchiveIcon,
  CheckIcon,
  CurrencyInrIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  LeafIcon,
  PencilSimpleLineIcon,
  StarIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// ── Quality score ──────────────────────────────────────────────────────────
function computeQuality(item) {
  let score = 0;
  if (item.imageUrl)           score += 20; // has image
  if (item.estimatedCost != null) score += 20; // has cost
  if (item.category?.name)     score += 15; // has category
  if (item.description?.trim()) score += 15; // has description
  if (item.tag?.name)          score += 10; // has tag
  if (item.recommended)        score += 10; // is recommended
  if (item.available)          score += 10; // is live
  return score; // out of 100
}

function qualityTier(score) {
  if (score >= 80) return {
    label: "Excellent",
    chipCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotCls: "bg-emerald-500",
  };
  if (score >= 50) return {
    label: "Good",
    chipCls: "bg-yellow-50 text-yellow-700 border-yellow-200",
    dotCls: "bg-yellow-400",
  };
  return {
    label: "Needs Work",
    chipCls: "bg-red-50 text-red-600 border-red-200",
    dotCls: "bg-red-500",
  };
}

// ── Margin tier ────────────────────────────────────────────────────────────
function getMarginTier(pct) {
  if (pct == null) return null;
  const n = Number(pct);
  if (n >= 50) return { cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (n >= 25) return { cls: "bg-yellow-50 text-yellow-700 border-yellow-200" };
  return       { cls: "bg-red-50 text-red-600 border-red-200" };
}

// ── Reusable toggle chip ───────────────────────────────────────────────────
function ToggleChip({ active, activeClass, inactiveClass, onClick, disabled, children, title }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition-all active:scale-95 min-w-0 px-1 border",
        active ? activeClass : inactiveClass,
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      {children}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AdminMenuItem({
  item, onEdit, onDelete, onQuickUpdate, onSetCost, isUpdating, isSavingCost,
}) {
  const [imgError,         setImgError]         = useState(false);
  const [costOpen,         setCostOpen]         = useState(false);
  const [costInput,        setCostInput]        = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const costInputRef = useRef(null);

  const openCostEditor = () => {
    setCostInput(item.estimatedCost != null ? String(Number(item.estimatedCost).toFixed(0)) : "");
    setCostOpen(true);
  };

  useEffect(() => {
    if (costOpen) costInputRef.current?.focus();
  }, [costOpen]);

  const handleSaveCost = () => {
    const raw = costInput.trim();
    const val = raw === "" ? null : Number(raw);
    if (raw !== "" && (isNaN(val) || val < 0)) return;
    onSetCost(item, val);
    setCostOpen(false);
  };

  const computeImageSrc = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${baseURL}${url}`;
  };

  const imageSrc = computeImageSrc(item.imageUrl);
  const veg =
    item.isVeg === true || item.isVeg === "true" ||
    item.isVeg === 1    || item.isVeg === "1";

  const hasCost  = item.estimatedCost != null && Number(item.estimatedCost) >= 0;
  const isActive = item.available;
  const price    = Number(item.price || 0);
  const cost     = hasCost ? Number(item.estimatedCost) : 0;

  const marginPct    = hasCost && price > 0 ? (price - cost) / price * 100 : null;
  const profitAmount = hasCost && price > 0 ? price - cost : null;
  const marginTier   = getMarginTier(marginPct);

  const qualityScore = computeQuality(item);
  const tier         = qualityTier(qualityScore);

  // live preview margin while typing in cost editor
  const previewCost   = costInput !== "" && !isNaN(Number(costInput)) && Number(costInput) >= 0 ? Number(costInput) : null;
  const previewMargin = previewCost != null && price > 0
    ? ((price - previewCost) / price * 100)
    : null;

  return (
    <>
      <article
        className={cn(
          "group bg-card border border-border rounded-lg overflow-hidden transition-colors hover:border-primary/20 hover:shadow-sm",
          !isActive && "opacity-75",
        )}
      >
        {/* ══ CLICKABLE HEADER — tap anywhere here to open Edit ════════ */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onEdit(item)}
          onKeyDown={(e) => e.key === "Enter" && onEdit(item)}
          className="flex gap-2.5 p-2.5 sm:p-3 cursor-pointer hover:bg-muted/40 transition-colors"
        >
          {/* Thumbnail */}
          <div className="relative size-[68px] sm:size-[76px] shrink-0 rounded-md overflow-hidden bg-muted">
            {imageSrc && !imgError ? (
              <img
                src={imageSrc}
                alt={item.name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/25 to-primary">
                <img src="/brand/white.png" alt="" className="opacity-20 object-contain size-1/2 animate-pulse" />
              </div>
            )}
            {/* Veg/non-veg dot */}
            <div
              className={cn(
                "absolute top-1 left-1 p-0.5 border-2 bg-white rounded-sm size-4 flex items-center",
                veg ? "border-accent-400" : "border-red-600",
              )}
            >
              <span className={cn("size-full rounded-full", veg ? "bg-accent-400" : "bg-red-600")} />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            {/* Name row + quality badge */}
            <div className="flex items-start justify-between gap-1">
              <h3 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2 flex-1 min-w-0">
                {item.name}
              </h3>
              {/* Quality score badge */}
              <span className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none ml-1",
                tier.chipCls,
              )}>
                <span className={cn("size-1.5 rounded-full", tier.dotCls)} />
                {qualityScore}
              </span>
            </div>

            {/* Category · Tag */}
            <div className="flex gap-1 items-center">
              {item.category?.name && (
                <span className="text-xs text-muted-foreground capitalize shrink-0">{item.category.name}</span>
              )}
              {item.category?.name && item.tag?.name && (
                <span className="text-[10px] text-muted-foreground shrink-0">·</span>
              )}
              {item.tag?.name && (
                <span className="text-xs text-muted-foreground truncate">{item.tag.name}</span>
              )}
            </div>

            {/* ── Selling price (prominent) ─────────────────────── */}
            <p className="text-base font-bold leading-none mt-0.5">₹{item.price}</p>

            {/* ── Profit & Margin (primary business metric) ─────── */}
            {hasCost ? (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {/* Profit chip */}
                <span className={cn(
                  "inline-flex items-center gap-0.5 rounded-md border px-2 py-0.5 text-[11px] font-bold leading-none",
                  marginTier?.cls ?? "bg-zinc-100 text-zinc-600 border-zinc-200",
                )}>
                  💰 +₹{profitAmount != null ? profitAmount.toFixed(0) : "–"} profit
                </span>
                {/* Margin chip */}
                <span className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-none",
                  marginTier?.cls ?? "bg-zinc-100 text-zinc-600 border-zinc-200",
                )}>
                  📈 {marginPct != null ? marginPct.toFixed(1) : "–"}% margin
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">
                  cost ₹{Number(item.estimatedCost).toFixed(0)}
                </span>
              </div>
            ) : (
              /* Cost not set — nudge to fill */
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openCostEditor(); }}
                className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 text-[11px] font-semibold hover:bg-amber-100 transition-colors"
              >
                <WarningCircleIcon weight="fill" className="size-3" />
                Set cost price to see profit
              </button>
            )}

            {/* ── Status chips row ──────────────────────────────── */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {/* Live / Hidden */}
              <span className={cn(
                "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-zinc-100 text-zinc-500 border-zinc-200",
              )}>
                <span className={cn("size-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-zinc-400")} />
                {isActive ? "Live" : "Hidden"}
              </span>

              {/* Recommended (only when active) */}
              {item.recommended && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  <StarIcon weight="fill" className="size-2.5" />
                  Recommended
                </span>
              )}

              {/* Veg / Non-Veg */}
              <span className={cn(
                "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                veg ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-600 border-red-200",
              )}>
                <LeafIcon weight="fill" className="size-2.5" />
                {veg ? "Veg" : "Non-Veg"}
              </span>

              {/* Quality label */}
              <span className={cn(
                "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                tier.chipCls,
              )}>
                {tier.label}
              </span>

              {/* Missing image — amber warning */}
              {!item.imageUrl && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  <WarningCircleIcon weight="fill" className="size-2.5" />
                  Missing Image
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ══ QUICK ACTIONS ═════════════════════════════════════════════ */}
        <div className="px-2 pb-2 sm:px-3 sm:pb-3 flex flex-col gap-1">

          {/* Row 1 — state toggles */}
          <div className="flex items-stretch gap-1 rounded-lg bg-muted/50 border border-border/60 p-1">
            {/* Available */}
            <ToggleChip
              active={isActive}
              activeClass="bg-emerald-100 text-emerald-800 border-emerald-300"
              inactiveClass="bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground"
              disabled={isUpdating}
              title={isActive ? "Hide from menu" : "Show on menu"}
              onClick={() => onQuickUpdate({ available: !isActive }, item)}
            >
              {isActive
                ? <><EyeIcon className="size-3 shrink-0" /><span>Available</span></>
                : <><EyeSlashIcon className="size-3 shrink-0" /><span>Hidden</span></>
              }
            </ToggleChip>

            {/* Recommend — distinct OFF state uses amber tones, not grey */}
            <ToggleChip
              active={!!item.recommended}
              activeClass="bg-amber-100 text-amber-900 border-amber-400"
              inactiveClass="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:text-amber-800"
              disabled={isUpdating}
              title={item.recommended ? "Remove from Recommended" : "Mark as Recommended"}
              onClick={() => onQuickUpdate({ recommended: !item.recommended }, item)}
            >
              <StarIcon weight={item.recommended ? "fill" : "regular"} className="size-3 shrink-0" />
              <span>{item.recommended ? "Recommended" : "Recommend"}</span>
            </ToggleChip>

            {/* Veg / Non-Veg */}
            <ToggleChip
              active={veg}
              activeClass="bg-emerald-100 text-emerald-800 border-emerald-300"
              inactiveClass="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              disabled={isUpdating}
              title={`Currently ${veg ? "Veg" : "Non-Veg"} — tap to toggle`}
              onClick={() => onQuickUpdate({ isVeg: !veg }, item)}
            >
              <LeafIcon weight={veg ? "fill" : "regular"} className="size-3 shrink-0" />
              <span>{veg ? "Veg" : "Non-Veg"}</span>
            </ToggleChip>
          </div>

          {/* Row 2 — cost  |  edit  |  more */}
          <div className="flex items-stretch gap-1 rounded-lg bg-muted/50 border border-border/60 p-1">
            {/* Cost / Profit button */}
            <button
              type="button"
              onClick={openCostEditor}
              disabled={isSavingCost}
              title={hasCost ? "Edit cost price" : "Set cost to track profit margin"}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-semibold transition-all active:scale-95 px-2 border",
                hasCost
                  ? cn(marginTier?.cls, "hover:opacity-80")
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
                isSavingCost && "opacity-50 pointer-events-none",
              )}
            >
              <CurrencyInrIcon className="size-3 shrink-0" />
              {hasCost
                ? <span>₹{Number(item.estimatedCost).toFixed(0)} cost · {marginPct != null ? marginPct.toFixed(1) : "–"}% margin</span>
                : <span>Set Cost Price</span>
              }
            </button>

            <div className="w-px bg-border/60 mx-0.5 self-stretch" />

            {/* Edit */}
            <button
              type="button"
              onClick={() => onEdit(item)}
              title="Edit item details"
              className="flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition-all active:scale-95 px-3 bg-background text-muted-foreground border border-border hover:text-foreground hover:bg-accent"
            >
              <PencilSimpleLineIcon className="size-3 shrink-0" />
              <span>Edit</span>
            </button>

            {/* ⋮ Kebab menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    title="More actions"
                    className="flex items-center justify-center rounded-md py-1.5 px-2 text-muted-foreground border border-border bg-background hover:text-foreground hover:bg-accent transition-all active:scale-95"
                  >
                    <DotsThreeVerticalIcon className="size-4" weight="bold" />
                  </button>
                }
              />
              <DropdownMenuContent side="bottom" align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => onQuickUpdate({ available: false }, item)}
                  className="gap-2 text-xs"
                >
                  <ArchiveIcon className="size-3.5" />
                  Archive (Hide)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2 text-xs"
                >
                  <TrashIcon className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── Inline cost editor ──────────────────────────────── */}
          {costOpen && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-amber-800 leading-snug">
                Cost Price for <span className="italic">{item.name}</span>
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium select-none">₹</span>
                  <input
                    ref={costInputRef}
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 25"
                    value={costInput}
                    onChange={(e) => setCostInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveCost();
                      if (e.key === "Escape") setCostOpen(false);
                    }}
                    className="w-full rounded-md border border-amber-300 bg-white pl-6 pr-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                {/* Live margin preview */}
                {previewMargin != null && (
                  <span className={cn(
                    "shrink-0 text-[11px] font-semibold px-2 py-1 rounded-md border",
                    getMarginTier(previewMargin)?.cls ?? "bg-zinc-100 text-zinc-500 border-zinc-200",
                  )}>
                    {previewMargin.toFixed(1)}% margin
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={isSavingCost}
                  onClick={handleSaveCost}
                  className="flex-1 flex items-center justify-center gap-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white py-1.5 text-[11px] font-semibold transition-colors active:scale-95 disabled:opacity-50"
                >
                  <CheckIcon className="size-3" />
                  {isSavingCost ? "Saving…" : "Save Cost"}
                </button>
                <button
                  type="button"
                  onClick={() => setCostOpen(false)}
                  className="flex-1 flex items-center justify-center gap-1 rounded-md border border-border bg-background text-muted-foreground py-1.5 text-[11px] font-semibold hover:bg-accent transition-colors active:scale-95"
                >
                  <XIcon className="size-3" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Delete confirmation — outside article so it's not blocked by card events */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{item.name}</strong> will be moved to Trash.
              <br />
              You can restore it anytime from <strong>Menu → Trash</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm! font-medium! rounded-md!">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="text-sm! font-medium! rounded-md!"
              onClick={() => { onDelete(item); setDeleteDialogOpen(false); }}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

AdminMenuItem.propTypes = {
  item:          PropTypes.object.isRequired,
  onEdit:        PropTypes.func.isRequired,
  onDelete:      PropTypes.func.isRequired,
  onQuickUpdate: PropTypes.func.isRequired,
  onSetCost:     PropTypes.func.isRequired,
  isUpdating:    PropTypes.bool,
  isSavingCost:  PropTypes.bool,
};
