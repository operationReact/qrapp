import PropTypes from "prop-types";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function ProductDetailDialog({ item, imageSrc, open, onOpenChange, outOfStock = false }) {
  const { cart, addItem, decreaseItem } = useCart();
  const quantity = cart.find((entry) => entry.id === item.id)?.quantity || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden p-0 sm:max-w-sm">
        <div className="relative aspect-square bg-[#fff1ed]">
          {imageSrc ? (
            <img src={imageSrc} alt={item.name} className="absolute inset-0 size-full object-contain p-6" />
          ) : (
            <div className="size-full bg-[#faf7f3]" aria-hidden="true" />
          )}
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-start gap-2">
            {typeof item.isVeg === "boolean" && (
              <span
                role="img"
                aria-label={item.isVeg ? "Veg" : "Non veg"}
                className={`mt-1 flex size-4 shrink-0 items-center rounded-sm border-2 bg-white p-px ${item.isVeg ? "border-accent-400" : "border-red-600"}`}
              >
                <span className={`size-full rounded-full ${item.isVeg ? "bg-accent-400" : "bg-red-600"}`} />
              </span>
            )}
            <DialogTitle className="text-lg font-bold leading-6">{item.name}</DialogTitle>
          </div>
          {item.description && (
            <DialogDescription className="text-sm leading-5">{item.description}</DialogDescription>
          )}
          <div className="flex items-center justify-between gap-3 pt-1">
            <strong className="text-xl leading-none">{item.price != null ? formatCurrency(item.price) : "—"}</strong>
            {outOfStock ? (
              <span className="text-sm font-semibold text-muted-foreground">Out of stock</span>
            ) : quantity > 0 ? (
              <div className="flex h-10 items-center justify-between gap-3 rounded-full bg-primary/5 px-1 ring-1 ring-primary/20">
                <button
                  type="button"
                  aria-label={`Remove one ${item.name}`}
                  onClick={() => decreaseItem(item)}
                  className="flex size-8 items-center justify-center rounded-full bg-background text-primary shadow-xs"
                >
                  <MinusIcon weight="bold" className="size-4" />
                </button>
                <span className="min-w-6 text-center text-base font-bold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  aria-label={`Add one more ${item.name}`}
                  onClick={() => addItem(item)}
                  className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                >
                  <PlusIcon weight="bold" className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => addItem(item)}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm"
              >
                <PlusIcon weight="bold" className="size-4" />
                Add to cart
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

ProductDetailDialog.propTypes = {
  item: PropTypes.object.isRequired,
  imageSrc: PropTypes.string,
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  outOfStock: PropTypes.bool,
};
