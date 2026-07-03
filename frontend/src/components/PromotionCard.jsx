import PropTypes from "prop-types";
import { TagIcon, LockIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Renders a single promotion row — used inside PromotionDrawer.
 * Supports two modes:
 *   mode="eligible"    — shows actualDiscount, APPLY / APPLIED button
 *   mode="ineligible"  — shows failureReason, locked style, optional missingAmount CTA
 */
export function PromotionCard({ promotion, mode, isApplied, onApply, onNavigateToMenu }) {
  const eligible = mode === "eligible";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-2 transition-colors",
        eligible
          ? isApplied
            ? "border-green-300 bg-green-50"
            : "border-border bg-card"
          : "border-border bg-muted/40 opacity-75"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className={cn("mt-0.5 shrink-0", eligible ? "text-primary" : "text-muted-foreground")}>
            {eligible ? (
              <TagIcon weight="duotone" size={18} />
            ) : (
              <LockIcon weight="duotone" size={18} />
            )}
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm tracking-wide">
                {promotion.code ?? "AUTO"}
              </span>
              {isApplied && (
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs py-0">
                  Applied ✓
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {promotion.title}
            </p>
          </div>
        </div>

        {/* Action button */}
        {eligible && (
          <div className="shrink-0">
            {isApplied ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground text-xs h-8"
                onClick={() => onApply(null)}
              >
                Remove
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onApply(promotion)}>
                Apply
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Savings line */}
      {eligible && (
        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <span className="font-medium text-green-700">
            Saves you ₹{Number(promotion.actualDiscount).toFixed(2)}
          </span>
          {promotion.expiresAt && (
            <span className="text-muted-foreground">
              Expires {formatExpiry(promotion.expiresAt)}
            </span>
          )}
        </div>
      )}

      {/* Ineligible reason */}
      {!eligible && (
        <div className="text-xs text-muted-foreground flex flex-col gap-1 mt-0.5">
          <span>{promotion.failureReason}</span>
          {promotion.missingAmount != null && (
            <button
              className="flex items-center gap-1 text-primary font-medium w-fit hover:underline"
              onClick={onNavigateToMenu}
            >
              <PlusIcon size={13} weight="bold" />
              Add ₹{Number(promotion.missingAmount).toFixed(2)} more to unlock
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatExpiry(expiresAt) {
  const d = new Date(expiresAt);
  const now = new Date();
  const diffH = (d - now) / 3600000;
  if (diffH <= 24) return "today";
  if (diffH <= 48) return "tomorrow";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

PromotionCard.propTypes = {
  promotion: PropTypes.object.isRequired,
  mode: PropTypes.oneOf(["eligible", "ineligible"]).isRequired,
  isApplied: PropTypes.bool,
  onApply: PropTypes.func,
  onNavigateToMenu: PropTypes.func,
};

