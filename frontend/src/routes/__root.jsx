import {
  createRootRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
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
import { HeadContent } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { LocationProvider } from "../context/LocationContext";
import { canAccessAdmin } from "@/lib/roles";

function SafeAreaWrapper({ children }) {
  const { cart } = useCart();
  const style =
    cart && cart.length > 0
      ? { paddingBottom: "calc(var(--app-mobile-menu-height) + 86px + env(safe-area-inset-bottom))" }
      : undefined;
  return <div className="flex min-h-screen flex-col" style={style}>{children}</div>;
}

SafeAreaWrapper.propTypes = {
  children: PropTypes.node,
};

function AuthenticatedRoot() {
  const { authInitialized, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicEntry =
    location.pathname === "/" ||
    location.pathname === "/home" ||
    location.pathname === "/login";
  const targetPath = canAccessAdmin(user) ? "/admin" : "/";
  const isAdminRoute = location.pathname === "/admin" || location.pathname.startsWith("/admin/");

  useEffect(() => {
    if (
      !authInitialized ||
      !user ||
      !isPublicEntry ||
      targetPath === location.pathname
    ) return;

    navigate({
      to: targetPath,
      replace: true,
    });
  }, [
    authInitialized,
    location.pathname,
    navigate,
    isPublicEntry,
    targetPath,
    user,
  ]);

  const shouldResolveAuthenticatedEntry =
    authInitialized && user && isPublicEntry && targetPath !== location.pathname;

  if (!authInitialized || shouldResolveAuthenticatedEntry) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <PreferencesProvider>
      <OffCanvasCart />
      <SafeAreaWrapper>
        <HeadContent />
        <Outlet />
        {!isAdminRoute && <SiteFooter />}
      </SafeAreaWrapper>
      <Toast />
      <Toaster />
      <StickyCartBar />
    </PreferencesProvider>
  );
}

function RootComponent() {
  return (
    <TooltipProvider>
      <CartProvider>
        <AuthProvider>
          <LocationProvider><AuthenticatedRoot /></LocationProvider>
        </AuthProvider>
      </CartProvider>
    </TooltipProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
