import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import PropTypes from "prop-types";
import API from "../services/api";
import MenuItemActionButton from "./MenuItemActionButton";

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
      <div className="relative aspect-square w-full">
        {imageSrc && !imgError ? (
          <img
            src={imageSrc}
            alt={item.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          <div className="w-full rounded-xl overflow-hidden h-full flex items-center justify-center text-5xl bg-linear-to-br from-primary/25 to-primary">
            <img
              src="/brand/white.png"
              alt="Bro Logo"
              className="opacity-20 size-1/2 animate-pulse"
            />
          </div>
        )}

        {/* subtle gradient overlay */}
        {/* <div className="absolute left-0 right-0 bottom-0 bg-linear-[rgba(27,30,36,0)_0%,_rgb(27,30,36)_84.21%)] h-22" /> */}

        <div className="absolute left-0 bottom-0 right-0 px-2 py-2 flex justify-end items-baseline">
          <span
            className="bg-white font-bold rounded-tr-sm absolute bottom-0 left-0 px-2 py-0.5 sm:py-1 sm:text-xl text-black
            before:absolute before:left-0 before:top-0 before:size-4 before:-translate-y-full before:rounded-bl-sm before:shadow-[0px_7px_white] before:bg-transparent
            after:absolute after:right-0 after:bottom-0 after:size-4 after:translate-x-full after:rounded-bl-sm after:shadow-[0px_7px_white] after:bg-transparent"
          >
            ₹{item.price.toFixed(0)}
          </span>

          {/* CTA */}
          <MenuItemActionButton
            qty={qty}
            onAdd={() => addItem(item)}
            onDecrease={() => decreaseItem(item)}
          />
        </div>

        {/* veg/non-veg badge */}
        <div
          title={veg ? "Veg" : "Non Veg"}
          className={`absolute top-2 left-2 p-1.5 border-2 bg-white rounded-sm size-6 flex items-center gap-2 ${veg ? "border-accent-400" : "border-red-600"}`}
        >
          <span
            className={`size-full rounded-full ${veg ? "bg-accent-400" : "bg-red-600"}`}
          ></span>
        </div>
      </div>

      <div className="py-2">
        {/* name in image */}
        {item.tag && (
          <span className="text-xs font-medium text-primary">{item.tag.name}</span>
        )}
        <h3 className="text-balance text-md font-semibold leading-5 sm:text-lg text-zinc-800">
          {item.name}
        </h3>
        <p className="line-clamp-2 mt-1 capitalize text-xs text-muted-foreground">
          {item.description || "Delicious choice"}
        </p>

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
