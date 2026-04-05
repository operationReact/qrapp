import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowPathIcon,
    BanknotesIcon,
    ClockIcon,
    CreditCardIcon,
    FunnelIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import Navbar from '../components/Navbar';
import { useUserAuth } from '../context/UserAuthContext';
import { clearWalletCache, walletCreateOrder, walletGetOverview, walletGetTransactions, walletVerifyPayment } from '../services/api';

function useToast() {
    const [message, setMessage] = useState(null);
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(() => setMessage(null), 3200);
        return () => clearTimeout(t);
    }, [message]);
    return {
        message,
        show: useCallback((value) => setMessage(value), []),
    };
}

function loadRazorpayScript(src = 'https://checkout.razorpay.com/v1/checkout.js') {
    return new Promise((resolve, reject) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
        document.body.appendChild(script);
    });
}

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000];
const FILTERS = [
    { key: 'ALL', label: 'All' },
    { key: 'CREDIT', label: 'Credits' },
    { key: 'DEBIT', label: 'Debits' },
    { key: 'PENDING', label: 'Pending' },
];

const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
});

function formatCurrencyFromPaise(value, compact = false) {
    const amount = Number(value || 0) / 100;
    return compact ? compactCurrencyFormatter.format(amount) : currencyFormatter.format(amount);
}

function formatTransactionTitle(tx) {
    if (tx.description) return tx.description;
    if (tx.type === 'CREDIT') return 'Wallet top-up';
    if (tx.orderId) return `Order #${tx.orderId} payment`;
    return 'Wallet payment';
}

