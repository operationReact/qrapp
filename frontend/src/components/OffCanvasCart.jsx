import { useCart } from "../context/CartContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useLocation, useNavigate } from 'react-router-dom';

export default function OffCanvasCart() {
    const { drawerOpen, closeDrawer, cart, getTotal, addItem, decreaseItem, removeItem } = useCart();
    const location = useLocation();
    const navigate = useNavigate();
    const { admin } = useAdminAuth();

    // Admins should not be able to place orders - hide cart UI
    if (admin) return null;

    // If we're on the dedicated /cart route (or subpaths like /cart/...), don't show the off-canvas drawer
    if (location && location.pathname && location.pathname.startsWith('/cart')) return null;

    return (
        <div className={`fixed inset-0 z-50 ${drawerOpen ? '' : 'hidden'}`} aria-hidden={!drawerOpen}>
            <div className="absolute inset-0 bg-black/50" onClick={closeDrawer} />

            <aside className={`pointer-events-auto fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-[1.75rem] bg-white p-4 shadow-xl transition-transform duration-300 ease-out md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-96 md:rounded-l-[1.75rem] md:rounded-tr-none md:p-5 ${drawerOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'} sheet-safe-bottom`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Your cart</h3>
                        <p className="text-xs text-gray-500">Review items before checkout</p>
                    </div>
                    <button onClick={closeDrawer} className="rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-transform duration-150 active:scale-95">Close</button>
                </div>

                <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(85vh - 11rem)' }}>
                    {cart.length === 0 && <p className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">Cart is empty</p>}

                    {cart.map(item => (
                        <div key={item.id} className="rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-gray-100">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="truncate font-medium text-gray-900">{item.name}</div>
                                    <div className="mt-1 text-sm text-gray-500">₹{item.price}</div>
                                </div>
                                <button onClick={() => removeItem(item.id)} className="text-xs font-semibold text-red-500 transition-transform duration-150 active:scale-95">Remove</button>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                                <div className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-1">
                                    <button onClick={() => decreaseItem(item)} className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-gray-700 transition-transform duration-150 active:scale-95">-</button>
                                    <div className="min-w-[1.5rem] px-2 text-center text-sm font-semibold text-gray-900">{item.quantity}</div>
                                    <button onClick={() => addItem(item)} className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-gray-700 transition-transform duration-150 active:scale-95">+</button>
                                </div>
                                <div className="text-right text-sm font-semibold text-gray-900">₹{Number(item.price || 0) * Number(item.quantity || 0)}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4">
                    <div className="mb-3 flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                        <div className="text-sm text-gray-500">Total</div>
                        <div className="font-semibold text-gray-900">₹{getTotal()}</div>
                    </div>

                    <button
                        onClick={() => {
                            closeDrawer();
                            navigate('/cart');
                        }}
                        className="touch-button w-full rounded-2xl bg-accent-500 py-3 text-sm font-semibold text-white transition-transform duration-150 active:scale-95"
                    >
                        Go to checkout
                    </button>
                </div>
            </aside>
        </div>
    );
}
