import { BrowserRouter, Routes, Route } from "react-router-dom";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Success from "./pages/Success";
import Wallet from "./pages/Wallet";
import { CartProvider, useCart } from "./context/CartContext";
import OffCanvasCart from "./components/OffCanvasCart";
import Toast from "./components/Toast";
import StickyCartBar from "./components/StickyCartBar";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { UserAuthProvider } from "./context/UserAuthContext";
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
import AdminMenuManager from "./pages/admin/AdminMenuManager";

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
        <AdminAuthProvider>
          <PreferencesProvider>
            <UserAuthProvider>
              <BrowserRouter>
                <OffCanvasCart />
                <SafeAreaWrapper>
                  <Routes>
                    <Route path="/" element={<Menu />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/orders" element={<MyOrders />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/success" element={<Success />} />

                    <Route path="/login" element={<UserLogin />} />
                    <Route path="/register" element={<Register />} />

                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="menu" element={<AdminMenuPage />} />
                      <Route path="manage-menu" element={<AdminMenuManager />} />
                      <Route path="service-board" element={<ServiceBoard />} />
                      <Route
                        path="operational-queue"
                        element={<OperationalQueue />}
                      >
                        <Route index element={<SelectedOrder/>} />
                        <Route path=":orderId" element={<SelectedOrder />} />
                      </Route>
                    </Route>
                  </Routes>
                </SafeAreaWrapper>
                <Toast />
                <StickyCartBar />
              </BrowserRouter>
            </UserAuthProvider>
          </PreferencesProvider>
        </AdminAuthProvider>
      </CartProvider>
    </TooltipProvider>
  );
}

export default App;
