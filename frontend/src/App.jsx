import { BrowserRouter, Routes, Route } from "react-router-dom";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Success from "./pages/Success";
import Wallet from "./pages/Wallet";
import { CartProvider, useCart } from "./context/CartContext";
import OffCanvasCart from "./components/OffCanvasCart";
import Toast from "./components/Toast";
import StickyCartBar from "./components/StickyCartBar";
import AdminDashboard from "./pages/AdminDashboard";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import AdminOrders from "./pages/AdminOrders";
import AdminLogin from "./pages/AdminLogin";
import { UserAuthProvider } from "./context/UserAuthContext";
import UserLogin from "./pages/UserLogin";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import MyOrders from "./pages/MyOrders";
import PropTypes from 'prop-types';


function SafeAreaWrapper({ children }) {
    const { cart } = useCart();
    const style = cart && cart.length > 0 ? { paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' } : undefined;
    return <div style={style}>{children}</div>;
}

SafeAreaWrapper.propTypes = {
    children: PropTypes.node
};

function App() {
    return (
        <CartProvider>
            <AdminAuthProvider>
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

                                <Route path="/admin/login" element={<AdminLogin />} />
                                <Route path="/admin" element={<AdminDashboard />} />
                                <Route path="/admin/orders" element={<AdminOrders />} />
                            </Routes>
                        </SafeAreaWrapper>
                        <Toast />
                        <StickyCartBar />
                    </BrowserRouter>
                </UserAuthProvider>
            </AdminAuthProvider>
        </CartProvider>
    );
}

export default App;