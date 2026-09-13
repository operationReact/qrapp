import { useCart } from "../context/CartContext";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Cart } from "@boxicons/react";
import { useAuth } from "@/context/AuthContext";
import { useByocDiscount } from "@/hooks/useByocDiscount";
import ComboProgressBanner from "@/components/ComboProgressBanner";

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

  const totalItems = cart.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalPrice = getTotal();

  // BYOC nudge — only evaluated when cart has items
  const { campaigns: byocCampaigns } = useByocDiscount(cart, totalItems > 0);
  const primaryByoc = byocCampaigns[0] ?? null;

  // Only show the sticky cart bar on the landing page (home)
  if (location && !stickyCartBarVisibleRoutes.includes(location.pathname))
    return null;

  if (isAdmin) return null;

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
    <div className="fixed inset-x-0 bottom-[calc(var(--app-mobile-menu-height)+env(safe-area-inset-bottom)+0.5rem)] z-39 pointer-events-auto px-3 lg:bottom-2.5 lg:px-2.5">
      {/* BYOC compact nudge strip — shown above the bar when progress exists */}
      {primaryByoc && primaryByoc.nextTier && (
        <div className="mx-auto flex max-w-md items-center justify-center rounded-t-2xl border border-b-0 border-emerald-200 bg-emerald-50 px-4 py-1.5 lg:max-w-1/2">
          <ComboProgressBanner campaign={primaryByoc} compact />
        </div>
      )}
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card/95 backdrop-blur-sm shadow-lg lg:max-w-1/2 lg:rounded-xl lg:border-b pb-[env(safe-area-inset-bottom)]">
        <div className="w-full px-4">
          <div className="flex min-h-16 items-center py-2 lg:min-h-[72px] lg:py-3">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="hidden lg:flex size-10 relative bg-primary-foreground/50 flex-none items-center justify-center rounded-full text-base font-semibold text-primary">
                  <Cart pack="filled" className="size-6" />
                  <span className="absolute hidden lg:grid bg-white rounded-full w-8 place-items-center -bottom-2 border border-muted text-xs text-black">
                    {totalItems}
                  </span>
                </div>
                <div className="min-w-0 flex flex-col gap-0.5">
                  <div className="text-xs font-medium tracking-wide text-muted-foreground">
                    <span>{pluralOf(totalItems)}</span> in cart
                  </div>
                  <div className="truncate text-base font-semibold lg:text-lg">
                    ₹{totalPrice.toFixed(2)}{" "}
                  </div>
                </div>
              </div>

              <Button
                className="h-11 rounded-full px-4 text-sm font-semibold"
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
