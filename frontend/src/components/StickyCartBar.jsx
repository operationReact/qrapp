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
    <div className="fixed inset-x-0 bottom-[calc(var(--app-mobile-menu-height)+env(safe-area-inset-bottom)+0.5rem)] z-[45] pointer-events-auto px-2 lg:bottom-2.5 lg:px-2.5">
      {/* BYOC compact nudge strip — shown above the bar when progress exists */}
      {primaryByoc && primaryByoc.nextTier && (
        <div className="mx-auto flex max-w-md items-center justify-center rounded-t-lg border border-b-0 border-emerald-200 bg-emerald-50 px-2.5 py-0.5 md:rounded-t-xl md:px-3 md:py-1 lg:max-w-1/2">
          <ComboProgressBanner campaign={primaryByoc} compact />
        </div>
      )}
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-lg md:rounded-2xl lg:max-w-1/2 lg:rounded-xl lg:border-b pb-[calc(env(safe-area-inset-bottom)*0.5)]">
        <div className="w-full px-3 md:px-4">
          <div className="flex min-h-11 items-center py-1 md:min-h-14 md:py-1.5 lg:min-h-[68px] lg:py-2">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="hidden lg:flex size-10 relative bg-primary-foreground/50 flex-none items-center justify-center rounded-full text-base font-semibold text-primary">
                  <Cart pack="filled" className="size-6" />
                  <span className="absolute hidden lg:grid bg-white rounded-full w-8 place-items-center -bottom-2 border border-muted text-xs text-black">
                    {totalItems}
                  </span>
                </div>
                <div className="min-w-0 flex flex-col gap-0.5">
                  <div className="text-[10px] font-medium tracking-wide text-muted-foreground md:text-xs">
                    <span>{pluralOf(totalItems)}</span> in cart
                  </div>
                  <div className="truncate text-[14px] font-semibold md:text-base lg:text-lg">
                    ₹{totalPrice.toFixed(2)}{" "}
                  </div>
                </div>
              </div>

              <Button
                className="h-8 rounded-full px-3 text-[12px] font-semibold md:h-10 md:px-4 md:text-sm"
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
