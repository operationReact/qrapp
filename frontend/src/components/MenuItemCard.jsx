import { useState } from "react";
import { useCart } from "../context/CartContext";
import PropTypes from "prop-types";
import { baseURL } from "../services";
import { BagIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { useNavigate } from "@tanstack/react-router";

export default function MenuItemCard({ item }) {
  const { cart, addItem } = useCart();
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();

  const existing = cart.find((i) => i.id === item.id);
  const qty = existing ? existing.quantity : 0;

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

  return (
    <article className="group h-full border border-border rounded-lg overflow-hidden">
      <div className="relative aspect-square w-full">
        {imageSrc && !imgError ? (
          <img
            src={imageSrc}
            alt={item.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full overflow-hidden h-full flex items-center justify-center text-5xl bg-linear-to-br from-primary/25 to-primary">
            <img
              src="/brand/white.png"
              alt="Bro Logo"
              className="opacity-20 size-1/2 animate-pulse"
            />
          </div>
        )}

        {/* <div className="absolute bottom-0 inset-x-0 p-1 sm:p-2 flex justify-end">
          <MenuItemActionButton
            qty={qty}
            onAdd={() => addItem(item)}
            onDecrease={() => decreaseItem(item)}
          />
          {item.tag && <Badge variant="secondary">{item.tag.name}</Badge>}
        </div>*/}

        {/* veg/non-veg badge */}
        <div
          title={veg ? "Veg" : "Non Veg"}
          className={`absolute scale-75 sm:scale-100 top-2 left-2 p-1.5 border-2 bg-white rounded-sm size-6 flex items-center gap-2 ${veg ? "border-accent-400" : "border-red-600"}`}
        >
          <span
            className={`size-full rounded-full ${veg ? "bg-accent-400" : "bg-red-600"}`}
          ></span>
        </div>
      </div>

      <div className="px-2 py-1.5 sm:py-2">
        {/* name in image */}
        <h3 className="text-pretty text-xs leading-4 font-semibold sm:text-lg">
          {item.name}
        </h3>
        {/* <p className="line-clamp-2 mt-1 capitalize text-xs text-muted-foreground">
          {item.description || "Delicious choice"}
        </p>*/}

        <div className="flex mt-1 sm:mt-2 items-center gap-2 justify-between">
          <span className="font-medium text-sm md:text-base">₹{item.price.toFixed(0)}</span>
          <Button
            variant={qty > 0 ? "secondary" : "shadow-white"}
            size="sm"
            className="size-8 md:h-9 md:w-auto aspect-square md:aspect-auto"
            onClick={() => {
              if (qty > 0) navigate({ to: "/#cart" });
              else addItem(item);
            }}
          >
            {qty > 0 ? <BagIcon weight="bold" /> : <PlusIcon weight="bold" />}

            <span className="hidden md:inline animate-in transition-opacity duration-200">
              {qty > 0 ? "Cart" : "Add"}
            </span>
          </Button>
        </div>

        {/* CTA */}
      </div>
    </article>
  );
}

MenuItemCard.propTypes = {
  item: PropTypes.object.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};
