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
export default function QuantitySelector({ qty, onAdd, onRemove, className }) {
  /* ── "Add" pill ─────────────────────────────────── */
  if (qty === 0) {
    return (
      <Button
        onClick={onAdd}
        size="xs"
        variant="branded-secondary"
        aria-label="Add to cart"
        className={cn(
          // shape & layout
          "flex items-center gap-1 rounded-full px-3",
          "h-8 font-semibold",

          // elevation — soft shadow lifts it off the card
          "shadow-xs",
          // interaction
          "transition-all duration-150 ease-out",
          "hover:sm hover:brightness-110",
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
        "grid grid-cols-3 items-center rounded-sm overflow-hidden",
        "h-8 select-none",
        // soft elevated background
        "bg-background",
        "shadow-xs",
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
          "flex rounded-sm h-full bg-primary/5 w-8 shrink-0 items-center justify-center",
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
          "text-xs font-bold tabular-nums leading-none",
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
          "flex rounded-sm h-full w-8 shrink-0 items-center justify-center",
          "bg-primary text-primary-foreground",
          "transition-all duration-100",
          "hover:brightness-110",
          "active:scale-90",
        )}
      >
        <PlusIcon weight="bold" className="size-3.5" />
      </button>
    </div>
  );
}
