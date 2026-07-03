import { useState } from "react";
import QuantityUpdater from "./QuantityUpdater";
import { baseURL } from "@/services";
import { cn } from "@/lib/utils";

// Map known tag names → badge label + colour
const TAG_BADGE_MAP = {
  "best seller":   { label: "⭐ Best Seller",      cls: "bg-amber-50  text-amber-700  border-amber-200"  },
  "bestseller":    { label: "⭐ Best Seller",      cls: "bg-amber-50  text-amber-700  border-amber-200"  },
  "most popular":  { label: "🔥 Most Popular",     cls: "bg-orange-50 text-orange-700 border-orange-200" },
  "popular":       { label: "🔥 Popular",          cls: "bg-orange-50 text-orange-700 border-orange-200" },
  "chef special":  { label: "👨‍🍳 Chef Special",  cls: "bg-purple-50 text-purple-700 border-purple-200" },
  "chef's special":{ label: "👨‍🍳 Chef Special",  cls: "bg-purple-50 text-purple-700 border-purple-200" },
  "new":           { label: "✨ New",              cls: "bg-blue-50   text-blue-700   border-blue-200"   },
  "trending":      { label: "📈 Trending",         cls: "bg-pink-50   text-pink-700   border-pink-200"   },
};

function getSocialBadge(tag) {
  if (!tag?.name) return null;
  return TAG_BADGE_MAP[tag.name.toLowerCase()] ?? null;
}

export default function CartItem({ item, removeItem, addItem, decreaseItem }) {
  const [imgError, setImgError] = useState(false);

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

  const badge = getSocialBadge(item.tag);

  return (
    <div
      key={item.id}
      className="grid grid-cols-[4rem_1fr_auto] place-content-start gap-2.5 py-2.5 border-b last:border-none"
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
          <div className="w-full h-full flex items-center rounded-lg justify-center bg-zinc-100">
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
          className={`absolute top-1.5 left-1.5 p-0.5 border-2 bg-white rounded-[4px] size-3.5 flex items-center ${veg ? "border-accent-400" : "border-red-600"}`}
        >
          <span
            className={`size-full rounded-full ${item.isVeg ? "bg-accent-400" : "bg-red-600"}`}
          />
        </div>
      </div>

      {/* item details */}
      <div className="min-w-0 w-full">
        <div className="truncate text-sm font-semibold leading-tight">{item.name}</div>

        {/* Social proof badge */}
        {badge && (
          <span
            className={cn(
              "inline-block mt-0.5 mb-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
              badge.cls,
            )}
          >
            {badge.label}
          </span>
        )}

        <div className={cn("text-xs text-muted-foreground", !badge && "mt-0.5")}>
          ₹{item.price}
        </div>
        <button
          onClick={() => removeItem(item.id)}
          className="text-xs rounded font-medium text-primary transition-transform duration-150 active:scale-95 mt-0.5"
        >
          Remove
        </button>
      </div>

      <div className="gap-0 justify-self-end grid place-items-end">
        <div className="text-right text-sm font-semibold mb-1.5">
          ₹{(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(0)}
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
