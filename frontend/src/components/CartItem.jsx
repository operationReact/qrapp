import { useState } from "react";
import QuantityUpdater from "./QuantityUpdater";
import API from "@/services/api";

export default function CartItem({ item, removeItem, addItem, decreaseItem }) {
  const [imgError, setImgError] = useState(false);

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
    <div
      key={item.id}
      className="grid grid-cols-[4rem_1fr_auto] place-content-start gap-2.5 py-2 border-b last:border-none"
    >
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-100">
        {imageSrc && !imgError ? (
          <img
            src={imageSrc}
            alt={item.name}
            onError={() => setImgError(true)}
            className="size-16 object-cover rounded-md"
          />
        ) : (
          <div className="w-full h-full flex items-center rounded-lg justify-center text-5xl bg-linear-to-br from-red-50 to-red-100">
            <img
              src="/brand/white.png"
              alt="Bro Logo"
              className="opacity-20 size-1/2 animate-pulse"
            />
          </div>
        )}

        {/* veg/non-veg badge */}
        <div
          title={item.isVeg ? "Veg" : "Non Veg"}
          className={`absolute top-2 left-2 p-1 border-2 bg-white rounded-sm size-4 flex items-center ${veg ? "border-accent-400" : "border-red-600"}`}
        >
          <span
            className={`size-full rounded-full ${item.isVeg ? "bg-accent-400" : "bg-red-600"}`}
          ></span>
        </div>
      </div>

      {/* cart item details*/}
      <div className="min-w-0 w-full">
        <div className="truncate text-md font-semibold">{item.name}</div>
        <div className="mt-0 text-sm text-muted-foreground">₹{item.price}</div>
        <button
          onClick={() => removeItem(item.id)}
          className="text-sm! rounded font-medium! text-primary transition-transform duration-150 active:scale-95"
        >
          Remove
        </button>
      </div>

      <div className="gap-0 justify-self-end">
        <div className="text-right text-lg font-bold mb-1">
          ₹{(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
        </div>
        <QuantityUpdater
          qty={item.quantity}
          onIncrease={() => addItem(item)}
          onDecrease={() => decreaseItem(item)}
          className={"h-fit"}
        />
      </div>
    </div>
  );
}
