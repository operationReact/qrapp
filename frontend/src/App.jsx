import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Success from "./pages/Success";
import Wallet from "./pages/Wallet";
import { CartProvider, useCart } from "./context/CartContext";
import OffCanvasCart from "./components/OffCanvasCart";
import Toast from "./components/Toast";
import StickyCartBar from "./components/StickyCartBar";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserLogin from "./pages/UserLogin";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import MyOrders from "./pages/MyOrders";
import PropTypes from "prop-types";
import { PreferencesProvider } from "./context/PreferencesContext";
import AdminLayout from "./pages/admin/AdminLayout";
import { TooltipProvider } from "./components/ui/tooltip";
import OperationalQueue from "./pages/admin/OperationalQueue";
import SelectedOrder from "./pages/admin/SelectedOrder";
import ServiceBoard from "./pages/admin/ServiceBoard";
import AdminMenuPage from "./pages/admin/AdminMenuPage";
import CreateMenuPage from "./pages/admin/CreateMenuPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";
import Search from "./pages/Search";
import { AuthProvider } from "./context/AuthContext";
import PartyOrdersPage from "./pages/admin/PartyOrdersPage";
import { Toaster } from "./components/ui/sonner";

// Analytics pages – lazy loaded for code splitting
const AnalyticsOverview = lazy(() => import("./pages/admin/analytics/AnalyticsOverview"));
const SalesAnalytics = lazy(() => import("./pages/admin/analytics/SalesAnalytics"));
const OrdersAnalytics = lazy(() => import("./pages/admin/analytics/OrdersAnalytics"));
const MenuAnalytics = lazy(() => import("./pages/admin/analytics/MenuAnalytics"));
const UserAnalytics = lazy(() => import("./pages/admin/analytics/UserAnalytics"));
const CouponAnalytics = lazy(() => import("./pages/admin/analytics/CouponAnalytics"));
const Recommendations = lazy(() => import("./pages/admin/analytics/Recommendations"));
const CombosPage = lazy(() => import("./pages/admin/CombosPage"));

function AnalyticsFallback() {
  return (
    <div className="flex items-center justify-center h-64 text-zinc-400 text-sm animate-pulse">
      Loading analytics…
    </div>
  );
}

function SafeAreaWrapper({ children }) {
  const { cart } = useCart();
  const style =
    cart && cart.length > 0
      ? { paddingBottom: "calc(72px + env(safe-area-inset-bottom))" }
      : undefined;
  return <div style={style}>{children}</div>;
}

SafeAreaWrapper.propTypes = {
  children: PropTypes.node,
};

function App() {
  return (
    <TooltipProvider>
      <CartProvider>
        <AuthProvider>
          <PreferencesProvider>
            <BrowserRouter>
              <OffCanvasCart />
              <SafeAreaWrapper>
                <Routes>
                  <Route path="/" element={<Menu />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/orders" element={<MyOrders />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/success" element={<Success />} />

                  <Route path="/login" element={<UserLogin />} />
                  <Route path="/register" element={<Register />} />

                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="menu" element={<AdminMenuPage />} />
                    <Route path="coupons" element={<AdminCouponsPage />} />
                    <Route path="manage-menu" element={<CreateMenuPage />} />
                    <Route path="service-board" element={<ServiceBoard />} />
                    <Route path="party-orders" element={<PartyOrdersPage />} />
                    <Route
                      path="operational-queue"
                      element={<OperationalQueue />}
                    >
                      <Route index element={<SelectedOrder />} />
                      <Route path=":orderId" element={<SelectedOrder />} />
                    </Route>
                    {/* Analytics */}
                    <Route path="analytics" element={<Suspense fallback={<AnalyticsFallback />}><AnalyticsOverview /></Suspense>} />
                    <Route path="analytics/sales" element={<Suspense fallback={<AnalyticsFallback />}><SalesAnalytics /></Suspense>} />
                    <Route path="analytics/orders" element={<Suspense fallback={<AnalyticsFallback />}><OrdersAnalytics /></Suspense>} />
                    <Route path="analytics/menu" element={<Suspense fallback={<AnalyticsFallback />}><MenuAnalytics /></Suspense>} />
                    <Route path="analytics/users" element={<Suspense fallback={<AnalyticsFallback />}><UserAnalytics /></Suspense>} />
                    <Route path="analytics/coupons" element={<Suspense fallback={<AnalyticsFallback />}><CouponAnalytics /></Suspense>} />
                    <Route path="analytics/recommendations" element={<Suspense fallback={<AnalyticsFallback />}><Recommendations /></Suspense>} />
                    <Route path="combos" element={<Suspense fallback={<AnalyticsFallback />}><CombosPage /></Suspense>} />
                  </Route>
                </Routes>
              </SafeAreaWrapper>
              <Toast />
              <Toaster/>
              <StickyCartBar />
            </BrowserRouter>
          </PreferencesProvider>
        </AuthProvider>
      </CartProvider>
    </TooltipProvider>
  );
}

export default App;
