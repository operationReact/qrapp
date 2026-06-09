import PropTypes from "prop-types";
import {
  ForkKnifeIcon,
  CheckFatIcon,
  CircleNotchIcon,
  ArrowRightIcon,
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

const ROLE_COLORS = {
  MAIN:    "bg-orange-100 text-orange-700",
  SIDE:    "bg-green-100  text-green-700",
  DRINK:   "bg-blue-100   text-blue-700",
  DESSERT: "bg-pink-100   text-pink-700",
  ADDON:   "bg-zinc-100   text-zinc-600",
};

// ── Compact meal item tile (56 × 56) ─────────────────────────────────────────

function MealItemTile({ item }) {
  const src = resolveImg(item.imageUrl);
  return (
    <div className="flex flex-col items-center gap-1 w-[60px] shrink-0">
      <div className="relative w-[60px] h-[60px] rounded-xl overflow-hidden border border-zinc-100 shadow-sm bg-zinc-50">
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
          <ShoppingBagIcon weight="duotone" className="size-5 text-zinc-300" />
        </div>

        {/* Role chip */}
        {item.role && (
          <span
            className={cn(
              "absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold px-1 py-0.5 rounded-full whitespace-nowrap",
              ROLE_COLORS[item.role] ?? ROLE_COLORS.ADDON,
            )}
          >
            {item.role.charAt(0) + item.role.slice(1).toLowerCase()}
          </span>
        )}
      </div>
      <span className="text-[9px] font-medium text-zinc-700 text-center leading-tight line-clamp-2 w-full">
        {item.itemName}
      </span>
      <span className="text-[10px] font-bold text-zinc-500">
        ₹{fmt(item.price)}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
  const regularTotal  = mealItems.reduce((s, i) => s + Number(i.price ?? 0), 0);
  const comboPrice    = Math.max(0, regularTotal - savingsRupees);

  return (
    <article className="w-full rounded-2xl border border-zinc-200 bg-white shadow-md overflow-hidden">

      {/* ── Header + static pairing badge ────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <div className="flex items-center gap-1.5">
          <ForkKnifeIcon weight="fill" className="size-3.5 text-orange-500 shrink-0" />
          <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
            Complete Your Meal
          </h3>
        </div>
        <span className="text-[10px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-full shrink-0">
          🍽️ Popular Pairing
        </span>
      </div>

      <div className="h-px bg-zinc-100" />

      {/* ── Compact items row ────────────────────────────────────────── */}
      <div className="px-4 py-3 flex items-start gap-2 overflow-x-auto [scrollbar-width:none]">
        {mealItems.map((item, i) => (
          <div key={item.itemId ?? i} className="flex items-center gap-2 shrink-0">
            <MealItemTile item={item} />
            {i < mealItems.length - 1 && (
              <span className="text-zinc-300 font-bold text-sm self-start mt-5 shrink-0">
                +
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Pricing row + CTA ────────────────────────────────────────── */}
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
          onClick={onAddMeal}
          disabled={isLoading || disabled}
          aria-busy={isLoading}
          className={cn(
            "w-full h-10 flex items-center justify-center gap-2 rounded-xl px-5",
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
                  ? `Add Combo · Save ₹${fmt(savingsRupees)}`
                  : "Add to Cart"}
              </span>
              <ArrowRightIcon weight="bold" className="size-3.5 shrink-0" />
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
  savings:   PropTypes.number.isRequired,
  onAddMeal: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  disabled:  PropTypes.bool,
};
