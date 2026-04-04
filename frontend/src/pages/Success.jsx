import { Link, useLocation } from 'react-router-dom';

export default function Success() {
    const location = useLocation();
    const paymentMethod = location.state?.paymentMethod || 'RAZORPAY';
    const orderId = location.state?.orderId;

    return (
        <div className="min-h-screen bg-page px-4 py-10 sm:px-6">
            <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
                <div className="w-full rounded-[2rem] border border-gray-100 bg-white p-8 text-center shadow-xl sm:p-10">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">✅</div>
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">Order placed successfully</h2>
                    <p className="mt-3 text-sm text-gray-500 sm:text-base">
                        Thanks for ordering — we’re preparing your food and will keep your order status updated.
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-gray-50 px-4 py-4">
                            <div className="text-xs uppercase tracking-wide text-gray-400">Payment method</div>
                            <div className="mt-2 text-lg font-semibold text-gray-900">{paymentMethod === 'WALLET' ? 'Wallet' : 'Razorpay'}</div>
                        </div>
                        <div className="rounded-2xl bg-amber-50 px-4 py-4">
                            <div className="text-xs uppercase tracking-wide text-amber-700">Order reference</div>
                            <div className="mt-2 text-lg font-semibold text-amber-900">{orderId ? `#${orderId}` : 'Generated'}</div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Link to="/orders" className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600">
                            Track my order
                        </Link>
                        <Link to="/" className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                            Back to menu
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}