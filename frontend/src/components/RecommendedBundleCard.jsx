import PropTypes from "prop-types";
import {
  SparkleIcon,
  PlusIcon,
  ShoppingBagIcon,
  TagIcon,
  CheckFatIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { baseURL } from "@/services";

// ── Small helpers ─────────────────────────────────────────────────────────────

function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${baseURL}${url}`;
}

function fmt(n) {
  return Number(n ?? 0).toFixed(0);
}

// ── Item thumbnail tile ───────────────────────────────────────────────────────

function ItemTile({ item }) {
  const src = resolveImg(item.imageUrl);
  return (
    <div className="flex flex-col items-center gap-1 shrink-0 w-[68px]">
      {/* Image */}
      <div className="w-[60px] h-[60px] rounded-xl overflow-hidden border border-white shadow-sm bg-muted shrink-0 relative">
        {src ? (
          <img
            src={src}
            alt={item.itemName}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        {/* Fallback */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-orange-50",
            src ? "hidden" : "",
          )}
        >
          <ShoppingBagIcon weight="duotone" className="size-6 text-orange-300" />
        </div>
      </div>

      {/* Name */}
      <span className="text-[10px] font-medium text-center text-foreground leading-tight line-clamp-2 w-full">
        {item.itemName}
      </span>

      {/* Price */}
      <span className="text-[10px] font-bold text-orange-700">
        ₹{fmt(item.price)}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * RecommendedBundleCard — V1 "Frequently Bought Together" card.
 *
 * Props:
 *  - bundleItems:    { itemId, itemName, imageUrl, price }[]
 *  - originalPrice:  number   — sum of individual prices
 *  - savings:        number   — discount amount (already calculated by backend)
 *  - finalPrice:     number   — what the customer pays
 *  - onAddBundle:    () => void  — called when customer clicks "Add Bundle"
 *  - isLoading:      boolean  — shows spinner on the button
 *  - disabled:       boolean  — shows "Added" state
 */
export default function RecommendedBundleCard({
  bundleItems = [],
  originalPrice,
  savings,
  finalPrice,
  onAddBundle,
  isLoading = false,
  disabled = false,
}) {
  if (!bundleItems.length) return null;

  const savingsPercent =
    originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  return (
    <article className="w-full rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 shadow-sm overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5">
        <SparkleIcon weight="fill" className="size-4 text-white shrink-0" />
        <h3 className="text-sm font-bold text-white tracking-wide">
          Frequently Bought Together
        </h3>
      </div>

      {/* ── Item row ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2">
        <div
          className="flex items-start gap-1 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {bundleItems.map((item, i) => (
            <div key={item.itemId ?? i} className="flex items-start gap-1 shrink-0">
              <ItemTile item={item} />
              {i < bundleItems.length - 1 && (
                <div className="flex items-center justify-center mt-4 size-5 rounded-full bg-orange-100 border border-orange-200 shrink-0">
                  <PlusIcon weight="bold" className="size-2.5 text-orange-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div className="mx-4 h-px bg-orange-200/60" />

      {/* ── Pricing row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 divide-x divide-orange-200/60 px-0 py-3">
        {/* Original price */}
        <div className="flex flex-col items-center gap-0.5 px-2">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Total Price
          </span>
          <span className="text-sm font-medium text-muted-foreground/70 line-through decoration-red-400 decoration-[1.5px] tabular-nums">
            ₹{fmt(originalPrice)}
          </span>
        </div>

        {/* Savings — centre, highlighted */}
        <div className="flex flex-col items-center gap-0.5 px-2">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-emerald-600">
            You Save
          </span>
          <div className="flex items-center gap-1">
            <TagIcon weight="fill" className="size-3 text-emerald-600 shrink-0" />
            <span className="text-sm font-extrabold text-emerald-600 tabular-nums">
              ₹{fmt(savings)}
            </span>
          </div>
          {savingsPercent > 0 && (
            <span className="text-[9px] font-bold text-emerald-500">
              ({savingsPercent}% off)
            </span>
          )}
        </div>

        {/* Final price — dominant */}
        <div className="flex flex-col items-center gap-0.5 px-2">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Bundle Price
          </span>
          <span className="text-lg font-black text-foreground tabular-nums leading-tight">
            ₹{fmt(finalPrice)}
          </span>
        </div>
      </div>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 pt-1">
        <button
          onClick={onAddBundle}
          disabled={isLoading || disabled}
          aria-busy={isLoading}
          aria-label={
            isLoading ? "Adding bundle to cart" :
            disabled  ? "Bundle added to cart" :
                        "Add bundle to cart"
          }
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3 px-5",
            "text-sm font-bold text-white tracking-wide",
            "bg-gradient-to-r from-orange-500 to-amber-500",
            "shadow-md shadow-orange-200/60",
            "transition-all duration-200",
            "hover:shadow-lg hover:shadow-orange-300/50 hover:-translate-y-0.5",
            "active:scale-95 active:translate-y-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2",
            (isLoading || disabled) && "opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-md",
          )}
        >
          {isLoading ? (
            <>
              <CircleNotchIcon className="size-4 animate-spin shrink-0" />
              Adding…
            </>
          ) : disabled ? (
            <>
              <CheckFatIcon weight="fill" className="size-4 shrink-0" />
              Added to Cart!
            </>
          ) : (
            <>
              <ShoppingBagIcon weight="fill" className="size-4 shrink-0" />
              Add Bundle To Cart
            </>
          )}
        </button>

        {/* Trust nudge */}
        <p className="text-center text-[10px] text-muted-foreground/60 mt-2 flex items-center justify-center gap-1">
          <span>🔒</span>
          <span>Best value · Limited time offer</span>
        </p>
      </div>
    </article>
  );
}

RecommendedBundleCard.propTypes = {
  bundleItems: PropTypes.arrayOf(
    PropTypes.shape({
      itemId:    PropTypes.number.isRequired,
      itemName:  PropTypes.string.isRequired,
      imageUrl:  PropTypes.string,
      price:     PropTypes.number,
    }),
  ).isRequired,
  originalPrice: PropTypes.number.isRequired,
  savings:       PropTypes.number.isRequired,
  finalPrice:    PropTypes.number.isRequired,
  onAddBundle:   PropTypes.func.isRequired,
  isLoading:     PropTypes.bool,
  disabled:      PropTypes.bool,
};

