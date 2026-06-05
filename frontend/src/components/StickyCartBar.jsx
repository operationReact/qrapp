import { useCart } from "../context/CartContext";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Cart } from "@boxicons/react";
import { useAuth } from "@/context/AuthContext";

const pluralRules = new Intl.PluralRules("en-US");

function pluralOf(count) {
  const rule = pluralRules.select(count);

  const words = {
    one: "item",
    other: "items",
  };

  return `${count} ${words[rule]}`;
}

const stickyCartBarVisibleRoutes = ["/", "/search"];

export default function StickyCartBar() {
  const { cart, getTotal, openDrawer, closeDrawer } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  // Only show the sticky cart bar on the landing page (home)
  if (location && !stickyCartBarVisibleRoutes.includes(location.pathname))
    return null;

  if (isAdmin) return null;

  const totalItems = cart.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalPrice = getTotal();

  const handleViewCart = () => {
    if (location.pathname === "/") {
      openDrawer();
    } else {
      closeDrawer();
      navigate({ to: "/cart" });
    }
  };

  if (totalItems === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 pb-mobile-nav md:px-2.5 md:pb-2.5 z-39 pointer-events-auto">
      <div className="rounded-t-xl max-w-md md:rounded-xl md:max-w-1/2 mx-auto border border-b-0 md:border-b border-border bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="w-full px-8 sm:px-4 md:mx-auto md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
          <div className="flex md:min-h-[72px] items-center md:py-3">
            <div className="flex w-full items-center justify-between gap-3 py-2 md:py-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className="hidden md:flex size-6 md:size-10 relative bg-primary-foreground/50 flex-none items-center justify-center rounded-full text-base font-semibold text-primary">
                  <Cart pack="filled" className="size-6" />
                  <span className="absolute hidden md:grid bg-white rounded-full w-8 place-items-center -bottom-2 border border-muted text-xs text-black">
                    {totalItems}
                  </span>
                </div>
                <div className="min-w-0 flex gap-1 md:flex-col items-baseline">
                  <div className="text-xs font-medium order-1 md:order-0 md:tracking-wide text-muted-foreground">
                    <span>{pluralOf(totalItems)}</span> in cart
                  </div>
                  <div className="truncate text-sm md:text-base font-semibold">
                    ₹{totalPrice.toFixed(2)}{" "}
                    <span className="text-muted-foreground md:hidden text-sm">
                      /
                    </span>
                  </div>
                </div>
              </div>

              <Button
                className="font-medium! rounded-full h-9 text-sm!"
                onClick={handleViewCart}
                aria-label="View cart"
              >
                View Cart
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
