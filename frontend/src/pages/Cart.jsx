import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { createOrder, getCurrentUser, getMenu } from "../services/api";
import Navbar from "../components/Navbar";
import { useUserAuth } from "../context/UserAuthContext";
import { useNavigate } from "react-router-dom";

export default function Cart() {
    const { cart, removeItem, getTotal, addItem, decreaseItem, closeDrawer } = useCart();
    const { user } = useUserAuth();
    const navigate = useNavigate();
    const [recommended, setRecommended] = useState([]);
    const [recLoading, setRecLoading] = useState(false);

    useEffect(() => {
        // ensure the off-canvas drawer is closed when viewing the full cart page
        if (closeDrawer) closeDrawer();
    }, [closeDrawer]);

    useEffect(() => {
        let mounted = true;
        async function fetchRecommended() {
            setRecLoading(true);
            try {
                // Prefer a dedicated 'Recommended' category maintained by admin
                const res = await getMenu({ category: 'Recommended' });
                let items = res.data || [];
                // Fallback: if none returned, load top 6 items and filter out ones already in cart
                if (!items || items.length === 0) {
                    const all = await getMenu();
                    const idsInCart = new Set(cart.map(i => i.id));
                    items = (all.data || []).filter(i => !idsInCart.has(i.id)).slice(0, 6);
                }
                if (mounted) setRecommended(items);
            } catch (e) {
                console.debug('Failed to fetch recommended', e);
                if (mounted) setRecommended([]);
            } finally {
                if (mounted) setRecLoading(false);
            }
        }
        fetchRecommended();
        return () => { mounted = false; };
    }, [cart]);

    const handleCheckout = async () => {
        if (!user || !user.token) {
            // redirect to login and come back to cart after successful login
            navigate('/login', { state: { from: '/cart' } });
            return;
        }

        const items = cart.map(i => ({
            itemId: i.id,
            quantity: i.quantity
        }));

        try {
            // fetch current user profile to obtain phone (backend validates phone)
            let phone;
            try {
                const me = await getCurrentUser();
                phone = me?.data?.phone;
            } catch (e) {
                // ignore - fallback to prompting user
                console.debug('getCurrentUser failed', e);
            }

            // if phone missing, prompt user (minimal UI); you can replace with modal later
            if (!phone) {
                phone = window.prompt('Please enter your phone number to proceed with payment');
                if (!phone) return alert('Phone is required to place an order');
            }

            const res = await createOrder({ items, phone });
            const { payment } = res.data;

            console.log('createOrder response payment:', payment);

            // Backend returns `rzpOrderId` (the Razorpay order id). Use that as `order_id`.
            const orderIdForRzp = payment.rzpOrderId || payment.orderId || payment.order_id;

            if (!orderIdForRzp) {
                console.error('No Razorpay order id returned from backend', payment);
                return alert('Payment preparation failed: missing order id from server');
            }

            // If backend returned a mock id (used when Razorpay creds are not configured), stop and inform user
            if (typeof orderIdForRzp === 'string' && orderIdForRzp.startsWith('mock_rzp_')) {
                console.warn('Backend returned mock Razorpay order id — payments are not configured on server', orderIdForRzp);
                return alert('Payments are not configured on the server (returned mock order id). Please check backend logs or configure Razorpay keys.');
            }

            const rzp = new window.Razorpay({
                key: payment.key,
                order_id: orderIdForRzp,
                handler: () => window.location = "/success"
            });

            // register failure handler to show details
            rzp.on('payment.failed', function (response) {
                console.error('Razorpay payment failed', response);
                alert('Payment Failed: ' + (response.error && response.error.description ? response.error.description : JSON.stringify(response)));
            });

            rzp.open();
        } catch (err) {
            console.error('Checkout failed', err);
            const msg = err?.response?.data?.message || err?.message || 'Payment Failed';
            alert('Oops! Something went wrong.\n' + msg);
        }
    };

    return (
        <div className="min-h-screen bg-page">
            <Navbar />

            <main className="container mx-auto p-4">
                <h2 className="text-2xl font-bold mb-4">🛒 Cart</h2>

                {cart.length === 0 && <p>No items</p>}

                <div className="space-y-3">
                    {cart.map(item => (
                        <div
                            key={item.id}
                            className="bg-white p-3 rounded-lg shadow flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400">Img</div>
                                <div>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm text-gray-500">₹{item.price}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center border rounded">
                                    <button onClick={() => decreaseItem(item)} className="px-3 py-1 text-brand-500 transition-transform duration-150 active:scale-95">-</button>
                                    <div className="px-3">{item.quantity}</div>
                                    <button onClick={() => addItem(item)} className="px-3 py-1 text-accent-500 transition-transform duration-150 active:scale-95">+</button>
                                </div>

                                <button
                                    onClick={() => removeItem(item.id)}
                                    className="text-brand-500 transition-transform duration-150 active:scale-95"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <h3 className="mt-4 text-lg font-semibold">Total: ₹{getTotal()}</h3>

                {/* Recommendations */}
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold">Recommended for you</h4>
                        <div className="text-sm text-gray-500">Add sides & drinks</div>
                    </div>

                    {recLoading && <div className="text-sm text-gray-500">Loading recommendations...</div>}

                    {!recLoading && recommended && recommended.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto py-2 category-scrollbar">
                            {recommended.map(it => (
                                <div key={it.id} className="min-w-[180px] bg-white p-3 rounded shadow flex-shrink-0">
                                    <div className="h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400 mb-2">Img</div>
                                    <div className="font-medium text-sm">{it.name}</div>
                                    <div className="text-sm text-gray-500 mb-2">₹{it.price}</div>
                                    <button onClick={() => addItem(it)} className="w-full bg-amber-500 text-white py-2 rounded text-sm">Add</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* If user not logged in, show prompt to login before proceeding to pay */}
                {!user && (
                    <div className="mt-4 p-4 bg-yellow-50 border rounded">
                        <div className="text-sm text-gray-700 mb-2">You need to login to proceed with payment.</div>
                        <div className="flex gap-3">
                            <button onClick={() => navigate('/login', { state: { from: '/cart' } })} className="flex-1 bg-amber-500 text-white py-2 rounded">Login to pay</button>
                            <button onClick={() => navigate('/')} className="flex-1 border rounded py-2">Continue shopping</button>
                        </div>
                    </div>
                )}

                {user && (
                    <button
                        onClick={handleCheckout}
                        className="mt-4 w-full bg-accent-500 text-white py-3 rounded-lg transition-transform duration-150 active:scale-95"
                    >
                        Pay Now
                    </button>
                )}
            </main>
        </div>
    );
}