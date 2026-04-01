import { useCart } from "../context/CartContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useLocation } from 'react-router-dom';

export default function OffCanvasCart() {
    const { drawerOpen, closeDrawer, cart, getTotal, addItem, decreaseItem, removeItem } = useCart();
    const location = useLocation();
    const { admin } = useAdminAuth();

    // Admins should not be able to place orders - hide cart UI
    if (admin) return null;

    // If we're on the dedicated /cart route (or subpaths like /cart/...), don't show the off-canvas drawer
    if (location && location.pathname && location.pathname.startsWith('/cart')) return null;

    return (
        // container visible when open; we keep pointer-events-none when closed
        <div className={`fixed inset-0 z-50 ${drawerOpen ? '' : 'hidden'}`} aria-hidden={!drawerOpen}>
            <div className="absolute inset-0 bg-black/50" onClick={closeDrawer} />

            {/* Bottom sheet on small screens, right panel on md+ */}
            <aside className={`pointer-events-auto fixed left-0 right-0 bottom-0 h-[70vh] bg-white shadow-xl p-4 md:fixed md:top-0 md:right-0 md:bottom-auto md:h-full md:w-96 md:rounded-l-lg transform ${drawerOpen ? 'translate-y-0' : 'translate-y-full'} transition-transform duration-300 ease-out`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Your Cart</h3>
                    <button onClick={closeDrawer} className="text-gray-500 transition-transform duration-150 active:scale-95">Close</button>
                </div>

                <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '50vh' }}>
                    {cart.length === 0 && <p className="text-gray-500">Cart is empty</p>}

                    {cart.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-surface p-3 rounded">
                            <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-gray-500">₹{item.price}</div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button onClick={() => decreaseItem(item)} className="px-3 py-2 text-sm bg-gray-200 rounded-md transition-transform duration-150 active:scale-95">-</button>
                                <div className="px-3">{item.quantity}</div>
                                <button onClick={() => addItem(item)} className="px-3 py-2 text-sm bg-gray-200 rounded-md transition-transform duration-150 active:scale-95">+</button>
                                <button onClick={() => removeItem(item.id)} className="ml-2 px-2 py-1 text-sm text-brand-500 transition-transform duration-150 active:scale-95">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-500">Total</div>
                        <div className="font-semibold">₹{getTotal()}</div>
                    </div>

                    <button className="w-full bg-accent-500 text-white py-3 rounded-md transition-transform duration-150 active:scale-95">Checkout</button>
                </div>
            </aside>
        </div>
    );
}
