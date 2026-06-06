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
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Empty, EmptyDescription, EmptyHeader } from "./ui/empty";
import { useQuery } from "@tanstack/react-query";
import { getCartRecommendations } from "@/services/recommendation-service";
import { PlusCircleIcon } from "@phosphor-icons/react";

function CartRecommendations({ cart, addItem }) {
  const itemIds = cart.map((i) => i.id);
  const categoryIds = [
    ...new Set(cart.filter((i) => i.category?.id).map((i) => i.category.id)),
  ];
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const { data, isLoading } = useQuery({
    queryKey: ["cart-recommendations", itemIds.sort().join(",")],
    queryFn: () =>
      getCartRecommendations({
        itemIds,
        categoryIds,
        cartTotal,
        maxResults: 5,
      }),
    enabled: itemIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  const suggestions = data?.suggestions ?? [];
  if (isLoading || suggestions.length === 0) return null;

  return (
    <div className="px-4 py-3 border-t">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Complete your meal
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {suggestions.map((s) => (
          <div
            key={s.itemId}
            className="flex-shrink-0 w-32 border rounded-xl p-2 bg-background hover:bg-muted/40 transition-colors"
          >
            {s.imageUrl && (
              <img
                src={s.imageUrl}
                alt={s.itemName}
                className="w-full h-16 object-cover rounded-lg mb-1.5"
              />
            )}
            <p className="text-xs font-medium leading-tight line-clamp-2 mb-1">
              {s.itemName}
            </p>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-muted-foreground">
                {s.discountLabel ? (
                  <span className="text-emerald-600 font-medium">
                    {s.discountLabel}
                  </span>
                ) : (
                  `₹${s.price}`
                )}
              </span>
              <button
                onClick={() =>
                  addItem({
                    id: s.itemId,
                    name: s.itemName,
                    imageUrl: s.imageUrl,
                    price: s.price,
                  })
                }
                className="text-primary hover:text-primary/80 transition-colors"
                aria-label={`Add ${s.itemName}`}
              >
                <PlusCircleIcon className="size-5" weight="fill" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartContent({ onClose }) {
  const { cart, getTotal, addItem, decreaseItem, removeItem } = useCart();
  const navigate = useNavigate();

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
        {cart.length > 0 && <CartRecommendations cart={cart} addItem={addItem} />}
      </div>

      <div className="shrink-0 border-t pt-4 pb-6 px-4 mt-auto">
        <div className="flex items-center justify-between rounded-xl pb-3">
          <div className="text-muted-foreground flex gap-2 items-center font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M21 11h-3V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v13c0 1.65 1.35 3 3 3h14c1.65 0 3-1.35 3-3v-6c0-.55-.45-1-1-1m-7 6h-3v-2h3zm0-4H6v-2h8zm0-4H6V7h8zm6 9c0 .55-.45 1-1 1s-1-.45-1-1v-5h2z"></path>
            </svg>{" "}
            Total
          </div>
          <div className="font-bold text-lg">₹{getTotal().toFixed(2)}</div>
        </div>
        <Button
          size="lg"
          onClick={() => {
            onClose();
            navigate({ to: "/cart" });
          }}
          className="w-full h-12 font-medium!"
        >
          Checkout
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
        <DrawerHeader>
          <DrawerTitle className="text-lg font-semibold text-center">
            Your Cart
          </DrawerTitle>
          <DrawerDescription>Review items before checkout</DrawerDescription>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="shrink-0 absolute right-5 top-5"
          >
            <X className="size-4" />
          </Button>
        </DrawerHeader>
        <CartContent onClose={onClose} />
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
        <SheetHeader className="shrink-0 flex-row items-center justify-between pb-0">
          <div>
            <SheetTitle className="text-lg font-semibold">Your Cart</SheetTitle>
            <p className="text-sm font-medium text-muted-foreground">
              Review items before checkout
            </p>
          </div>
        </SheetHeader>
        <CartContent onClose={onClose} />
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
