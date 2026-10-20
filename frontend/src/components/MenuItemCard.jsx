import { useState } from "react";
import { useCart } from "../context/CartContext";
import PropTypes from "prop-types";
import { baseURL } from "../services";

import {
  ProhibitIcon,
  ClockIcon,
  CalendarCheckIcon,
} from "@phosphor-icons/react";
import { cn, formatCurrency } from "@/lib/utils";
import QuantitySelector from "./QuantitySelector";
import CustomerPreOrderDialog from "./CustomerPreOrderDialog";
import ProductDetailDialog from "./ProductDetailDialog";

const PRE_ORDER_ONLY_TAG = "PreOrderOnly";

function isPreOrderOnly(item) {
  return item?.tag?.name === PRE_ORDER_ONLY_TAG;
}

export default function MenuItemCard({
  item,
  overrideUnavailable = false,
  unavailableLabel,
  compact = false,
}) {
  const { cart, addItem, decreaseItem } = useCart();
  const [imgError, setImgError] = useState(false);
  const [preOrderOpen, setPreOrderOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const preOrderOnly = isPreOrderOnly(item);

  const existing = cart.find((i) => i.id === item.id);
  const qty = existing ? existing.quantity : 0;

  const availableRaw = item.available;
  const isAvailable =
    availableRaw === undefined ||
    availableRaw === null ||
    availableRaw === true ||
    availableRaw === "true" ||
    availableRaw === 1 ||
    availableRaw === "1";

  // overrideUnavailable lets callers (e.g. time-gated segments) disable
  // ordering without touching the item data itself.
  const isUnavailable =
    overrideUnavailable || !isAvailable || item.stockStatus === "OUT_OF_STOCK";

  // Decide what the overlay badge and bottom action label should say.
  // Time-window callers supply unavailableLabel ("Opens 8 AM").
  // Stock callers fall back to the standard "Out of Stock" / "Unavailable".
  const isTimegated = overrideUnavailable && !!unavailableLabel;
  const overlayText = isTimegated ? unavailableLabel : "Out of Stock";
  const bottomLabel = isTimegated ? unavailableLabel : "Unavailable";

  const computeImageSrc = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${baseURL}${url}`;
  };

  const imageSrc = computeImageSrc(item.imageUrl);

  const veg =
    item.isVeg === true ||
    item.isVeg === "true" ||
    item.isVeg === 1 ||
    item.isVeg === "1";

  return (
    <>
      <article
        className={cn(
          "group h-full overflow-hidden rounded-xl border border-border bg-card transition-opacity md:rounded-2xl",
          isUnavailable && "opacity-70",
          // Pre-order items: entire card is the tap target
          preOrderOnly &&
            !isUnavailable &&
            "cursor-pointer ring-0 border-primary/20 hover:border-primary/30 transition-all",
        )}
        onClick={
          preOrderOnly && !isUnavailable
            ? () => setPreOrderOpen(true)
            : undefined
        }
      >
        {/* Image */}
        <button
          type="button"
          onClick={() => {
            if (!preOrderOnly) setDetailOpen(true);
          }}
          aria-label={preOrderOnly ? undefined : `View ${item.name} details`}
          className={cn(
            "relative block aspect-[1.45] w-full text-left md:aspect-[4/3]",
            !preOrderOnly && "cursor-pointer",
          )}
        >
          {imageSrc && !imgError ? (
            <img
              src={imageSrc}
              alt={item.name}
              onError={() => setImgError(true)}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                isUnavailable && "grayscale",
              )}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full overflow-hidden h-full flex items-center justify-center bg-zinc-100">
              <img
                src="/brand/white.png"
                alt="Bro Logo"
                className="opacity-20 size-1/2 object-contain animate-pulse"
              />
            </div>
          )}

          {/* Unavailable overlay badge — stock or time-gated */}
          {isUnavailable && (
            <div className="absolute inset-x-0 bottom-1 flex items-center justify-start pl-1">
              <span className="flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                {isTimegated ? (
                  <ClockIcon weight="bold" className="size-3 shrink-0" />
                ) : (
                  <ProhibitIcon weight="bold" className="size-3 shrink-0" />
                )}
                {overlayText}
              </span>
            </div>
          )}

          {/* Pre-Order Only badge — top right, passive label only */}
          {preOrderOnly && !isUnavailable && (
            <div className="absolute top-2 right-1">
              <span className="flex items-center gap-1 rounded-full bg-indigo-950/75 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-indigo-100">
                <CalendarCheckIcon className="size-3" weight="fill" />
                Pre-Order
              </span>
            </div>
          )}

          {/* veg/non-veg indicator */}
          <div
            title={veg ? "Veg" : "Non Veg"}
            className={cn(
              "menu-item-dietary-icon absolute top-1 left-1 flex items-center gap-2 rounded-[3px] border bg-white md:top-2 md:left-2 md:size-6 md:origin-top-left md:scale-90 md:rounded-sm md:border-2 md:p-1.5",
              veg ? "border-accent-400" : "border-red-600",
            )}
          >
            <span
              className={cn(
                "size-full rounded-full",
                veg ? "bg-accent-400" : "bg-red-600",
              )}
            />
          </div>
        </button>

        {/* Details */}
        <div className="space-y-1 p-2 md:space-y-2 md:p-3">
          <h3
            className={cn(
              "line-clamp-2 min-h-8 text-pretty text-[13px] font-semibold leading-[17px] md:min-h-0 md:text-[15px] md:leading-5 lg:min-h-10 lg:text-[17px]",
              isUnavailable && "text-muted-foreground",
            )}
          >
            {item.name}
          </h3>

          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-1.5 md:gap-2",
              compact && "flex-col items-stretch gap-1 md:flex-row md:items-center",
            )}
          >
            <span
              className={cn(
                "font-semibold text-[14px] leading-5 lg:text-base",
                isUnavailable &&
                  "text-muted-foreground line-through decoration-muted-foreground/60",
              )}
            >
              {item.price != null ? formatCurrency(item.price) : "—"}
            </span>

            {isUnavailable ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {isTimegated ? (
                  <ClockIcon weight="duotone" className="size-3" />
                ) : (
                  <ProhibitIcon weight="duotone" className="size-3" />
                )}
                {bottomLabel}
              </span>
            ) : preOrderOnly ? (
              /* No per-card button — the whole card is tappable */
              <span className="text-[11px] font-medium text-primary select-none">
                Tap to pre-order
              </span>
            ) : (
              <QuantitySelector
                qty={qty}
                onAdd={() => addItem(item)}
                onRemove={() => decreaseItem(item)}
                compact={compact}
                className={compact ? "w-full" : undefined}
              />
            )}
          </div>
        </div>
      </article>

      {preOrderOnly && (
        <CustomerPreOrderDialog
          initialItem={item}
          open={preOrderOpen}
          onOpenChange={setPreOrderOpen}
        />
      )}
      {!preOrderOnly && (
        <ProductDetailDialog
          item={item}
          imageSrc={imageSrc && !imgError ? imageSrc : null}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          outOfStock={isUnavailable}
        />
      )}
    </>
  );
}

MenuItemCard.propTypes = {
  item: PropTypes.object.isRequired,
  overrideUnavailable: PropTypes.bool,
  unavailableLabel: PropTypes.string,
  compact: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};
