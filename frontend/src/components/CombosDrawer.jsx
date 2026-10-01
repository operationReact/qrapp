import { useQuery } from "@tanstack/react-query";
import { publicCombosOptions } from "@/query/options/combos";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import {
  TagIcon,
  ClockIcon,
  StarIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import { baseURL } from "@/services";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import QuantitySelector from "@/components/QuantitySelector";
import { Badge } from "./ui/badge";

// ── Combo → cart item shape ────────────────────────────────────────────────
// Combos are not menu items, so we give them a prefixed id to avoid
// collisions and mark them with isCombo=true for downstream awareness.
// `locationId` comes straight from the backend (combo.locationId, derived
// from the combo's menu items) — never assumed on the frontend.
function toCartItem(combo) {
  return {
    id: `combo_${combo.id}`,
    name: combo.comboName,
    price: Number(combo.comboPrice),
    imageUrl: combo.thumbnailUrl ?? null,
    isCombo: true,
    description: combo.itemNames?.join(", ") ?? "",
    locationId: combo.locationId ?? null,
  };
}

// ── Single combo card ──────────────────────────────────────────────────────
function ComboCard({ combo }) {
  const { cart, addItem, decreaseItem } = useCart();
  const isAvailable = combo.availabilityStatus === "AVAILABLE";

  const cartItem = toCartItem(combo);
  const existing = cart.find((i) => i.id === cartItem.id);
  const qty = existing ? existing.quantity : 0;

  const imageSrc = combo.thumbnailUrl
    ? combo.thumbnailUrl.startsWith("http")
      ? combo.thumbnailUrl
      : `${baseURL}${combo.thumbnailUrl}`
    : null;

  const savings = Number(combo.savingsPercentage ?? 0);

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border border-border bg-white p-2",
        !isAvailable && "opacity-60",
      )}
    >
      {/* ── Thumbnail ─────────────────────────────── */}
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={combo.comboName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
            <img
              src="/brand/white.png"
              alt=""
              className="size-1/2 object-contain opacity-20"
            />
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        {/* Row 1: name + savings badge */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex flex-wrap items-center gap-1">
            <h3 className="flex-1 shrink-0 text-sm font-semibold leading-snug">
              {combo.comboName}
            </h3>
            {/* Featured badge — overlaid on image */}
            {combo.isFeatured && (
              <Badge className="bg-amber-100 text-amber-700">
                <StarIcon weight="fill" className="size-2.5" />
                Featured
              </Badge>
            )}
          </div>
          {savings > 0 && (
            <Badge className="ml-1 bg-green-50 text-green-700 border-green-100">
              <TagIcon weight="bold" className="size-2.5" />
              {savings.toFixed(0)}% off
            </Badge>
          )}
        </div>

        {/* Row 2: item names */}
        {combo.itemNames?.length > 0 && (
          <p className="line-clamp-1 text-xs leading-tight text-zinc-500">
            {combo.itemNames.join(" · ")}
          </p>
        )}

        {/* Row 3: price + action */}
        <div className="flex items-center justify-between gap-2">
          {/* Pricing */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold leading-none">
              ₹{Number(combo.comboPrice).toFixed(0)}
            </span>
            {combo.originalPrice &&
              Number(combo.originalPrice) > Number(combo.comboPrice) && (
                <span className="text-xs text-zinc-500 line-through">
                  ₹{Number(combo.originalPrice).toFixed(0)}
                </span>
              )}
          </div>

          {/* Action — QuantitySelector or unavailable badge */}
          {isAvailable ? (
            <QuantitySelector
              qty={qty}
              onAdd={() => addItem(cartItem)}
              onRemove={() => decreaseItem(cartItem)}
            />
          ) : (
            <Badge className="border-dashed border-gray-300 bg-gray-50 text-gray-500">
              {combo.availabilityStatus === "SCHEDULE_INACTIVE" ? (
                <>
                  <ClockIcon weight="duotone" className="size-3" />
                  Available later
                </>
              ) : combo.availabilityStatus === "PREORDER_CLOSED" ? (
                <>
                  <ClockIcon weight="duotone" className="size-3" />
                  Pre-order closed
                </>
              ) : (
                <>
                  <ProhibitIcon weight="duotone" className="size-3" />
                  Unavailable
                </>
              )}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Drawer ─────────────────────────────────────────────────────────────────
export default function CombosDrawer({ open, onOpenChange }) {
  const { activeLocationId } = useLocation();
  const {
    data: combos = [],
    isLoading,
    isError,
  } = useQuery({
    ...publicCombosOptions(activeLocationId),
    enabled: open,
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90dvh] md:max-w-lg md:mx-auto">
        <DrawerHeader className="pb-1">
          <DrawerTitle className="text-[17px] font-bold">
            🏷️ Combo Deals
          </DrawerTitle>
          <DrawerDescription className="text-[13px]">
            Bundle and save — exclusive combo pricing on your favourites.
          </DrawerDescription>
        </DrawerHeader>

        <div
          className="no-scrollbar flex-1 overflow-y-auto px-4 pb-8 pt-1"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* Skeletons */}
          {isLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[106px] animate-pulse rounded-2xl bg-gray-100"
                />
              ))}
            </div>
          )}

          {/* Error */}
          {isError && (
            <p className="pt-8 text-center text-sm text-gray-500">
              Could not load combos right now. Please try again.
            </p>
          )}

          {/* Empty */}
          {!isLoading && !isError && combos.length === 0 && (
            <p className="pt-12 text-center text-sm text-gray-500">
              No combo deals available right now. Check back soon!
            </p>
          )}

          {/* Cards */}
          {!isLoading && !isError && combos.length > 0 && (
            <div className="flex flex-col gap-3">
              {combos.map((combo) => (
                <ComboCard key={combo.id} combo={combo} />
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
