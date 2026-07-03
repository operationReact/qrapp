import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { baseURL } from "@/services";
import { BagIcon, PlusIcon, ProhibitIcon, ClockIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import CustomerPreOrderDialog from "@/components/CustomerPreOrderDialog";

/**
 * HeroProductCard
 *
 * 1.8× scale featured card for Pre-Order Specials hero slot.
 * The entire card is the tap target — no per-card CTA button.
 */
export default function HeroProductCard({ item, badge }) {
  const { cart, addItem } = useCart();
  const [imgError, setImgError] = useState(false);
  const [preOrderOpen, setPreOrderOpen] = useState(false);
  const navigate = useNavigate();

  const existing = cart.find((i) => i.id === item.id);
  const qty = existing ? existing.quantity : 0;

  const availableRaw = item.available;
  const isAvailable =
    availableRaw === undefined ||
    availableRaw === null ||
    availableRaw === true ||
    availableRaw === "true" ||
    availableRaw === 1 ||
    availableRaw === "1";
  const isUnavailable = !isAvailable || item.stockStatus === "OUT_OF_STOCK";

  const isPreOrder =
    item?.tag?.name === "PreOrderOnly" ||
    badge?.toLowerCase().includes("pre");

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

  const handleCardClick = () => {
    if (isUnavailable) return;
    if (isPreOrder) { setPreOrderOpen(true); return; }
    if (qty > 0) navigate({ to: "/#cart" });
    else addItem(item);
  };

  return (
    <>
      <article
        className={cn(
          "group relative w-full overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all",
          isUnavailable && "opacity-70",
          !isUnavailable && "cursor-pointer hover:ring-2 hover:ring-indigo-300 hover:border-indigo-300",
        )}
        onClick={handleCardClick}
      >
        {/* Image — 16:9 aspect, full width */}
        <div className="relative w-full aspect-video">
          {imageSrc && !imgError ? (
            <img
              src={imageSrc}
              alt={item.name}
              onError={() => setImgError(true)}
              className={cn(
                "h-full w-full object-cover",
                isUnavailable && "grayscale",
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
              <img
                src="/brand/white.png"
                alt="Bro Logo"
                className="size-1/3 animate-pulse object-contain opacity-20"
              />
            </div>
          )}

          {/* Out of stock overlay */}
          {isUnavailable && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
                <ProhibitIcon weight="bold" className="size-3.5" />
                Out of Stock
              </span>
            </div>
          )}

          {/* Veg / Non-veg dot */}
          <div
            title={veg ? "Veg" : "Non Veg"}
            className={cn(
              "absolute left-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-sm border-2 bg-white",
              veg ? "border-green-600" : "border-red-600",
            )}
          >
            <span
              className={cn("block h-2.5 w-2.5 rounded-full", veg ? "bg-green-600" : "bg-red-600")}
            />
          </div>

          {/* Segment badge — top right */}
          {badge && (
            <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
              {badge}
            </span>
          )}

          {/* Pre-order pill — bottom left — passive label only */}
          <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-indigo-950/75 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-100">
            <ClockIcon weight="bold" className="size-3" />
            Pre-Order Only
          </span>
        </div>

        {/* Details row */}
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-bold leading-snug text-gray-900">
              {item.name}
            </h3>
            {item.description && (
              <p className="mt-0.5 line-clamp-1 text-[12px] text-gray-500">
                {item.description}
              </p>
            )}
            <span className="mt-1 block text-[14px] font-semibold text-gray-800">
              ₹{item.price?.toFixed(0) ?? "—"}
            </span>
          </div>

          {isUnavailable ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-2 text-[11px] font-medium text-gray-400">
              <ProhibitIcon weight="duotone" className="size-3.5" />
              Unavailable
            </span>
          ) : isPreOrder ? (
            <span className="text-[10px] font-medium text-indigo-400 shrink-0 select-none">
              Tap to pre-order
            </span>
          ) : (
            <Button
              variant={qty > 0 ? "secondary" : "default"}
              size="sm"
              className="h-10 shrink-0 gap-1.5 rounded-xl px-4 font-semibold"
              onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
            >
              {qty > 0 ? (
                <>
                  <BagIcon weight="bold" className="size-4" />
                  <span>In Cart</span>
                </>
              ) : (
                <>
                  <PlusIcon weight="bold" className="size-4" />
                  <span>Add</span>
                </>
              )}
            </Button>
          )}
        </div>
      </article>

      {isPreOrder && (
        <CustomerPreOrderDialog
          initialItem={item}
          open={preOrderOpen}
          onOpenChange={setPreOrderOpen}
        />
      )}
    </>
  );
}

