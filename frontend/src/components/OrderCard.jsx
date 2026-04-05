import PropTypes from 'prop-types';
import { useState } from 'react';

const STATUS_COLORS = {
    NEW: 'bg-yellow-100 text-yellow-800',
    PLACED: 'bg-yellow-100 text-yellow-800', // backend value
    PREPARING: 'bg-blue-100 text-blue-800',
    READY: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
};

export default function OrderCard({ order, onUpdateStatus }) {
    const [loading, setLoading] = useState(false);

    const { id, items = [], total = 0 } = order;
    // normalize backend statuses: PLACED -> NEW for display where appropriate
    const rawStatus = order.status || 'PLACED';
    const status = rawStatus === 'PLACED' ? 'NEW' : rawStatus;

    const nextActions = [];
    if (status === 'NEW') nextActions.push('PREPARING');
    if (status === 'PREPARING') nextActions.push('READY');
    if (status === 'READY') nextActions.push('COMPLETED');

    const doUpdate = async (newStatus) => {
        setLoading(true);
        // simulate API call
        setTimeout(() => {
            setLoading(false);
            onUpdateStatus(id, newStatus);
        }, 1000);
    };

    return (
        <article className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[rawStatus] || STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}>{status}</div>
                    <div className="text-sm text-gray-500">Order ID: {id}</div>
                </div>
                <div className="text-left sm:text-right">
                    <div className="text-lg font-semibold">₹{total}</div>
                </div>
            </div>
            <div className="mt-3 space-y-2">
                {items.map(it => (
                    <div key={it.id} className="flex flex-col gap-1 rounded-xl bg-gray-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>{it.name} x {it.quantity || it.qty || 1}</div>
                        <div className="text-gray-500">₹{(it.price || 0) * (it.quantity || it.qty || 1)}</div>
                    </div>
                ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                {nextActions.map(a => (
                    <button key={a} onClick={() => doUpdate(a)} disabled={loading} className={`touch-button rounded-xl px-3 py-2 text-sm font-medium ${loading ? 'cursor-not-allowed opacity-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`} aria-label={`Mark order ${id} ${a}`}>
                        {loading ? 'Saving...' : `Mark ${a}`}
                    </button>
                ))}
                <button onClick={() => doUpdate('COMPLETED')} disabled={loading || status === 'COMPLETED'} className={`touch-button rounded-xl px-3 py-2 text-sm font-medium ${loading || status === 'COMPLETED' ? 'cursor-not-allowed opacity-50' : 'bg-gray-200'}`} aria-label={`Mark order ${id} COMPLETED`}>
                    Mark COMPLETED
                </button>
            </div>
        </article>
    );
}

OrderCard.propTypes = {
    order: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
        items: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
            name: PropTypes.string,
            quantity: PropTypes.number,
            price: PropTypes.number,
        })),
        total: PropTypes.number,
        status: PropTypes.string,
    }).isRequired,
    onUpdateStatus: PropTypes.func.isRequired,
};
