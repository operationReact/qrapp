import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getAdminOrderDashboard, getOrdersAdmin, updateAdminOrder } from '../services/api';

const STATUS_META = {
    PLACED: { label: 'Placed', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
    PREPARING: { label: 'Preparing', tone: 'bg-sky-100 text-sky-800 border-sky-200' },
    READY: { label: 'Ready', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    COMPLETED: { label: 'Completed', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
    CANCELLED: { label: 'Cancelled', tone: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const PRIORITY_META = {
    NORMAL: { label: 'Normal', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
    HIGH: { label: 'High', tone: 'bg-orange-100 text-orange-700 border-orange-200' },
    URGENT: { label: 'Urgent', tone: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const LIVE_STAGES = ['PLACED', 'PREPARING', 'READY'];

function formatCurrency(value) {
    return `₹${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function toneForStatus(status) {
    return STATUS_META[status] || STATUS_META.PLACED;
}

function toneForPriority(priority) {
    return PRIORITY_META[priority] || PRIORITY_META.NORMAL;
}

function summarizeItems(order) {
    const items = order?.items || [];
    if (!items.length) return 'No items attached';
    return items.slice(0, 3).map((item) => `${item.name || 'Item'} ×${item.quantity}`).join(', ');
}

export default function AdminOrderOperations({ embedded = false }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { setAdmin } = useAdminAuth();

    const [dashboard, setDashboard] = useState(null);
    const [ordersPage, setOrdersPage] = useState({ content: [], totalPages: 0, totalElements: 0, number: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [filters, setFilters] = useState({
        query: '',
        status: '',
        paymentStatus: '',
        priority: '',
        liveOnly: false,
    });

    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [noteDraft, setNoteDraft] = useState('');

    const allKnownOrders = useMemo(() => {
        const combined = [...(dashboard?.liveOrdersQueue || []), ...(ordersPage?.content || [])];
        const unique = new Map();
        combined.forEach((order) => {
            if (order?.id != null) unique.set(order.id, order);
        });
        return [...unique.values()];
    }, [dashboard, ordersPage]);

    const selectedOrder = useMemo(
        () => allKnownOrders.find((order) => order.id === selectedOrderId) || null,
        [allKnownOrders, selectedOrderId],
    );

    useEffect(() => {
        setNoteDraft(selectedOrder?.adminNote || '');
    }, [selectedOrder]);

    async function loadData({ quiet = false } = {}) {
        if (quiet) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);
        try {
            const [dashboardRes, ordersRes] = await Promise.all([
                getAdminOrderDashboard({ liveLimit: 12 }),
                getOrdersAdmin({
                    page,
                    size,
                    status: filters.status || undefined,
                    paymentStatus: filters.paymentStatus || undefined,
                    priority: filters.priority || undefined,
                    query: filters.query || undefined,
                    liveOnly: filters.liveOnly || undefined,
                }),
            ]);
            const nextDashboard = dashboardRes.data || {};
            const nextOrdersPage = ordersRes.data || { content: [], totalPages: 0, totalElements: 0, number: 0 };
            setDashboard(nextDashboard);
            setOrdersPage(nextOrdersPage);

            const availableIds = new Set([
                ...(nextDashboard.liveOrdersQueue || []).map((order) => order.id),
                ...(nextOrdersPage.content || []).map((order) => order.id),
            ]);
            if (!selectedOrderId || !availableIds.has(selectedOrderId)) {
                const fallback = nextDashboard.liveOrdersQueue?.[0]?.id ?? nextOrdersPage.content?.[0]?.id ?? null;
                setSelectedOrderId(fallback);
            }
        } catch (err) {
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                setAdmin(null);
                navigate('/login', { replace: true, state: { from: location.pathname } });
                return;
            }
            console.error(err);
            setError(err?.response?.data || 'Failed to load admin orders');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, size, filters.status, filters.paymentStatus, filters.priority, filters.query, filters.liveOnly]);

    useEffect(() => {
        if (!autoRefresh) return undefined;
        const timer = window.setInterval(() => {
            loadData({ quiet: true });
        }, 15000);
        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoRefresh, page, size, filters.status, filters.paymentStatus, filters.priority, filters.query, filters.liveOnly]);

    async function handleOrderUpdate(orderId, payload) {
        setActionLoading(true);
        setError(null);
        try {
            await updateAdminOrder(orderId, payload);
            await loadData({ quiet: true });
        } catch (err) {
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                setAdmin(null);
                navigate('/login', { replace: true, state: { from: location.pathname } });
                return;
            }
            console.error(err);
            setError(err?.response?.data || 'Failed to update order');
        } finally {
            setActionLoading(false);
        }
    }

    const groupedLiveOrders = LIVE_STAGES.reduce((acc, stage) => {
        acc[stage] = (dashboard?.liveOrdersQueue || []).filter((order) => order.status === stage);
        return acc;
    }, {});

    const stats = [
        { label: 'Live orders', value: dashboard?.liveOrders ?? 0, subtext: 'Orders needing action right now' },
        { label: 'Placed', value: dashboard?.placedOrders ?? 0, subtext: 'Freshly created and waiting' },
        { label: 'Preparing', value: dashboard?.preparingOrders ?? 0, subtext: 'Kitchen currently working' },
        { label: 'Ready', value: dashboard?.readyOrders ?? 0, subtext: 'Ready for pickup / handoff' },
        { label: 'Delayed', value: dashboard?.delayedOrders ?? 0, subtext: 'Orders outside expected SLA' },
        { label: 'Completed today', value: dashboard?.completedToday ?? 0, subtext: `${dashboard?.averageFulfillmentMinutes ?? 0} min avg fulfillment` },
    ];

    return (
        <section className="space-y-6">
            {!embedded && (
                <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between sm:p-6">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">Admin Operations</p>
                        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Order command center</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600">Manage live orders, push them through each stage, spot delays early, and keep the team aligned from one professional workspace.</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <button onClick={() => navigate('/admin')} className="touch-button rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Dashboard</button>
                        <button onClick={() => loadData({ quiet: true })} className="touch-button rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">Refresh now</button>
                    </div>
                </div>
            )}

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-sm font-medium text-slate-500">{stat.label}</div>
                        <div className="mt-3 text-3xl font-bold text-slate-900">{stat.value}</div>
                        <div className="mt-2 text-xs text-slate-500">{stat.subtext}</div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Live service board</h2>
                    <p className="text-sm text-slate-500">The oldest orders float to the top so nothing gets missed during rush hour.</p>
                </div>
                    <div className="flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:items-center">
                    <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700">
                        <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                        Auto refresh every 15s
                    </label>
                    <div className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">
                        {refreshing ? 'Refreshing…' : 'Realtime polling active'}
                    </div>
                </div>
            </div>

            {dashboard?.attentionOrders?.length > 0 && (
                <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-orange-900">Attention needed</h3>
                            <p className="text-sm text-orange-700">These orders are either delayed, urgent, or waiting to be handed over.</p>
                        </div>
                        <div className="text-sm font-medium text-orange-800">{dashboard.attentionOrders.length} flagged orders</div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {dashboard.attentionOrders.map((order) => (
                            <button
                                key={`attention-${order.id}`}
                                onClick={() => setSelectedOrderId(order.id)}
                                className="rounded-2xl border border-orange-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">Order #{order.id}</div>
                                        <div className="text-xs text-slate-500">{order.phone}</div>
                                    </div>
                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneForStatus(order.status).tone}`}>
                                        {toneForStatus(order.status).label}
                                    </span>
                                </div>
                                <div className="mt-3 text-sm text-slate-600">{summarizeItems(order)}</div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    {order.delayed && <span className="rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-700">Delayed</span>}
                                    <span className={`rounded-full border px-2.5 py-1 font-semibold ${toneForPriority(order.priority).tone}`}>{toneForPriority(order.priority).label}</span>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{order.stageAgeMinutes} min in stage</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="grid gap-4 xl:grid-cols-3">
                    {LIVE_STAGES.map((stage) => (
                        <div key={stage} className="h-48 animate-pulse rounded-3xl bg-slate-100" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 xl:grid-cols-3">
                    {LIVE_STAGES.map((stage) => (
                        <div key={stage} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">{toneForStatus(stage).label}</h3>
                                    <p className="text-sm text-slate-500">{groupedLiveOrders[stage]?.length || 0} live orders</p>
                                </div>
                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneForStatus(stage).tone}`}>
                                    {groupedLiveOrders[stage]?.length || 0}
                                </span>
                            </div>

                            <div className="mt-4 space-y-3">
                                {(groupedLiveOrders[stage] || []).length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No orders in this stage.</div>
                                )}
                                {(groupedLiveOrders[stage] || []).map((order) => (
                                    <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <button onClick={() => setSelectedOrderId(order.id)} className="text-left">
                                                <div className="text-base font-semibold text-slate-900">Order #{order.id}</div>
                                                <div className="text-sm text-slate-500">{order.phone}</div>
                                            </button>
                                            <div className="text-right text-xs text-slate-500">
                                                <div>{formatDateTime(order.createdAt)}</div>
                                                <div className="mt-1 font-semibold text-slate-700">{order.ageMinutes} min old</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 text-sm text-slate-600">{summarizeItems(order)}</div>
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                            <span className={`rounded-full border px-2.5 py-1 font-semibold ${toneForPriority(order.priority).tone}`}>{toneForPriority(order.priority).label}</span>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{formatCurrency(order.total)}</span>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{order.totalItems} items</span>
                                            {order.delayed && <span className="rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-700">Delayed</span>}
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {(order.availableTransitions || []).slice(0, 3).map((nextStatus) => (
                                                <button
                                                    key={`${order.id}-${nextStatus}`}
                                                    onClick={() => handleOrderUpdate(order.id, { status: nextStatus })}
                                                    disabled={actionLoading}
                                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Move to {toneForStatus(nextStatus).label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">Operational queue</h2>
                                <p className="text-sm text-slate-500">Search any order, filter by workflow state, and open the full detail panel.</p>
                            </div>
                            <button onClick={() => loadData({ quiet: true })} className="touch-button rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700">Refresh queue</button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <input
                                value={filters.query}
                                onChange={(e) => { setPage(0); setFilters((prev) => ({ ...prev, query: e.target.value })); }}
                                placeholder="Search by order id or phone"
                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-brand-400"
                            />
                            <select value={filters.status} onChange={(e) => { setPage(0); setFilters((prev) => ({ ...prev, status: e.target.value })); }} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400">
                                <option value="">All statuses</option>
                                <option value="PLACED">Placed</option>
                                <option value="PREPARING">Preparing</option>
                                <option value="READY">Ready</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                            <select value={filters.paymentStatus} onChange={(e) => { setPage(0); setFilters((prev) => ({ ...prev, paymentStatus: e.target.value })); }} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400">
                                <option value="">All payments</option>
                                <option value="PAID">Paid</option>
                                <option value="PENDING">Pending</option>
                            </select>
                            <select value={filters.priority} onChange={(e) => { setPage(0); setFilters((prev) => ({ ...prev, priority: e.target.value })); }} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400">
                                <option value="">All priorities</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                                Live only
                                <input type="checkbox" checked={filters.liveOnly} onChange={(e) => { setPage(0); setFilters((prev) => ({ ...prev, liveOnly: e.target.checked })); }} className="h-4 w-4 rounded border-slate-300" />
                            </label>
                        </div>
                    </div>

                    <div className="mt-5 space-y-3">
                        {(ordersPage.content || []).length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No orders found for the selected filters.</div>
                        )}
                        {(ordersPage.content || []).map((order) => {
                            const isSelected = order.id === selectedOrderId;
                            return (
                                <button
                                    key={order.id}
                                    onClick={() => setSelectedOrderId(order.id)}
                                    className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${isSelected ? 'border-brand-400 bg-brand-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-lg font-semibold text-slate-900">Order #{order.id}</span>
                                                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneForStatus(order.status).tone}`}>{toneForStatus(order.status).label}</span>
                                                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneForPriority(order.priority).tone}`}>{toneForPriority(order.priority).label}</span>
                                                {order.delayed && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Delayed</span>}
                                            </div>
                                            <div className="mt-2 text-sm text-slate-500">{order.phone} • {formatDateTime(order.createdAt)}</div>
                                            <div className="mt-3 text-sm text-slate-600">{summarizeItems(order)}</div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 lg:justify-end">
                                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Payment: {order.paymentStatus || 'PENDING'}</span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{formatCurrency(order.total)}</span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{order.stageAgeMinutes} min in stage</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <div>{ordersPage.totalElements || 0} total orders</div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select value={size} onChange={(e) => { setPage(0); setSize(Number(e.target.value)); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                <option value={10}>10 / page</option>
                                <option value={20}>20 / page</option>
                                <option value={30}>30 / page</option>
                            </select>
                            <button onClick={() => setPage((prev) => Math.max(0, prev - 1))} disabled={page === 0} className="rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Prev</button>
                            <span>Page {page + 1} of {ordersPage.totalPages || 1}</span>
                            <button onClick={() => setPage((prev) => Math.min((ordersPage.totalPages || 1) - 1, prev + 1))} disabled={page >= (ordersPage.totalPages || 1) - 1} className="rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    {!selectedOrder && (
                        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">Choose an order to open the operations panel.</div>
                    )}
                    {selectedOrder && (
                        <div className="space-y-5">
                            <div className="border-b border-slate-100 pb-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Selected order</div>
                                        <h2 className="mt-2 text-2xl font-bold text-slate-900">Order #{selectedOrder.id}</h2>
                                        <p className="mt-1 text-sm text-slate-500">{selectedOrder.phone} • Created {formatDateTime(selectedOrder.createdAt)}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 sm:flex-col sm:text-right">
                                        <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${toneForStatus(selectedOrder.status).tone}`}>{toneForStatus(selectedOrder.status).label}</span>
                                        <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${toneForPriority(selectedOrder.priority).tone}`}>{toneForPriority(selectedOrder.priority).label}</span>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                                    <div className="rounded-2xl bg-slate-50 p-3">
                                        <div className="text-xs uppercase tracking-wide text-slate-500">Total</div>
                                        <div className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(selectedOrder.total)}</div>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-3">
                                        <div className="text-xs uppercase tracking-wide text-slate-500">Payment</div>
                                        <div className="mt-1 text-lg font-bold text-slate-900">{selectedOrder.paymentStatus || 'PENDING'}</div>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-3">
                                        <div className="text-xs uppercase tracking-wide text-slate-500">Age</div>
                                        <div className="mt-1 text-lg font-bold text-slate-900">{selectedOrder.ageMinutes} min</div>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-3">
                                        <div className="text-xs uppercase tracking-wide text-slate-500">Assigned</div>
                                        <div className="mt-1 text-lg font-bold text-slate-900">{selectedOrder.assignedAdmin || 'Unassigned'}</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Workflow actions</h3>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(selectedOrder.availableTransitions || []).map((nextStatus) => (
                                        <button
                                            key={`detail-${selectedOrder.id}-${nextStatus}`}
                                            onClick={() => handleOrderUpdate(selectedOrder.id, { status: nextStatus })}
                                            disabled={actionLoading}
                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Move to {toneForStatus(nextStatus).label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Priority</h3>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {['NORMAL', 'HIGH', 'URGENT'].map((priority) => (
                                        <button
                                            key={priority}
                                            onClick={() => handleOrderUpdate(selectedOrder.id, { priority })}
                                            disabled={actionLoading}
                                            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${selectedOrder.priority === priority ? toneForPriority(priority).tone : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            {toneForPriority(priority).label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Kitchen note</h3>
                                    <button onClick={() => setNoteDraft(selectedOrder.adminNote || '')} className="text-xs font-medium text-slate-500">Reset</button>
                                </div>
                                <textarea
                                    value={noteDraft}
                                    onChange={(e) => setNoteDraft(e.target.value)}
                                    rows={4}
                                    placeholder="Capture service instructions, escalation details, or pickup notes for the team."
                                    className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
                                />
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button onClick={() => handleOrderUpdate(selectedOrder.id, { adminNote: noteDraft })} disabled={actionLoading} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">Save note</button>
                                    <button onClick={() => handleOrderUpdate(selectedOrder.id, { adminNote: '' })} disabled={actionLoading} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Clear note</button>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Items</h3>
                                <div className="mt-3 space-y-3">
                                    {(selectedOrder.items || []).map((item, index) => (
                                        <div key={`${selectedOrder.id}-${item.itemId || index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="font-semibold text-slate-900">{item.name || 'Menu item'}</div>
                                                    <div className="mt-1 text-sm text-slate-500">Qty {item.quantity} • {item.isVeg ? 'Veg' : 'Non-veg / N/A'}</div>
                                                </div>
                                                <div className="text-right text-sm font-semibold text-slate-700">{formatCurrency(item.subtotal || (item.price || 0) * (item.quantity || 0))}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Status history</h3>
                                <div className="mt-3 space-y-3">
                                    {(selectedOrder.history || []).length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No workflow events recorded yet.</div>
                                    )}
                                    {(selectedOrder.history || []).map((entry, index) => (
                                        <div key={`${selectedOrder.id}-history-${index}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-sm font-semibold text-slate-900">
                                                    {(entry.previousStatus || 'NEW')} → {entry.newStatus}
                                                </div>
                                                <div className="text-xs text-slate-500">{formatDateTime(entry.changedAt)}</div>
                                            </div>
                                            <div className="mt-1 text-sm text-slate-500">Updated by {entry.changedBy || 'system'}</div>
                                            {entry.note && <div className="mt-2 text-sm text-slate-700">{entry.note}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

AdminOrderOperations.propTypes = {
    embedded: PropTypes.bool,
};

