import PropTypes from "prop-types";
import {
  ForkKnifeIcon,
  CheckFatIcon,
  CircleNotchIcon,
  ArrowRightIcon,
  TagIcon,
  ShoppingBagIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { baseURL } from "@/services";

// ── Helpers ───────────────────────────────────────────────────────────────────

const resolveImg = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${baseURL}${url}`;
};

const fmt = (n) => Number(n ?? 0).toFixed(0);

/** Role label shown below each item image. */
const ROLE_LABELS = {
  MAIN:    "Main",
  SIDE:    "Side",
  DRINK:   "Drink",
  DESSERT: "Dessert",
  ADDON:   "Add-on",
};

const ROLE_COLORS = {
  MAIN:    "bg-orange-100 text-orange-700",
  SIDE:    "bg-green-100  text-green-700",
  DRINK:   "bg-blue-100   text-blue-700",
  DESSERT: "bg-pink-100   text-pink-700",
  ADDON:   "bg-zinc-100   text-zinc-600",
};

// ── Meal item tile ────────────────────────────────────────────────────────────

function MealItemTile({ item }) {
  const src = resolveImg(item.imageUrl);
  return (
    <div className="flex flex-col items-center gap-1.5 w-[72px] shrink-0">
      {/* Image */}
      <div className="relative w-[72px] h-[72px] rounded-2xl overflow-hidden border border-zinc-100 shadow-sm bg-zinc-50">
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
            "absolute inset-0 flex items-center justify-center bg-zinc-100",
            src ? "hidden" : "",
          )}
        >
          <ShoppingBagIcon weight="duotone" className="size-7 text-zinc-300" />
        </div>

        {/* Role chip overlaid on image */}
        {item.role && (
          <span
            className={cn(
              "absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap",
              ROLE_COLORS[item.role] ?? ROLE_COLORS.ADDON,
            )}
          >
            {ROLE_LABELS[item.role] ?? item.role}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="text-[10px] font-medium text-zinc-800 text-center leading-tight line-clamp-2 w-full">
        {item.itemName}
      </span>

      {/* Price */}
      <span className="text-[11px] font-bold text-zinc-500">
        ₹{fmt(item.price)}
      </span>
    </div>
  );
}

// ── Plus separator ────────────────────────────────────────────────────────────

function PlusSep() {
  return (
    <span className="text-zinc-300 font-bold text-base self-start mt-7 shrink-0 select-none">
      +
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * CompleteMealCard — "Complete Your Meal" recommendation card.
 *
 * Displays:
 *   1. Title "Complete Your Meal" + personalised subtitle
 *   2. Meal items (Side, Drink, optional Dessert) with role badges
 *   3. Green "Save ₹N" badge
 *   4. "Add Meal" CTA
 *
 * Props:
 *  - mainItemName:  string   — cart item name for personalised copy
 *  - mealItems:     { itemId, itemName, imageUrl, price, role }[]
 *  - savings:       number
 *  - onAddMeal:     () => void
 *  - isLoading:     boolean
 *  - disabled:      boolean  — shows "Added" state
 */
export default function CompleteMealCard({
  mainItemName,
  mealItems = [],
  savings,
  onAddMeal,
  isLoading = false,
  disabled  = false,
}) {
  if (!mealItems.length) return null;

  const savingsRupees = Number(savings ?? 0);

  const subtitle = mainItemName
    ? `Pairs perfectly with ${mainItemName}`
    : "These items go great with your order";

  return (
    <article className="w-full rounded-2xl border border-zinc-200 bg-white shadow-md overflow-hidden">

      {/* ── 1. Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-1">
        <ForkKnifeIcon weight="fill" className="size-4 text-orange-500 shrink-0" />
        <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
          Complete Your Meal
        </h3>
      </div>

      {/* ── 2. Subtitle ────────────────────────────────────────────────── */}
      <p className="px-4 pb-3 text-[11px] text-zinc-400 leading-snug">
        {subtitle}
      </p>

      {/* ── 3. Separator ───────────────────────────────────────────────── */}
      <div className="h-px bg-zinc-100" />

      {/* ── 4. Meal items row ──────────────────────────────────────────── */}
      <div className="px-4 py-4 flex items-start gap-2.5 overflow-x-auto [scrollbar-width:none]">
        {mealItems.map((item, i) => (
          <div key={item.itemId ?? i} className="flex items-center gap-2.5 shrink-0">
            <MealItemTile item={item} />
            {i < mealItems.length - 1 && <PlusSep />}
          </div>
        ))}
      </div>

      {/* ── 5. Savings badge + CTA ─────────────────────────────────────── */}
      <div className="px-4 pb-4 space-y-3">

        {/* Savings pill */}
        {savingsRupees > 0 && (
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold px-3 py-1 rounded-full">
              <TagIcon weight="fill" className="size-3 shrink-0" />
              Save ₹{fmt(savingsRupees)}
            </span>
          </div>
        )}

        {/* CTA button */}
        <button
          type="button"
          onClick={onAddMeal}
          disabled={isLoading || disabled}
          aria-busy={isLoading}
          aria-label={
            isLoading ? "Adding meal items to cart…" :
            disabled  ? "Meal already added"         :
                        `Add meal and save ₹${fmt(savingsRupees)}`
          }
          className={cn(
            "w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl px-5",
            "text-sm font-bold text-white tracking-wide",
            "bg-orange-500",
            "shadow-md shadow-orange-200/60",
            "transition-all duration-150",
            "hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-300/50",
            "active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2",
            (isLoading || disabled) && "opacity-60 cursor-not-allowed hover:bg-orange-500 hover:shadow-md",
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
              <span>Added!</span>
            </>
          ) : (
            <>
              <span>
                {savingsRupees > 0
                  ? `Add Meal & Save ₹${fmt(savingsRupees)}`
                  : "Add Meal"}
              </span>
              <ArrowRightIcon weight="bold" className="size-4 shrink-0" />
            </>
          )}
        </button>

      </div>
    </article>
  );
}

CompleteMealCard.propTypes = {
  mainItemName: PropTypes.string,
  mealItems: PropTypes.arrayOf(
    PropTypes.shape({
      itemId:   PropTypes.number.isRequired,
      itemName: PropTypes.string.isRequired,
      imageUrl: PropTypes.string,
      price:    PropTypes.number,
      role:     PropTypes.string,
    }),
  ).isRequired,
  savings:    PropTypes.number.isRequired,
  onAddMeal:  PropTypes.func.isRequired,
  isLoading:  PropTypes.bool,
  disabled:   PropTypes.bool,
};

