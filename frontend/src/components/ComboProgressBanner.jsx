import { cn } from "@/lib/utils";
import { SparkleIcon, CheckCircleIcon } from "@phosphor-icons/react";

/**
 * Renders a horizontal discount ladder progress bar for a single BYOC campaign.
 *
 * Props:
 *  - campaign: CampaignEligibilityResult (from useByocDiscount)
 *  - compact: boolean — slim variant for StickyCartBar
 */
export default function ComboProgressBanner({ campaign, compact = false }) {
  if (!campaign) return null;

  const {
    campaignName,
    eligibleItemCount,
    currentTier,
    nextTier,
    itemsToNextTier,
    actualDiscountAmount,
    discountUnlocked,
    allTiers,
  } = campaign;

  const maxItems = allTiers.length > 0 ? allTiers[allTiers.length - 1].minItems : 5;

  // ── Compact variant (StickyCartBar nudge) ─────────────────────────────────
  if (compact) {
    if (nextTier) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
          <SparkleIcon className="size-3 text-emerald-500" weight="fill" />
          Add {itemsToNextTier} more → unlock {nextTier.discountValue}% off
        </div>
      );
    }
    if (discountUnlocked) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
          <CheckCircleIcon className="size-3 text-emerald-500" weight="fill" />
          Combo savings applied · ₹{Number(actualDiscountAmount).toFixed(0)} off
        </div>
      );
    }
    return null;
  }

  // ── Full variant (cart / off-canvas) ──────────────────────────────────────
  const progressMessage = (() => {
    if (discountUnlocked && !nextTier)
      return `🔥 Maximum discount unlocked! You're saving ₹${Number(actualDiscountAmount).toFixed(0)}`;
    if (discountUnlocked && nextTier)
      return `🎉 ${currentTier?.discountValue}% OFF applied · Add ${itemsToNextTier} more to unlock ${nextTier.discountValue}%`;
    if (nextTier)
      return `Add ${itemsToNextTier} more item${itemsToNextTier > 1 ? "s" : ""} to unlock ${nextTier.discountValue}% OFF`;
    return "Add eligible items to unlock combo savings";
  })();

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <SparkleIcon weight="fill" className="size-4 text-emerald-600" />
          <span className="text-[13px] font-bold text-emerald-800">{campaignName}</span>
        </div>
        {discountUnlocked ? (
          <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-white transition-all">
            ₹{Number(actualDiscountAmount).toFixed(0)} saved!
          </span>
        ) : (
          <span className="text-[11px] font-medium text-emerald-600">
            {eligibleItemCount} / {maxItems} items
          </span>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-0 mb-2.5 overflow-x-auto no-scrollbar">
        {allTiers.map((tier, idx) => {
          const filled = eligibleItemCount >= tier.minItems;
          const isCurrent = currentTier?.minItems === tier.minItems;
          return (
            <div key={tier.id ?? idx} className="flex items-center flex-shrink-0">
              <div
                className={cn(
                  "size-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300",
                  filled
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                    : "bg-gray-200 text-gray-400",
                  isCurrent && "scale-110 ring-2 ring-emerald-300",
                )}
              >
                {filled ? "✓" : tier.minItems}
              </div>
              {idx < allTiers.length - 1 && (
                <div
                  className={cn(
                    "h-[2px] w-8 transition-colors duration-300",
                    eligibleItemCount > tier.minItems ? "bg-emerald-400" : "bg-gray-200",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Tier discount labels */}
      <div className="flex gap-0 overflow-x-auto no-scrollbar mb-2">
        {allTiers.map((tier, idx) => {
          const filled = eligibleItemCount >= tier.minItems;
          return (
            <div
              key={tier.id ?? idx}
              className="flex flex-col items-center flex-shrink-0"
              style={{ width: "52px" }}
            >
              <span
                className={cn(
                  "text-[9px] font-semibold leading-tight text-center",
                  filled ? "text-emerald-700" : "text-gray-400",
                )}
              >
                {tier.discountValue}% off
              </span>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <p
        className={cn(
          "text-[12px] font-semibold transition-colors",
          discountUnlocked ? "text-emerald-700" : "text-gray-600",
        )}
      >
        {progressMessage}
      </p>
    </div>
  );
}
