import PropTypes from "prop-types";
import {
  SparkleIcon,
  CheckFatIcon,
  CircleNotchIcon,
  ArrowRightIcon,
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

// ── Compact item tile (60 × 60) ───────────────────────────────────────────────

function ItemTile({ item }) {
  const src = resolveImg(item.imageUrl);
  return (
    <div className="flex flex-col items-center gap-1 w-[60px] shrink-0">
      <div className="w-[60px] h-[60px] rounded-xl overflow-hidden border border-zinc-100 shadow-sm bg-zinc-50 relative">
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
          <ShoppingBagIcon weight="duotone" className="size-5 text-orange-300" />
        </div>
      </div>
      <span className="text-[9px] font-medium text-zinc-700 leading-tight text-center line-clamp-2 w-full">
        {item.itemName}
      </span>
      <span className="text-[10px] font-bold text-zinc-500">
        ₹{fmt(item.price)}
      </span>
    </div>
  );
}

// ── More-items bubble ─────────────────────────────────────────────────────────

function MoreBubble({ count }) {
  return (
    <div className="flex flex-col items-center gap-1 w-[60px] shrink-0 self-start">
      <div className="w-[60px] h-[60px] rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <span className="text-sm font-black text-zinc-400">+{count}</span>
          <span className="text-[8px] font-semibold text-zinc-400 uppercase tracking-wide">more</span>
        </div>
      </div>
      <span className="text-[9px] text-transparent select-none">·</span>
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
  // kept for backward compatibility
  // eslint-disable-next-line no-unused-vars
  originalPrice,
  // eslint-disable-next-line no-unused-vars
  finalPrice,
}) {
  if (!bundleItems.length) return null;

  const savingsRupees = Number(savings ?? 0);
  const regularTotal  = bundleItems.reduce((s, i) => s + Number(i.price ?? 0), 0);
  const comboPrice    = Math.max(0, regularTotal - savingsRupees);

  // Show up to 3 items; bubble for the rest
  const visible    = bundleItems.slice(0, 3);
  const extraCount = Math.max(0, bundleItems.length - 3);

  return (
    <article className="w-full rounded-2xl border border-zinc-200 bg-white shadow-md overflow-hidden">

      {/* ── Header + static pairing badge ────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <div className="flex items-center gap-1.5">
          <SparkleIcon weight="fill" className="size-3.5 text-orange-500 shrink-0" />
          <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
            Frequently Bought Together
          </h3>
        </div>
        <span className="text-[10px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-full shrink-0">
          🍽️ Popular Pairing
        </span>
      </div>

      <div className="h-px bg-zinc-100" />

      {/* ── Compact items row ────────────────────────────────────────── */}
      <div className="px-4 py-3 flex items-start gap-2">
        {visible.map((item, i) => (
          <div key={item.itemId ?? i} className="flex items-center gap-2 shrink-0">
            <ItemTile item={item} />
            {i < visible.length - 1 && (
              <span className="text-zinc-300 font-bold text-sm self-start mt-5 shrink-0">+</span>
            )}
          </div>
        ))}
        {extraCount > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-zinc-300 font-bold text-sm self-start mt-5 shrink-0">+</span>
            <MoreBubble count={extraCount} />
          </div>
        )}
      </div>

      {/* ── Pricing + CTA ────────────────────────────────────────────── */}
      <div className="px-4 pb-3.5 space-y-2">

        {/* Clear pricing: Regular → Combo · Save */}
        {savingsRupees > 0 && (
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <span className="text-zinc-400 line-through">₹{fmt(regularTotal)}</span>
            <span className="text-zinc-400">→</span>
            <span className="font-bold text-zinc-800">Combo ₹{fmt(comboPrice)}</span>
            <span className="ml-auto bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px] shrink-0">
              Save ₹{fmt(savingsRupees)}
            </span>
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={onAddBundle}
          disabled={isLoading || disabled}
          aria-busy={isLoading}
          aria-label={
            isLoading ? "Adding items to cart…" :
            disabled  ? "Bundle already added"  :
                        `Add all and save ₹${fmt(savingsRupees)}`
          }
          className={cn(
            "w-full h-10 flex items-center justify-center gap-2 rounded-xl px-5",
            "text-sm font-bold text-white tracking-wide",
            "bg-orange-500 shadow-md shadow-orange-200/60",
            "transition-all duration-150",
            "hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-300/50",
            "active:scale-[0.98] active:bg-orange-600",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2",
            (isLoading || disabled) && "opacity-60 cursor-not-allowed hover:bg-orange-500 hover:shadow-md hover:scale-100",
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
                  ? `Add Combo · Save ₹${fmt(savingsRupees)}`
                  : "Add All to Cart"}
              </span>
              <ArrowRightIcon weight="bold" className="size-3.5 shrink-0" />
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