export default function Wallet() {
    const navigate = useNavigate();
    const mounted = useRef(true);
    const { user, setUser } = useUserAuth();
    const toast = useToast();

    const [overview, setOverview] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [filter, setFilter] = useState('ALL');
    const [addAmount, setAddAmount] = useState('500');
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');

    const fetchWallet = useCallback(async (nextPage = 0, append = false) => {
        const [overviewResp, transactionResp] = await Promise.all([
            walletGetOverview(),
            walletGetTransactions({ page: nextPage, size: 10 }),
        ]);

        if (!mounted.current) return;

        const nextOverview = overviewResp?.data || null;
        const transactionPage = transactionResp?.data || {};
        const content = Array.isArray(transactionPage?.content) ? transactionPage.content : [];

        setOverview(nextOverview);
        setTransactions((current) => (append ? [...current, ...content] : content));
        setPage(transactionPage?.number ?? nextPage);
        setHasMore(Boolean(transactionPage && !transactionPage.last && content.length > 0));
    }, []);

    const loadInitialWallet = useCallback(async () => {
        if (!user?.token) {
            navigate('/login', { state: { from: '/wallet' } });
            return;
        }

        setLoading(true);
        setError('');
        try {
            clearWalletCache();
            await fetchWallet(0, false);
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401) {
                setUser?.(null);
                navigate('/login', { state: { from: '/wallet' } });
                return;
            }
            setError(typeof err?.response?.data === 'string' ? err.response.data : 'Failed to load wallet details.');
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, [fetchWallet, navigate, setUser, user?.token]);

    useEffect(() => {
        mounted.current = true;
        loadInitialWallet();
        return () => {
            mounted.current = false;
        };
    }, [loadInitialWallet]);

    const handleRefresh = async () => {
        setRefreshing(true);
        setError('');
        try {
            clearWalletCache();
            await fetchWallet(0, false);
            toast.show('Wallet refreshed');
        } catch (err) {
            setError(typeof err?.response?.data === 'string' ? err.response.data : 'Unable to refresh wallet right now.');
        } finally {
            if (mounted.current) setRefreshing(false);
        }
    };

    const handleLoadMore = async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        try {
            await fetchWallet(page + 1, true);
        } catch (err) {
            toast.show(typeof err?.response?.data === 'string' ? err.response.data : 'Could not load more transactions');
        } finally {
            if (mounted.current) setLoadingMore(false);
        }
    };

    const filteredTransactions = useMemo(() => {
        if (filter === 'ALL') return transactions;
        if (filter === 'PENDING') return transactions.filter((tx) => tx.status === 'PENDING');
        return transactions.filter((tx) => tx.type === filter);
    }, [filter, transactions]);

    const balance = Number(overview?.balance ?? 0);
    const totalCredited = Number(overview?.totalCredited ?? 0);
    const totalDebited = Number(overview?.totalDebited ?? 0);
    const pendingAmount = Number(overview?.pendingAmount ?? 0);

    async function handleAddMoney() {
        const amountRupees = Number(addAmount);
        if (!Number.isFinite(amountRupees) || amountRupees < 1) {
            toast.show('Enter at least ₹1 to add money');
            return;
        }

        setAdding(true);
        setError('');
        try {
            const amountPaise = Math.round(amountRupees * 100);
            const response = await walletCreateOrder({ amount: amountPaise });
            const order = response?.data || {};
            const orderId = order.razorpayOrderId;

            if (!orderId) {
                throw new Error('Missing wallet order id from server');
            }

            if (!order.keyId) {
                throw new Error('Missing Razorpay key from server');
            }

            await loadRazorpayScript();

            const rzp = new window.Razorpay({
                key: order.keyId,
                order_id: orderId,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: 'Bro & Bro',
                description: 'Add money to wallet',
                handler: async (paymentResponse) => {
                    try {
                        await walletVerifyPayment({
                            razorpayOrderId: paymentResponse.razorpay_order_id,
                            razorpayPaymentId: paymentResponse.razorpay_payment_id,
                            razorpaySignature: paymentResponse.razorpay_signature,
                        });
                        await fetchWallet(0, false);
                        toast.show('Wallet credited successfully');
                    } catch (verifyError) {
                        console.error('wallet verify failed', verifyError);
                        const message = typeof verifyError?.response?.data === 'string'
                            ? verifyError.response.data
                            : verifyError?.message || 'Payment verification failed';
                        setError(message);
                        toast.show(message);
                    }
                },
            });

            rzp.on('payment.failed', (paymentError) => {
                console.error('wallet payment failed', paymentError);
                const message = paymentError?.error?.description || 'Payment failed. Please try again.';
                setError(message);
                toast.show(message);
            });

            rzp.open();
        } catch (err) {
            console.error('wallet top-up failed', err);
            setError(typeof err?.response?.data === 'string' ? err.response.data : err?.message || 'Unable to add money right now.');
        } finally {
            if (mounted.current) setAdding(false);
        }
    }

    return (
        <div className="min-h-screen bg-page">
            <Navbar />

            <main className="container-premium py-4 sm:py-6">
                <div className="mx-auto max-w-6xl space-y-6">
                    <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500 via-amber-400 to-orange-400 text-white shadow-xl">
                        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr,0.8fr]">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white/90">
                                    <SparklesIcon className="h-4 w-4" />
                                    Smart wallet for faster checkout
                                </div>
                                <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Wallet</h1>
                                <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
                                    Add money, monitor recent activity, and use your wallet for one-tap checkout on mobile.
                                </p>

                                <div className="mt-6 flex flex-wrap items-end gap-4">
                                    <div>
                                        <div className="text-sm text-white/80">Available balance</div>
                                        <div className="mt-2 text-4xl font-black sm:text-5xl">{loading ? '...' : formatCurrencyFromPaise(balance)}</div>
                                    </div>
                                    {overview?.lastTransactionAt && (
                                        <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm">
                                            <div className="text-white/70">Last activity</div>
                                            <div className="mt-1 font-semibold text-white">
                                                {new Date(overview.lastTransactionAt).toLocaleString()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-[1.75rem] bg-white/95 p-5 text-gray-900 shadow-sm backdrop-blur">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">Add money</div>
                                        <div className="mt-1 text-xs text-gray-500">Top up securely and use your wallet at checkout.</div>
                                    </div>
                                    <CreditCardIcon className="h-8 w-8 text-amber-500" />
                                </div>

                                <label className="mt-5 block text-sm font-medium text-gray-700">Amount (₹)</label>
                                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                                    <input
                                        type="number"
                                        min="1"
                                        inputMode="numeric"
                                        value={addAmount}
                                        onChange={(event) => setAddAmount(event.target.value)}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-base outline-none transition focus:border-amber-400"
                                        placeholder="Enter amount"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddMoney}
                                        disabled={adding}
                                        className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {adding ? 'Processing...' : 'Add money'}
                                    </button>
                                </div>

                                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                                    {QUICK_AMOUNTS.map((amount) => (
                                        <button
                                            key={amount}
                                            type="button"
                                            onClick={() => setAddAmount(String(amount))}
                                            className="whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                                        >
                                            ₹{amount}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
                                    Wallet top-ups use live Razorpay checkout. Configure valid Razorpay credentials on the server before enabling this flow.
                                </div>
                            </div>
                        </div>
                    </section>

                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-gray-400">Total added</div>
                                    <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '...' : formatCurrencyFromPaise(totalCredited, true)}</div>
                                </div>
                                <div className="rounded-2xl bg-green-50 p-3 text-green-600">
                                    <BanknotesIcon className="h-6 w-6" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-gray-400">Total spent</div>
                                    <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '...' : formatCurrencyFromPaise(totalDebited, true)}</div>
                                </div>
                                <div className="rounded-2xl bg-red-50 p-3 text-red-500">
                                    <CreditCardIcon className="h-6 w-6" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-gray-400">Pending</div>
                                    <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '...' : formatCurrencyFromPaise(pendingAmount, true)}</div>
                                </div>
                                <div className="rounded-2xl bg-yellow-50 p-3 text-yellow-600">
                                    <ClockIcon className="h-6 w-6" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-gray-400">Usage count</div>
                                    <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '...' : Number(overview?.successfulDebitsCount ?? 0)}</div>
                                </div>
                                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                                    <SparklesIcon className="h-6 w-6" />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Recent activity</h2>
                                <p className="mt-1 text-sm text-gray-500">Track top-ups and wallet payments in one place.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                                    <FunnelIcon className="h-4 w-4" />
                                    Filter
                                </div>
                                {FILTERS.map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setFilter(item.key)}
                                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === item.key ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-70"
                                >
                                    <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="mt-6 rounded-3xl bg-gray-50 px-6 py-14 text-center text-gray-500">Loading wallet activity...</div>
                        ) : filteredTransactions.length === 0 ? (
                            <div className="mt-6 rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
                                <div className="text-5xl">📭</div>
                                <div className="mt-4 text-lg font-semibold text-gray-900">No transactions yet</div>
                                <div className="mt-2 text-sm text-gray-500">Top up your wallet to see credits and wallet checkout activity here.</div>
                            </div>
                        ) : (
                            <div className="mt-6 space-y-3">
                                {filteredTransactions.map((tx) => {
                                    const isCredit = tx.type === 'CREDIT';
                                    const statusClass = tx.status === 'SUCCESS'
                                        ? 'bg-green-100 text-green-700'
                                        : tx.status === 'PENDING'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-red-100 text-red-700';
                                    return (
                                        <article key={tx.id} className="rounded-3xl border border-gray-100 bg-gray-50 px-4 py-4 sm:px-5">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-sm font-semibold text-gray-900 sm:text-base">{formatTransactionTitle(tx)}</h3>
                                                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusClass}`}>{tx.status}</span>
                                                        {tx.orderId && (
                                                            <span className="rounded-full bg-gray-200 px-3 py-1 text-[11px] font-medium text-gray-700">
                                                                Order #{tx.orderId}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 text-xs text-gray-500 sm:text-sm">
                                                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'Timestamp unavailable'}
                                                    </div>
                                                    {(tx.referenceId || tx.providerOrderId) && (
                                                        <div className="mt-2 truncate text-xs text-gray-400">
                                                            Ref: {tx.referenceId || tx.providerOrderId}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-left sm:text-right">
                                                    <div className={`text-lg font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                                                        {isCredit ? '+' : '-'}{formatCurrencyFromPaise(tx.amount)}
                                                    </div>
                                                    {typeof tx.balanceAfter === 'number' && (
                                                        <div className="mt-1 text-xs text-gray-500">Balance after: {formatCurrencyFromPaise(tx.balanceAfter)}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                        {hasMore && filter === 'ALL' && (
                            <div className="mt-5 text-center">
                                <button
                                    type="button"
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-70"
                                >
                                    {loadingMore ? 'Loading more...' : 'Load more'}
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {toast.message && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
                    {toast.message}
                </div>
            )}
        </div>
    );
}
