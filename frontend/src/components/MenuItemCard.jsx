import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import PropTypes from "prop-types";
import API from "../services/api";
import ItemActionButton from "./AddButton";

export default function MenuItemCard({ item, onEdit, onDelete }) {
  const { cart, addItem, decreaseItem } = useCart();
  const { admin } = useAdminAuth();
  const [imgError, setImgError] = useState(false);

  const existing = cart.find((i) => i.id === item.id);
  const qty = existing ? existing.quantity : 0;

  const computeImageSrc = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API.defaults.baseURL}${url}`;
  };

  const imageSrc = computeImageSrc(item.imageUrl);

  const veg =
    item.isVeg === true ||
    item.isVeg === "true" ||
    item.isVeg === 1 ||
    item.isVeg === "1";

  return (
    <article className="group overflow-hidden">
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-100">
        {imageSrc && !imgError ? (
          <img
            src={imageSrc}
            alt={item.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center rounded-lg justify-center text-5xl bg-linear-to-br from-primary/25 to-primary">
            <img
              src="/brand/white.png"
              alt="Bro Logo"
              className="opacity-20 size-1/2 animate-pulse"
            />
          </div>
        )}

        {/* subtle gradient overlay */}
        <div className="absolute left-0 right-0 bottom-0 bg-linear-[rgba(27,30,36,0)_0%,_rgb(27,30,36)_84.21%)] h-22" />

        {/* veg/non-veg badge */}
        <div
          title={veg ? "Veg" : "Non Veg"}
          className={`absolute top-2 left-2 p-1 border-2 bg-white rounded-md size-6 flex items-center gap-2 ${veg ? "border-accent-400" : "border-red-600"}`}
        >
          <span
            className={`size-full rounded-full ${veg ? "bg-accent-400" : "bg-red-600"}`}
          ></span>
        </div>

        {/* name in image */}
        <div className="absolute left-0 bottom-0 right-0 px-2 py-2 flex justify-between items-baseline gap-0.5">
          <h3 className="line-clamp-1 text-md font-medium drop-shadow leading-6 sm:text-lg text-white">
            {item.name}
          </h3>

          {/* CTA */}
          <ItemActionButton
            qty={qty}
            onAdd={() => addItem(item)}
            onDecrease={() => decreaseItem(item)}
          />
        </div>
      </div>

      <div className="space-y-1 py-2 flex justify-between gap-2 items-start">
        <div className="flex-1">
          {item.tag && (
            <span className="text-xs font-medium text-red-600">{item.tag}</span>
          )}
          <p className="line-clamp-2 capitalize text-sm text-muted-foreground">
            {item.description || "Delicious choice"}
          </p>
        </div>

        <span className="font-semibold text-lg sm:text-xl">₹{item.price}</span>

        {admin && (
          <div className="flex gap-2 mt-2">
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="text-xs px-2 py-1 bg-yellow-400 rounded"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(item)}
                className="text-xs px-2 py-1 bg-red-400 rounded"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

MenuItemCard.propTypes = {
  item: PropTypes.object.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};
