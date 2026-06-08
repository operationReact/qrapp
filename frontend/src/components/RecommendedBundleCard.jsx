import PropTypes from "prop-types";
import {
  SparkleIcon,
  CheckFatIcon,
  CircleNotchIcon,
  ArrowRightIcon,
  TagIcon,
  ShoppingBagIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { baseURL } from "@/services";

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${baseURL}${url}`;
}

const fmt = (n) => Number(n ?? 0).toFixed(0);

// ── Item tile — larger, prominent ─────────────────────────────────────────────

function ItemTile({ item }) {
  const src = resolveImg(item.imageUrl);
  return (
    <div className="flex flex-col items-center gap-1.5 w-[76px] shrink-0">
      {/* Image — 76×76, rounded-2xl */}
      <div className="w-[76px] h-[76px] rounded-2xl overflow-hidden border border-zinc-100 shadow-sm bg-zinc-50 relative">
        {src ? (
          <img
            src={src}
            alt={item.itemName}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-orange-50",
            src ? "hidden" : "",
          )}
        >
          <ShoppingBagIcon weight="duotone" className="size-7 text-orange-300" />
        </div>
      </div>
      {/* Name — single line */}
      <span className="text-[11px] font-medium text-zinc-800 leading-tight text-center line-clamp-1 w-full px-0.5">
        {item.itemName}
      </span>
      {/* Price */}
      <span className="text-[11px] font-bold text-zinc-500">
        ₹{fmt(item.price)}
      </span>
    </div>
  );
}

// ── More-items bubble ─────────────────────────────────────────────────────────

function MoreBubble({ count }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-[76px] shrink-0 self-start">
      <div className="w-[76px] h-[76px] rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-base font-black text-zinc-400">+{count}</span>
          <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wide">
            more
          </span>
        </div>
      </div>
      <span className="text-[11px] text-transparent select-none">·</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * RecommendedBundleCard — V1 "Frequently Bought Together" card.
 *
 * Swiggy/Zomato-inspired, conversion-focused, mobile-first.
 *
 * Props:
 *  - bundleItems:        { itemId, itemName, imageUrl, price }[]
 *  - savings:            number   — discount shown in badge + CTA
 *  - onAddBundle:        () => void
 *  - isLoading:          boolean
 *  - disabled:           boolean
 *  - primaryItemName:    string   — cart item for personalised social proof
 *  - confidencePercent:  number   — social proof %, default 87
 *
 * Removed (no longer displayed):
 *  - originalPrice, finalPrice — kept as optional accepted props for
 *    backward compatibility but not rendered
 */
export default function RecommendedBundleCard({
  bundleItems = [],
  savings,
  onAddBundle,
  isLoading = false,
  disabled  = false,
  primaryItemName,
  confidencePercent = 87,
  // accepted but not displayed (backwards compat)
  // eslint-disable-next-line no-unused-vars
  originalPrice,
  // eslint-disable-next-line no-unused-vars
  finalPrice,
}) {
  if (!bundleItems.length) return null;

  const savingsRupees = Number(savings ?? 0);

  // Show 2 items prominently; surface a "+N more" bubble for the rest
  const visible   = bundleItems.slice(0, 2);
  const extraCount = Math.max(0, bundleItems.length - 2);

  // Social proof copy
  const socialProof = primaryItemName
    ? `${confidencePercent}% of customers who ordered ${primaryItemName} also added these`
    : `${confidencePercent}% of customers also ordered these items`;

  return (
    <article className="w-full rounded-2xl border border-zinc-200 bg-white shadow-md overflow-hidden">

      {/* ── 1. Header ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-1">
        <SparkleIcon weight="fill" className="size-4 text-orange-500 shrink-0" />
        <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
          Frequently Bought Together
        </h3>
      </div>

      {/* ── 2. Social proof ──────────────────────────────────────────── */}
      <p className="px-4 pb-3 text-[11px] text-zinc-400 leading-snug">
        {socialProof}
      </p>

      {/* ── 3. Separator ─────────────────────────────────────────────── */}
      <div className="h-px bg-zinc-100" />

      {/* ── 4. Items row ─────────────────────────────────────────────── */}
      <div className="px-4 py-4 flex items-start gap-3">
        {visible.map((item, i) => (
          <div key={item.itemId ?? i} className="flex items-center gap-3 shrink-0">
            <ItemTile item={item} />
            {/* Plus separator — only between visible items, not before "+more" */}
            {i < visible.length - 1 && (
              <span className="text-zinc-300 font-bold text-base self-start mt-7 shrink-0">
                +
              </span>
            )}
          </div>
        ))}

        {/* "+N more" bubble */}
        {extraCount > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-zinc-300 font-bold text-base self-start mt-7 shrink-0">
              +
            </span>
            <MoreBubble count={extraCount} />
          </div>
        )}
      </div>

      {/* ── 5. Savings badge + CTA ───────────────────────────────────── */}
      <div className="px-4 pb-4 space-y-3">

        {/* Savings pill badge */}
        {savingsRupees > 0 && (
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold px-3 py-1 rounded-full">
              <TagIcon weight="fill" className="size-3 shrink-0" />
              Save ₹{fmt(savingsRupees)}
            </span>
          </div>
        )}

        {/* Primary CTA */}
        <button
          type="button"
          onClick={onAddBundle}
          disabled={isLoading || disabled}
          aria-busy={isLoading}
          aria-label={
            isLoading ? "Adding items to cart…"  :
            disabled  ? "Bundle already added"   :
                        `Add all and save ₹${fmt(savingsRupees)}`
          }
          className={cn(
            // Layout
            "w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl px-5",
            // Typography
            "text-sm font-bold text-white tracking-wide",
            // Colour — solid orange (Swiggy-style, not gradient)
            "bg-orange-500",
            // Shadow
            "shadow-md shadow-orange-200/60",
            // Interaction
            "transition-all duration-150",
            "hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-300/50",
            "active:scale-[0.98] active:bg-orange-600",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2",
            // Disabled
            (isLoading || disabled) && [
              "opacity-60 cursor-not-allowed",
              "hover:bg-orange-500 hover:shadow-md hover:scale-100",
            ],
          )}
        >
          {isLoading ? (
            <>
              <CircleNotchIcon className="size-4 animate-spin shrink-0" />
              <span>Adding…</span>
            </>
          ) : disabled ? (
            <>
              <CheckFatIcon weight="fill" className="size-4 shrink-0" />
              <span>Added to Cart!</span>
            </>
          ) : (
            <>
              <span>
                {savingsRupees > 0
                  ? `Add All & Save ₹${fmt(savingsRupees)}`
                  : "Add All to Cart"}
              </span>
              <ArrowRightIcon weight="bold" className="size-4 shrink-0" />
            </>
          )}
        </button>

      </div>
    </article>
  );
}

RecommendedBundleCard.propTypes = {
  bundleItems: PropTypes.arrayOf(
    PropTypes.shape({
      itemId:   PropTypes.number.isRequired,
      itemName: PropTypes.string.isRequired,
      imageUrl: PropTypes.string,
      price:    PropTypes.number,
    }),
  ).isRequired,
  /** Amount saved — drives the savings badge and CTA label */
  savings:          PropTypes.number.isRequired,
  onAddBundle:      PropTypes.func.isRequired,
  isLoading:        PropTypes.bool,
  disabled:         PropTypes.bool,
  /** Primary cart item name for personalised social proof copy */
  primaryItemName:  PropTypes.string,
  /** Integer 0-100 for social proof percentage (default 87) */
  confidencePercent: PropTypes.number,
  // kept for backward compatibility — no longer displayed
  originalPrice:    PropTypes.number,
  finalPrice:       PropTypes.number,
};
