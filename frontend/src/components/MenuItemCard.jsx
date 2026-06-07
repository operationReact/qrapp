import { useState } from "react";
import { useCart } from "../context/CartContext";
import PropTypes from "prop-types";
import { baseURL } from "../services";

import {
  ProhibitIcon,
  ClockIcon,
  CalendarCheckIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import QuantitySelector from "./QuantitySelector";
import CustomerPreOrderDialog from "./CustomerPreOrderDialog";

const PRE_ORDER_ONLY_TAG = "PreOrderOnly";

function isPreOrderOnly(item) {
  return item?.tag?.name === PRE_ORDER_ONLY_TAG;
}

export default function MenuItemCard({
  item,
  overrideUnavailable = false,
  unavailableLabel,
}) {
  const { cart, addItem, decreaseItem } = useCart();
  const [imgError, setImgError] = useState(false);
  const [preOrderOpen, setPreOrderOpen] = useState(false);

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
          "group bg-background h-full border border-border rounded-lg overflow-hidden transition-opacity",
          isUnavailable && "opacity-70",
          // Pre-order items: entire card is the tap target
          preOrderOnly &&
            !isUnavailable &&
            "cursor-pointer ring-0 hover:ring-2 hover:ring-indigo-300 hover:border-indigo-300 transition-all",
        )}
        onClick={
          preOrderOnly && !isUnavailable
            ? () => setPreOrderOpen(true)
            : undefined
        }
      >
        {/* Image */}
        <div className="relative aspect-video w-full">
          {imageSrc && !imgError ? (
            <img
              src={imageSrc}
              alt={item.name}
              onError={() => setImgError(true)}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                isUnavailable && "grayscale",
              )}
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
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
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
            <div className="absolute top-2 right-2">
              <span className="flex items-center gap-1 rounded-full bg-indigo-950/75 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-indigo-100">
                <CalendarCheckIcon className="size-2.5" weight="fill" />
                Pre-Order
              </span>
            </div>
          )}

          {/* veg/non-veg indicator */}
          <div
            title={veg ? "Veg" : "Non Veg"}
            className={cn(
              "absolute origin-top-left scale-75 sm:scale-100 top-2 left-2 p-1.5 border-2 bg-white rounded-sm size-6 flex items-center gap-2",
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
        </div>

        {/* Details */}
        <div className="px-2 py-1.5 sm:py-2">
          <h3
            className={cn(
              "text-pretty text-xs leading-4 font-semibold sm:text-lg",
              isUnavailable && "text-muted-foreground",
            )}
          >
            {item.name}
          </h3>

          <div className="flex flex-wrap mt-1 sm:mt-2 items-center gap-2 justify-between">
            <span
              className={cn(
                "font-medium text-sm md:text-base",
                isUnavailable &&
                  "text-muted-foreground line-through decoration-muted-foreground/60",
              )}
            >
              ₹{item.price?.toFixed(0) ?? "—"}
            </span>

            {isUnavailable ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-muted-foreground/40 px-2 py-1 text-[10px] font-medium text-muted-foreground">
                {isTimegated ? (
                  <ClockIcon weight="duotone" className="size-3" />
                ) : (
                  <ProhibitIcon weight="duotone" className="size-3" />
                )}
                {bottomLabel}
              </span>
            ) : preOrderOnly ? (
              /* No per-card button — the whole card is tappable */
              <span className="text-[10px] font-medium text-indigo-400 select-none">
                Tap to pre-order
              </span>
            ) : (
              <QuantitySelector
                qty={qty}
                onAdd={() => addItem(item)}
                onRemove={() => decreaseItem(item)}
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
    </>
  );
}

MenuItemCard.propTypes = {
  item: PropTypes.object.isRequired,
  overrideUnavailable: PropTypes.bool,
  unavailableLabel: PropTypes.string,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};
