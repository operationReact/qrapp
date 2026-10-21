import { useState } from "react";
import PropTypes from "prop-types";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useCart } from "@/context/CartContext";
import { useItemAddons } from "@/hooks/useItemAddons";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function ProductDetailBody({ item, imageSrc, outOfStock }) {
  const { cart, addItem, decreaseItem } = useCart();
  const { data: groups = [] } = useItemAddons(item.id);
  const [selection, setSelection] = useState({});
  const hasAddons = groups.length > 0;
  const quantity = cart
    .filter((entry) => String(entry.id) === String(item.id))
    .reduce((sum, entry) => sum + entry.quantity, 0);

  const toggle = (group, optionId) => {
    setSelection((prev) => {
      const current = prev[group.id] ?? [];
      let next;
      if (current.includes(optionId)) next = current.filter((id) => id !== optionId);
      else if (group.maxSelect === 1) next = [optionId];
      else if (current.length < group.maxSelect) next = [...current, optionId];
      else return prev;
      return { ...prev, [group.id]: next };
    });
  };

  const chosen = groups.flatMap((group) =>
    group.options
      .filter((option) => (selection[group.id] ?? []).includes(option.id))
      .map((option) => ({
        id: option.id,
        name: option.name,
        groupName: group.name,
        priceDelta: Number(option.priceDelta),
      })),
  );
  const unitPrice = Number(item.price) + chosen.reduce((sum, option) => sum + option.priceDelta, 0);
  const invalidGroup = groups.find((group) => (selection[group.id] ?? []).length < group.minSelect);

  return (
    <>
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
          <strong className="text-xl leading-none">
            {item.price != null ? formatCurrency(hasAddons ? unitPrice : item.price) : "\u2014"}
          </strong>
          {outOfStock ? (
            <span className="text-sm font-semibold text-muted-foreground">Out of stock</span>
          ) : hasAddons ? (
            quantity > 0 && <span className="text-xs text-muted-foreground">{quantity} in cart</span>
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

        {hasAddons && !outOfStock && (
          <div className="space-y-4 pt-2">
            {groups.map((group) => (
              <fieldset key={group.id} className="space-y-2">
                <legend className="text-sm font-semibold">
                  {group.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {group.minSelect > 0 ? "Required" : "Optional"}
                    {group.maxSelect > 1 ? `, up to ${group.maxSelect}` : ""}
                  </span>
                </legend>
                {group.options.map((option) => {
                  const checked = (selection[group.id] ?? []).includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-2.5 text-sm ${checked ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(group, option.id)}
                          className="size-4 accent-primary"
                        />
                        {option.name}
                      </span>
                      {Number(option.priceDelta) > 0 && (
                        <span className="text-xs text-muted-foreground">+{formatCurrency(option.priceDelta)}</span>
                      )}
                    </label>
                  );
                })}
              </fieldset>
            ))}
            {invalidGroup && (
              <p className="text-xs text-muted-foreground">
                Choose at least {invalidGroup.minSelect} in "{invalidGroup.name}".
              </p>
            )}
            <button
              type="button"
              disabled={!!invalidGroup}
              onClick={() => addItem({ ...item, price: unitPrice, addonOptions: chosen })}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-50"
            >
              <PlusIcon weight="bold" className="size-4" />
              Add to cart {"\u00b7"} {formatCurrency(unitPrice)}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function ProductDetailDialog({ item, imageSrc, open, onOpenChange, outOfStock = false }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-[calc(100%-1.5rem)] overflow-y-auto p-0 sm:max-w-sm">
        <ProductDetailBody item={item} imageSrc={imageSrc} outOfStock={outOfStock} />
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