import PropTypes from "prop-types";
import { PlusIcon } from "@phosphor-icons/react";
import { useCart } from "@/context/CartContext";
import { baseURL } from "@/services";
import { formatCurrency } from "@/lib/utils";
import { essentialsProductAsset } from "@/lib/essentialsAssets";
import QuantitySelector from "@/components/QuantitySelector";

function imageUrl(item) {
  if (!item.imageUrl) return null;
  return item.imageUrl.startsWith("http") ? item.imageUrl : `${baseURL}${item.imageUrl}`;
}

export default function RetailProductCard({ item }) {
  const { cart, addItem, decreaseItem } = useCart();
  const quantity = cart.find((entry) => entry.id === item.id)?.quantity || 0;
  const suppliedImage = essentialsProductAsset(item.name);
  const stockStatus = item.stockStatus || (item.available === false ? "OUT_OF_STOCK" : "IN_STOCK");
  const outOfStock = stockStatus === "OUT_OF_STOCK" || item.available === false;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:rounded-2xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#fff1ed] sm:aspect-square">
        {imageUrl(item) || suppliedImage ? (
          <img
            src={imageUrl(item) || suppliedImage}
            alt={item.name}
            className="absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 object-contain"
            loading="lazy"
          />
        ) : (
          <div className="size-full bg-[#faf7f3]" aria-hidden="true" />
        )}
      </div>
      <div className="space-y-1 p-2 sm:space-y-1.5 sm:p-3">
        <h3 className="line-clamp-2 min-h-8 text-xs font-semibold leading-4 sm:min-h-10 sm:text-sm sm:leading-5">{item.name}</h3>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <strong className="text-sm leading-none sm:text-lg">{formatCurrency(item.price)}</strong>
          {quantity > 0 ? (
            <QuantitySelector
              compact
              qty={quantity}
              onAdd={() => addItem(item)}
              onRemove={() => decreaseItem(item)}
            />
          ) : (
            <button
              type="button"
              aria-label={`Add ${item.name} to cart`}
              disabled={outOfStock}
              onClick={() => addItem(item)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:size-9"
            >
              <PlusIcon weight="bold" className="size-5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

RetailProductCard.propTypes = {
  item: PropTypes.object.isRequired,
};
