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
        if (location.pathname === '/') {
            openDrawer();
        } else {
            closeDrawer();
            navigate('/cart');
        }
    };

    if (totalItems === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
            <div className="rounded-t-[1.5rem] border-t border-gray-100 bg-white shadow-lg pb-[env(safe-area-inset-bottom)]">
                <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
                    <div className="flex min-h-[72px] items-center py-3">
                        <div className="flex w-full items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-600 text-base font-semibold text-white">{totalItems}</div>

                                <div className="min-w-0">
                                    <div className="text-xs uppercase tracking-wide text-gray-400">Items in cart</div>
                                    <div className="truncate text-base font-semibold text-gray-900">₹{totalPrice}</div>
                                </div>
                            </div>

                            <div className="flex w-auto items-center gap-2">
                                <button onClick={handleViewCart} aria-label="View cart" className="touch-button rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-transform duration-150 active:scale-95 sm:px-6">View cart</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
