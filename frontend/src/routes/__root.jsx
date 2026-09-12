import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { CartProvider, useCart } from "../context/CartContext";
import OffCanvasCart from "../components/OffCanvasCart";
import Toast from "../components/Toast";
import StickyCartBar from "../components/StickyCartBar";
import { PreferencesProvider } from "../context/PreferencesContext";
import { TooltipProvider } from "../components/ui/tooltip";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "../components/ui/sonner";
import PropTypes from "prop-types";
import SiteFooter from "../components/shared/SiteFooter";

function SafeAreaWrapper({ children }) {
  const { cart } = useCart();
  const style =
    cart && cart.length > 0
      ? { paddingBottom: "calc(72px + env(safe-area-inset-bottom))" }
      : undefined;
  return <div className="flex min-h-screen flex-col" style={style}>{children}</div>;
}

SafeAreaWrapper.propTypes = {
  children: PropTypes.node,
};

function RootComponent() {
  return (
    <TooltipProvider>
      <CartProvider>
        <AuthProvider>
          <PreferencesProvider>
            <OffCanvasCart />
            <SafeAreaWrapper>
              <Outlet />
              <SiteFooter />
            </SafeAreaWrapper>
            <Toast />
            <Toaster />
            <StickyCartBar />
            <TanStackRouterDevtools position="bottom-right" />
          </PreferencesProvider>
        </AuthProvider>
      </CartProvider>
    </TooltipProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
