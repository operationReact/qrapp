import { useCart } from "../context/CartContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function StickyCartBar() {
    const { cart, getTotal, openDrawer, closeDrawer } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const { admin } = useAdminAuth();

    // Only show the sticky cart bar on the landing page (home)
    if (location && location.pathname !== '/') return null;

    if (admin) return null;

    const totalItems = cart.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalPrice = getTotal();

    const handleViewCart = () => {
        if (window.innerWidth < 768) {
            openDrawer();
        } else {
            // close off-canvas first to avoid overlay on the cart page
            closeDrawer();
            navigate('/cart');
        }
    };

    if (totalItems === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
            {/* full-width background with rounded top and safe-area padding */}
            <div className="bg-white shadow-lg rounded-t-2xl border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
                <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
                    <div className="p-3 min-h-[72px] flex items-center">
                        <div className="flex items-center justify-between w-full gap-3">
                            <div className="flex items-center gap-3">
                                <div className="bg-brand-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold text-base">{totalItems}</div>

                                <div>
                                    <div className="text-sm text-gray-500">Items</div>
                                    <div className="text-base font-semibold">₹{totalPrice}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <button onClick={handleViewCart} aria-label="View cart" className="w-full md:w-auto bg-brand-600 text-white px-6 py-3 rounded-2xl shadow-md hover:bg-brand-700 transition-transform duration-150 active:scale-95 text-lg font-semibold">View Cart</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
