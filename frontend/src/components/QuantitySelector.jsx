import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

/**
 * QuantitySelector
 *
 * Premium pill-style quantity control inspired by Swiggy, Zomato, Blinkit.
 *
 * States
 *   qty === 0  →  "Add" pill  (primary filled, rounded-full)
 *   qty  >  0  →  stepper     (− qty +, pill container)
 *
 * Interaction details
 *   • qty number gets a key={qty} so React remounts it on every change,
 *     triggering the zoom-in CSS animation as a number-change micro-interaction.
 *   • Both add-pill and stepper share rounded-full + shadow so the morph
 *     feels like the same element changing shape.
 *   • Plus is always filled-primary (primary action emphasis).
 *   • Minus is text-only to visually de-emphasize the destructive direction.
 *   • active:scale-95 gives instant tap feedback without a JS handler.
 */
export default function QuantitySelector({
  qty,
  onAdd,
  onRemove,
  className,
  compact = false,
}) {
  /* ── "Add" pill ─────────────────────────────────── */
  if (qty === 0) {
    return (
      <Button
        onClick={onAdd}
        size="sm"
        variant="branded-secondary"
        aria-label="Add to cart"
        className={cn(
          // shape & layout
          compact
            ? "flex h-8 min-w-[3.5rem] items-center justify-center gap-0.5 rounded-[10px] px-2 text-[12px] font-semibold"
            : "flex h-8 min-w-[4.5rem] items-center justify-center gap-1 rounded-[10px] px-3 text-[13px] font-semibold",
          "md:h-10 md:min-w-[5.75rem] md:rounded-full md:px-4 md:text-sm",
          "lg:h-8 lg:min-w-[4.75rem] lg:px-3 lg:text-xs",

          // elevation — soft shadow lifts it off the card
          "shadow-xs",
          // interaction — entry animation eases the Add pill into the stepper
          "transition-all duration-150 ease-out",
          "qty-selector qty-selector-enter",
          "hover:brightness-110",
          className,
        )}
      >
        <PlusIcon weight="bold" />
        <span>Add</span>
      </Button>
    );
  }

  /* ── Stepper pill ───────────────────────────────── */
  return (
    <div
      className={cn(
        // pill container
        "grid grid-cols-3 items-center overflow-hidden rounded-full",
        compact
          ? "h-8 min-w-[4.25rem] select-none"
          : "h-8 min-w-[5.25rem] select-none",
        "md:h-10 md:min-w-[6.75rem]",
        "lg:h-8 lg:min-w-[5.5rem]",
        // soft elevated background
        "bg-background",
        "shadow-xs",
        "qty-selector qty-selector-enter",
        // hairline border using primary tint
        "ring-1 ring-primary/20",
        className,
      )}
    >
      {/* Minus — de-emphasised, text only */}
      <button
        onClick={onRemove}
        aria-label="Remove one"
        className={cn(
          compact
            ? "flex h-full w-5 shrink-0 items-center justify-center bg-primary/5"
            : "flex h-full w-7 shrink-0 items-center justify-center bg-primary/5",
          "md:w-10",
          "lg:w-10",
          "text-primary/60",
          "transition-all duration-100",
          "hover:bg-primary/10 hover:text-primary",
          "active:scale-90",
        )}
      >
        <MinusIcon weight="bold" className="size-3" />
      </button>

      {/* Quantity — key triggers zoom-in animation on every change */}
      <span
        key={qty}
        className={cn(
          "text-center",
          "text-sm font-bold tabular-nums leading-none lg:text-xs",
          // tw-animate-css utilities — remount animation on qty change
          "animate-in zoom-in-75 fade-in duration-150 ease-out",
        )}
      >
        {qty}
      </span>

      {/* Plus — filled primary, visually primary action */}
      <button
        onClick={onAdd}
        aria-label="Add one more"
        className={cn(
          compact
            ? "flex h-full w-5 shrink-0 items-center justify-center"
            : "flex h-full w-7 shrink-0 items-center justify-center",
          "md:w-10",
          "lg:w-10",
          "bg-primary text-primary-foreground",
          "transition-all duration-100",
          "hover:brightness-110",
          "active:scale-90",
        )}
      >
        <PlusIcon weight="bold" className={compact ? "size-3" : "size-3.5 lg:size-4"} />
      </button>
    </div>
  );
}
