import { useCart } from "../context/CartContext";
import { useLocation, useNavigate } from "@tanstack/react-router";
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

function CartContent({ onClose }) {
  const { cart, getTotal, addItem, decreaseItem, removeItem } = useCart();
  const navigate = useNavigate();

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 [scrollbar-width:thin]">
        {cart.length === 0 && (
          <p className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            Cart is empty
          </p>
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
  const { drawerOpen, closeDrawer } = useCart();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();

  if (isAdmin) return null;

  if (location && location.pathname && location.pathname.startsWith("/cart"))
    return null;

  if (isMobile) {
    return <MobileCart open={drawerOpen} onClose={closeDrawer} />;
  }

  return <DesktopCart open={drawerOpen} onClose={closeDrawer} />;
}
