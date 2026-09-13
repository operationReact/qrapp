import PropTypes from "prop-types";
import {
  SparkleIcon,
  CheckFatIcon,
  CircleNotchIcon,
  ArrowRightIcon,
  ShoppingBagIcon,
  PlusIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { baseURL } from "@/services";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";

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
    <div className="flex flex-col items-center gap-2 w-20 shrink-0">
      <div className="size-20 rounded-lg overflow-hidden border bg-zinc-50 relative">
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
            "absolute inset-0 flex! items-center justify-center bg-primary/5",
            src ? "hidden" : "",
          )}
        >
          <ShoppingBagIcon className="size-5 text-primary/50" />
        </div>
      </div>
      <span className="text-xs font-medium leading-tight text-center line-clamp-2 w-full">
        {item.itemName}
      </span>
      <span className="text-xs text-zinc-500">
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
          <span className="text-[8px] font-semibold text-zinc-400 uppercase tracking-wide">
            more
          </span>
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
 * Removed (no longer displayed):
 *  - originalPrice, finalPrice — kept as optional accepted props for
 *    backward compatibility but not rendered
 */
export default function RecommendedBundleCard({
  bundleItems = [],
  savings,
  onAddBundle,
  isLoading = false,
  disabled = false,
  // kept for backward compatibility
  // eslint-disable-next-line no-unused-vars
  originalPrice,
  // eslint-disable-next-line no-unused-vars
  finalPrice,
}) {
  if (!bundleItems.length) return null;

  const savingsRupees = Number(savings ?? 0);
  const regularTotal = bundleItems.reduce(
    (s, i) => s + Number(i.price ?? 0),
    0,
  );
  const comboPrice = Math.max(0, regularTotal - savingsRupees);

  // Show up to 3 items; bubble for the rest
  const visible = bundleItems.slice(0, 3);
  const extraCount = Math.max(0, bundleItems.length - 3);

  return (
    <article className="w-full rounded-lg border border-muted bg-white overflow-hidden">
      {/* ── Header + static pairing badge ────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <div className="flex items-center gap-1.5">
          <SparkleIcon
            weight="fill"
            className="size-3.5 text-primary shrink-0"
          />
          <h3 className="text-sm font-semibold">Frequently Bought Together</h3>
        </div>
        <Badge className="text-primary bg-zinc-50 border border-zinc-200">
          Popular Pairing
        </Badge>
      </div>

      <Separator className="bg-muted" />

      {/* ── Compact items row ────────────────────────────────────────── */}
      <div className="px-4 py-3 flex items-start gap-2">
        {visible.map((item, i) => (
          <div
            key={item.itemId ?? i}
            className="flex items-center gap-2 shrink-0"
          >
            <ItemTile item={item} />
            {i < visible.length - 1 && (
              <PlusIcon className="text-zinc-500 text-sm self-start mt-7 shrink-0" />
            )}
          </div>
        ))}
        {extraCount > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-zinc-300 font-bold text-sm self-start mt-5 shrink-0">
              +
            </span>
            <MoreBubble count={extraCount} />
          </div>
        )}
      </div>

      {/* ── Pricing + CTA ────────────────────────────────────────────── */}
      <div className="px-4 pb-3.5 space-y-2">
        {/* Clear pricing: Regular → Combo · Save */}
        {savingsRupees > 0 && (
          <div className="flex items-center gap-1.5 text-sm flex-wrap">
            <span className="font-semibold">Combo Price:</span>
            <span className="text-muted-foreground line-through">
              ₹{fmt(regularTotal)}
            </span>
            <span className="font-semibold">
              ₹{fmt(comboPrice)}
            </span>
            <Badge className="ml-auto bg-emerald-50 border border-emerald-200 text-emerald-700 ">
              Save ₹{fmt(savingsRupees)}
            </Badge>
          </div>
        )}

        {/* CTA */}
        <Button
          type="button"
          size="lg"
          onClick={onAddBundle}
          disabled={isLoading || disabled}
          aria-busy={isLoading}
          className="w-full"
          aria-label={
            isLoading
              ? "Adding items to cart…"
              : disabled
                ? "Bundle already added"
                : `Add all and save ₹${fmt(savingsRupees)}`
          }

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
              <CaretRightIcon />
            </>
          )}
        </Button>
      </div>
    </article>
  );
}

RecommendedBundleCard.propTypes = {
  bundleItems: PropTypes.arrayOf(
    PropTypes.shape({
      itemId: PropTypes.number.isRequired,
      itemName: PropTypes.string.isRequired,
      imageUrl: PropTypes.string,
      price: PropTypes.number,
    }),
  ).isRequired,
  /** Amount saved — drives the savings badge and CTA label */
  savings: PropTypes.number.isRequired,
  onAddBundle: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  /** Primary cart item name for personalised social proof copy */
  primaryItemName: PropTypes.string,
  /** Integer 0-100 for social proof percentage (default 87) */
  confidencePercent: PropTypes.number,
  // kept for backward compatibility — no longer displayed
  originalPrice: PropTypes.number,
  finalPrice: PropTypes.number,
};
