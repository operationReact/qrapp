import { useCart } from "../context/CartContext";
import { useLocation } from "@tanstack/react-router";
import { Button } from "./ui/button";
import CartItem from "./shared/CartItem";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { X, Truck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Empty, EmptyDescription, EmptyHeader } from "./ui/empty";
import { useQuery } from "@tanstack/react-query";
import { getCartRecommendations, getRecommendedBundle, getMealRecommendation } from "@/services/recommendation-service";
import { PlusCircleIcon, SparkleIcon } from "@phosphor-icons/react";
import ComboProgressBanner from "@/components/ComboProgressBanner";
import { useByocDiscount } from "@/hooks/useByocDiscount";
import RecommendedBundleCard from "@/components/RecommendedBundleCard";
import CompleteMealCard from "@/components/CompleteMealCard";
import { cn } from "@/lib/utils";

// ── Free-delivery progress bar ────────────────────────────────────────────────
const FREE_DELIVERY_THRESHOLD = 500;

function DeliveryProgress({ cartTotal }) {
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - cartTotal);
  const progress  = Math.min(100, (cartTotal / FREE_DELIVERY_THRESHOLD) * 100);
  const unlocked  = cartTotal >= FREE_DELIVERY_THRESHOLD;

  return (
    <div className="mx-3 mb-2 px-3.5 py-2.5 rounded-xl border border-primary/15 bg-primary/5">
      <div className="flex items-center justify-between text-xs mb-1.5">
        {unlocked ? (
          <span className="font-semibold text-emerald-700 flex items-center gap-1">
            🎉 Free Delivery Unlocked!
          </span>
        ) : (
          <>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Truck className="size-3 shrink-0" />
              Add{" "}
              <span className="font-semibold text-foreground">
                ₹{remaining.toFixed(0)}
              </span>{" "}
              more
            </span>
            <span className="font-semibold text-primary text-[10px] uppercase tracking-wide">
              FREE DELIVERY
            </span>
          </>
        )}
      </div>
      <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            unlocked ? "bg-emerald-500" : "bg-primary",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ── Smart upsell: only ONE section rendered at a time (priority-based) ─────────
function SmartUpsellSection({ cart, addItem, isOpen }) {
  const cartItemsKey = cart.map((i) => `${i.id}:${i.quantity}`).sort().join(",");
  const cartTotal    = cart.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const itemIds      = cart.map((i) => i.id);
  const categoryIds  = [
    ...new Set(cart.filter((i) => i.category?.id).map((i) => i.category.id)),
  ];

  const [mealAdded,    setMealAdded]    = useState(false);
  const [mealAdding,   setMealAdding]   = useState(false);
  const [bundleAdded,  setBundleAdded]  = useState(false);
  const [bundleAdding, setBundleAdding] = useState(false);

  // ── Priority 1: Complete Your Meal ────────────────────────────────────────
  const { data: meal, isLoading: mealLoading, isError: mealError } = useQuery({
    queryKey: ["complete-meal", cartItemsKey],
    queryFn:  () => getMealRecommendation({ cartItemIds: itemIds, cartTotal }),
    enabled:  isOpen && cart.length > 0,
    staleTime: 1000 * 60 * 3,
    retry:    false,
  });
  const hasMeal = !mealLoading && !mealError && !!(meal?.mealItems?.length);

  // ── Priority 2: Frequently Bought Together ────────────────────────────────
  const { data: bundle, isLoading: bundleLoading, isError: bundleError } = useQuery({
    queryKey: ["v1-recommended-bundle", cartItemsKey],
    queryFn:  () => getRecommendedBundle({ cartItemIds: itemIds, cartTotal }),
    enabled:  isOpen && cart.length > 0 && !mealLoading && !hasMeal,
    staleTime: 1000 * 60 * 3,
    retry:    false,
  });
  const hasBundle = !bundleLoading && !bundleError && !!(bundle?.bundleItems?.length);

  // ── Priority 3: General recommendations ──────────────────────────────────
  const { data: recsData, isLoading: recsLoading } = useQuery({
    queryKey: ["cart-recommendations", itemIds.slice().sort().join(",")],
    queryFn:  () =>
      getCartRecommendations({ itemIds, categoryIds, cartTotal, maxResults: 5 }),
    enabled:
      isOpen &&
      cart.length > 0 &&
      !mealLoading && !hasMeal &&
      !bundleLoading && !hasBundle,
    staleTime: 1000 * 60 * 2,
  });
  const suggestions = recsData?.suggestions ?? [];

  // Reset "added" state when cart changes
  useEffect(() => {
    const t = setTimeout(() => {
      setMealAdded(false);
      setBundleAdded(false);
    }, 0);
    return () => clearTimeout(t);
  }, [cartItemsKey]);

  const handleAddMeal = async () => {
    if (!meal?.mealItems?.length) return;
    setMealAdding(true);
    try {
      const cartIds = new Set(cart.map((i) => i.id));
      meal.mealItems
        .filter((item) => !cartIds.has(item.itemId))
        .forEach((item) =>
          addItem({
            id:       item.itemId,
            name:     item.itemName,
            imageUrl: item.imageUrl ?? undefined,
            price:    Number(item.price),
          }),
        );
      setMealAdded(true);
    } finally {
      setMealAdding(false);
    }
  };

  const handleAddBundle = async () => {
    if (!bundle) return;
    setBundleAdding(true);
    try {
      const cartIds = new Set(cart.map((i) => i.id));
      bundle.bundleItems
        .filter((item) => !cartIds.has(item.itemId))
        .forEach((item) =>
          addItem({
            id:       item.itemId,
            name:     item.itemName,
            imageUrl: item.imageUrl ?? undefined,
            price:    Number(item.price),
          }),
        );
      setBundleAdded(true);
    } finally {
      setBundleAdding(false);
    }
  };

  // Show skeleton while the top-priority query is still in flight
  const showSkeleton =
    mealLoading ||
    (!hasMeal && bundleLoading) ||
    (!hasMeal && !hasBundle && recsLoading);

  if (showSkeleton) {
    return (
      <div className="px-3 pt-2 pb-1">
        <div className="h-36 rounded-2xl bg-zinc-100/70 animate-pulse" />
      </div>
    );
  }

  if (hasMeal) {
    return (
      <div className="px-3 pt-2 pb-1">
        <CompleteMealCard
          mainItemName={meal.mainItemName ?? cart[0]?.name}
          mealItems={meal.mealItems}
          savings={Number(meal.savings)}
          onAddMeal={handleAddMeal}
          isLoading={mealAdding}
          disabled={mealAdded}
        />
      </div>
    );
  }

  if (hasBundle) {
    return (
      <div className="px-3 pt-2 pb-1">
        <RecommendedBundleCard
          bundleItems={bundle.bundleItems}
          originalPrice={Number(bundle.originalPrice)}
          savings={Number(bundle.savings)}
          finalPrice={Number(bundle.finalPrice)}
          primaryItemName={cart[0]?.name}
          onAddBundle={handleAddBundle}
          isLoading={bundleAdding}
          disabled={bundleAdded}
        />
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 py-3 border-t">
      <div className="flex items-center gap-1.5 mb-2.5">
        <SparkleIcon weight="fill" className="size-3.5 text-orange-500" />
        <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
          Recommended For You
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {suggestions.map((s) => (
          <div
            key={s.itemId}
            className="flex-shrink-0 w-32 border rounded-xl overflow-hidden bg-background shadow-sm hover:shadow-md transition-shadow"
          >
            {s.imageUrl && (
              <img
                src={s.imageUrl}
                alt={s.itemName}
                className="w-full h-16 object-cover"
              />
            )}
            <div className="p-2">
              <p className="text-xs font-medium leading-tight line-clamp-2 mb-1.5">
                {s.itemName}
              </p>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold">
                  {s.discountLabel ? (
                    <span className="text-emerald-600">{s.discountLabel}</span>
                  ) : (
                    `₹${s.price}`
                  )}
                </span>
                <button
                  onClick={() =>
                    addItem({
                      id:       s.itemId,
                      name:     s.itemName,
                      imageUrl: s.imageUrl,
                      price:    s.price,
                    })
                  }
                  className="flex items-center gap-0.5 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-1 rounded-lg"
                  aria-label={`Add ${s.itemName}`}
                >
                  <PlusCircleIcon className="size-3.5" weight="fill" />
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartContent({ onClose, isOpen }) {
  const {
    cart,
    getTotal,
    addItem,
    decreaseItem,
    removeItem,
    appliedPromotion,
    byocDiscount,
    getTotalAfterDiscount,
  } = useCart();
  const navigate = useNavigate();

  const total              = getTotal();
  const totalAfterDiscount = getTotalAfterDiscount();
  const discount           = Math.max(0, total - totalAfterDiscount);

  // BYOC progress
  const { campaigns: byocCampaigns } = useByocDiscount(cart, isOpen);
  const primaryCampaign = byocCampaigns[0] ?? null;

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">
        <div className="px-4">
          {cart.length === 0 && (
            <Empty className="p-4 border mb-4">
              <EmptyHeader>
                <EmptyDescription>Your cart is empty</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {cart.map((item) => (
            <CartItem
              item={item}
              key={item.id}
              addItem={addItem}
              decreaseItem={decreaseItem}
              removeItem={removeItem}
            />
          ))}
        </div>

        {/* Smart upsell — ONE section at a time, priority-based */}
        {cart.length > 0 && (
          <SmartUpsellSection cart={cart} addItem={addItem} isOpen={isOpen} />
        )}

        {/* Free-delivery progress bar */}
        {cart.length > 0 && (
          <DeliveryProgress cartTotal={total} />
        )}

        {/* BYOC combo progress */}
        {cart.length > 0 && primaryCampaign && (
          <div className="px-4 pb-3">
            <ComboProgressBanner campaign={primaryCampaign} />
          </div>
        )}
      </div>

      {/* ── Sticky checkout footer — always visible ── */}
      <div className="shrink-0 border-t pt-3 pb-6 px-4 mt-auto bg-card">
        {/* Savings banner */}
        {discount > 0 && (
          <div className="flex items-center justify-between mb-2.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="text-xs font-medium text-emerald-700">
              🎉 You Save
            </span>
            <span className="text-sm font-bold text-emerald-700">
              ₹{discount.toFixed(0)}
              {appliedPromotion && (
                <span className="ml-1 text-[10px] font-normal text-emerald-600">
                  · {appliedPromotion.code ?? "offer"}
                </span>
              )}
              {!appliedPromotion && byocDiscount && (
                <span className="ml-1 text-[10px] font-normal text-emerald-600">
                  · combo deal
                </span>
              )}
            </span>
          </div>
        )}

        {/* Total row */}
        <div className="flex items-center justify-between pb-3">
          <div className="text-muted-foreground flex gap-2 items-center font-medium text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M21 11h-3V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v13c0 1.65 1.35 3 3 3h14c1.65 0 3-1.35 3-3v-6c0-.55-.45-1-1-1m-7 6h-3v-2h3zm0-4H6v-2h8zm0-4H6V7h8zm6 9c0 .55-.45 1-1 1s-1-.45-1-1v-5h2z" />
            </svg>
            Total
          </div>
          <div className="font-bold text-xl">₹{totalAfterDiscount.toFixed(0)}</div>
        </div>

        <Button
          size="lg"
          onClick={() => {
            onClose();
            navigate({ to: "/cart" });
          }}
          className="w-full h-12 font-medium! text-base!"
        >
          Proceed to Checkout →
        </Button>
      </div>
    </>
  );
}

function MobileCart({ open, onClose }) {
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      direction="bottom"
    >
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="py-2.5 px-4 shrink-0">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-base font-semibold">
              Your Cart
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>
          <DrawerDescription className="sr-only">
            Review items before checkout
          </DrawerDescription>
        </DrawerHeader>
        <CartContent onClose={onClose} isOpen={open} />
      </DrawerContent>
    </Drawer>
  );
}

function DesktopCart({ open, onClose }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={true}
        className="h-full w-96 flex flex-col"
      >
        <SheetHeader className="shrink-0 pb-2 pt-1">
          <SheetTitle className="text-base font-semibold">Your Cart</SheetTitle>
        </SheetHeader>
        <CartContent onClose={onClose} isOpen={open} />
      </SheetContent>
    </Sheet>
  );
}

export default function OffCanvasCart() {
  const { openDrawer, drawerOpen, closeDrawer } = useCart();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  function closeDrawerAndNavigate() {
    closeDrawer();
    navigate({ to: ".", resetScroll: false });
  }

  useEffect(() => {
    if (location.hash === "cart") {
      openDrawer();
    } else {
      closeDrawer();
    }
  }, [location.hash]);

  if (isAdmin) return null;

  if (location && location.pathname && location.pathname.startsWith("/cart"))
    return null;

  if (isMobile) {
    return <MobileCart open={drawerOpen} onClose={closeDrawerAndNavigate} />;
  }

  return <DesktopCart open={drawerOpen} onClose={closeDrawerAndNavigate} />;
}
