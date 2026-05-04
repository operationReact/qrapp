import { useCart } from "../context/CartContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Button } from "./ui/button";
import { Cart } from "@boxicons/react";

export default function StickyCartBar() {
  const { cart, getTotal, openDrawer, closeDrawer } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { admin } = useAdminAuth();

  // Only show the sticky cart bar on the landing page (home)
  if (location && location.pathname !== "/") return null;

  if (admin) return null;

  const totalItems = cart.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalPrice = getTotal();

  const handleViewCart = () => {
    if (location.pathname === "/") {
      openDrawer();
    } else {
      closeDrawer();
      navigate("/cart");
    }
  };

  if (totalItems === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 px-2.5 pb-2.5 z-50 pointer-events-auto">
      <div className="rounded-3xl md:max-w-1/2 mx-auto border border-gray-200 bg-white shadow-md pb-[env(safe-area-inset-bottom)]">
        <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
          <div className="flex min-h-[72px] items-center py-3">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 relative bg-primary-foreground/50 flex-none items-center justify-center rounded-full text-base font-semibold text-primary">
                  <Cart pack="filled" />
                  <span className="absolute bg-white rounded-full w-8 grid place-items-center -bottom-2 border border-muted text-xs text-black">
                    {totalItems}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium tracking-wide text-muted-foreground">
                    Items in cart
                  </div>
                  <div className="truncate text-base font-semibold">
                    ₹{totalPrice.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex w-auto items-center gap-2">
                <Button
                  variant="outline"
                  className="font-medium! rounded-lg"
                  onClick={handleViewCart}
                  aria-label="View cart"
                >
                  <Cart pack="filled" /> View Cart
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
