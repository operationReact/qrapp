import PropTypes from 'prop-types';

export default function OrderList({ orders = [], onUpdateStatus = () => {} }) {
    if (!orders || orders.length === 0) {
        return <div className="text-gray-600">No orders found.</div>;
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            {orders.map(order => (
                <div key={order.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="font-bold">Order #{order.id}</div>
                            <div className="text-sm text-gray-600">Status: {order.status}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={() => onUpdateStatus(order.id, 'PREPARING')} className="touch-button rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">Preparing</button>
                            <button onClick={() => onUpdateStatus(order.id, 'READY')} className="touch-button rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">Ready</button>
                            <button onClick={() => onUpdateStatus(order.id, 'COMPLETED')} className="touch-button rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">Complete</button>
                        </div>
                    </div>
                    <div className="mt-3 text-sm text-gray-700">
                        Items: {(order.items || []).map(i => `${i.name} x${i.quantity}`).join(', ')}
                    </div>
                </div>
            ))}
        </div>
    );
}

OrderList.propTypes = {
    orders: PropTypes.array,
    onUpdateStatus: PropTypes.func,
};

