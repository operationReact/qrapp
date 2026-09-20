import PropTypes from "prop-types";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "@tanstack/react-router";
import { BagIcon, DotIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "./ui/badge";

export default function CategoryDishCard({ item }) {
  const { cart, addItem } = useCart();
  const qty = cart.find((i) => i.id === item.id)?.quantity ?? 0;
  const navigate = useNavigate();

  const veg =
    item.isVeg === true ||
    item.isVeg === "true" ||
    item.isVeg === 1 ||
    item.isVeg === "1";

  return (
    <article className="flex items-start gap-3 p-3">
      <div className="relative shrink-0">
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className="size-24 rounded-lg object-cover"
        />
        {item.isVeg != null && (
          <div
            title={veg ? "Veg" : "Non Veg"}
            className={`absolute origin-top-left scale-75 top-1 left-1 p-1 border-2 bg-white rounded-sm size-5 flex items-center ${veg ? "border-accent-400" : "border-red-600"}`}
          >
            <span
              className={`size-full rounded-full ${veg ? "bg-accent-400" : "bg-red-600"}`}
            ></span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 text-base font-semibold text-foreground">
          {item.name}
        </h3>
        <div className="flex gap-2 items-center">
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.category?.name}
          </p>
          <span className="text-muted-foreground">•</span>
          {item.tag?.name && <Badge variant="secondary">{item.tag.name}</Badge>}
        </div>

        <p className="mt-0.5 text-base font-semibold text-foreground">
          ₹{Number(item.price || 0).toFixed(0)}
        </p>
        <div className="mt-auto flex items-center justify-end pt-2">
          <Button
            variant={qty > 0 ? "secondary" : "shadow-white"}
            size="sm"
            className="size-8 md:h-9 md:w-auto aspect-square md:aspect-auto"
            onClick={() => {
              if (qty > 0) navigate({ to: "#cart" });
              else addItem(item);
            }}
          >
            {qty > 0 ? <BagIcon weight="bold" /> : <PlusIcon weight="bold" />}
            <span className="hidden md:inline">{qty > 0 ? "Cart" : "Add"}</span>
          </Button>
        </div>
      </div>
    </article>
  );
}

CategoryDishCard.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.number,
    imageUrl: PropTypes.string,
    isVeg: PropTypes.bool,
    category: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      description: PropTypes.string,
    }),
    tag: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
    }),
    vendorId: PropTypes.number,
    fulfillmentType: PropTypes.string,
    inventoryMode: PropTypes.string,
    isHidden: PropTypes.bool,
    stockStatus: PropTypes.string,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
  }).isRequired,
};
