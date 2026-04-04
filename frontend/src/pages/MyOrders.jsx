import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getMyOrders } from '../services/api';
import { useUserAuth } from '../context/UserAuthContext';

const STATUS_STYLES = {
    PLACED: 'bg-yellow-100 text-yellow-800',
    PREPARING: 'bg-blue-100 text-blue-800',
    READY: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-gray-100 text-gray-700',
};

export default function MyOrders() {
    const navigate = useNavigate();
    const { user } = useUserAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;

        async function loadOrders() {
            if (!user?.token) {
                navigate('/login', { state: { from: '/orders' } });
                return;
            }

            try {
                const response = await getMyOrders();
                if (!mounted) return;
                setOrders(Array.isArray(response?.data) ? response.data : []);
            } catch (err) {
                if (!mounted) return;
                const message = err?.response?.data || 'Unable to load your orders right now.';
                setError(typeof message === 'string' ? message : 'Unable to load your orders right now.');
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadOrders();
        return () => { mounted = false; };
    }, [navigate, user?.token]);

    const activeOrders = useMemo(() => orders.filter((order) => !['COMPLETED'].includes(order.status)), [orders]);

    return (
        <div className="min-h-screen bg-page">
            <Navbar />

            <main className="container-premium py-6">
                <div className="mx-auto max-w-4xl space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">My orders</h1>
                            <p className="text-sm text-gray-500">Review live order status, see what you ordered, and revisit recent purchases.</p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm border border-gray-100">
                            <div className="text-xs uppercase tracking-wide text-gray-400">Active orders</div>
                            <div className="mt-1 text-2xl font-bold text-gray-900">{activeOrders.length}</div>
                        </div>
                    </div>

                    {loading && (
                        <div className="rounded-3xl bg-white px-6 py-16 text-center text-gray-500 shadow-sm border border-gray-100">
                            Loading your order history...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {!loading && !error && orders.length === 0 && (
                        <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm border border-gray-100">
                            <div className="text-5xl">🧾</div>
                            <h2 className="mt-4 text-xl font-semibold text-gray-900">No orders yet</h2>
                            <p className="mt-2 text-sm text-gray-500">Start with your favourite dishes and they’ll show up here automatically.</p>
                            <Link
                                to="/"
                                className="mt-6 inline-flex rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                            >
                                Browse menu
                            </Link>
                        </div>
                    )}

                    {!loading && !error && orders.length > 0 && (
                        <div className="space-y-4">
                            {orders.map((order) => {
                                const createdAt = order.createdAt ? new Date(order.createdAt) : null;
                                const statusClass = STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700';
                                return (
                                    <article key={order.id} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h2 className="text-lg font-semibold text-gray-900">Order #{order.id}</h2>
                                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                                                        {order.status}
                                                    </span>
                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                                                        Payment: {order.paymentStatus || 'PENDING'}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-sm text-gray-500">
                                                    {createdAt ? createdAt.toLocaleString() : 'Timestamp unavailable'}
                                                </div>
                                            </div>

                                            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-right">
                                                <div className="text-xs uppercase tracking-wide text-amber-700">Total</div>
                                                <div className="mt-1 text-xl font-bold text-amber-900">₹{Number(order.total || 0).toFixed(2)}</div>
                                            </div>
                                        </div>

                                        <div className="mt-5 grid gap-3">
                                            {(order.items || []).map((item, index) => (
                                                <div key={`${order.id}-${item.itemId || index}`} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <div className="font-medium text-gray-900">{item.name || 'Menu item'}</div>
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            Quantity: {item.quantity} {item.isVeg === true ? '• Veg' : item.isVeg === false ? '• Non-veg' : ''}
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-semibold text-gray-700">
                                                        ₹{(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

