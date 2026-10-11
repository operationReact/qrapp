import PropTypes from "prop-types";
import { PlusIcon } from "@phosphor-icons/react";
import { useCart } from "@/context/CartContext";
import { baseURL } from "@/services";
import { formatCurrency } from "@/lib/utils";
import { essentialsProductAsset } from "@/lib/essentialsAssets";

function imageUrl(item) {
  if (!item.imageUrl) return null;
  return item.imageUrl.startsWith("http") ? item.imageUrl : `${baseURL}${item.imageUrl}`;
}

export default function RetailProductCard({ item }) {
  const { cart, addItem } = useCart();
  const quantity = cart.find((entry) => entry.id === item.id)?.quantity || 0;
  const suppliedImage = essentialsProductAsset(item.name);
  const stockStatus = item.stockStatus || (item.available === false ? "OUT_OF_STOCK" : "IN_STOCK");
  const outOfStock = stockStatus === "OUT_OF_STOCK" || item.available === false;
  const lowStock = stockStatus === "LOW_STOCK";

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative aspect-square overflow-hidden bg-[#fff1ed]">
        {imageUrl(item) || suppliedImage ? (
          <img
            src={imageUrl(item) || suppliedImage}
            alt={item.name}
            className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
            loading="lazy"
          />
        ) : (
          <div className="size-full bg-[#faf7f3]" aria-hidden="true" />
        )}
        <span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold ${
          outOfStock ? "bg-zinc-800 text-white" : lowStock ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"
        }`}>
          {outOfStock ? "Out of stock" : lowStock ? "Only a few left" : "● In Stock"}
        </span>
      </div>
      <div className="space-y-1.5 p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">{item.name}</h3>
        {item.mrp != null && (
          <p className="text-xs text-muted-foreground">MRP {formatCurrency(item.mrp)}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <strong className="text-lg leading-none">{formatCurrency(item.price)}</strong>
          <button
            type="button"
            aria-label={`Add ${item.name} to cart`}
            disabled={outOfStock}
            onClick={() => addItem(item)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {quantity > 0 ? <span className="text-xs font-bold">{quantity}</span> : <PlusIcon weight="bold" className="size-5" />}
          </button>
        </div>
      </div>
    </article>
  );
}

RetailProductCard.propTypes = {
  item: PropTypes.object.isRequired,
};
