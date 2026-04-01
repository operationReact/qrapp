import React from 'react';

export default function OrderList({ orders = [], onUpdateStatus = () => {} }) {
    if (!orders || orders.length === 0) {
        return <div className="text-gray-600">No orders found.</div>;
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            {orders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-bold">Order #{order.id}</div>
                            <div className="text-sm text-gray-600">Status: {order.status}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => onUpdateStatus(order.id, 'PREPARING')} className="px-2 py-1 bg-gray-100 rounded">Preparing</button>
                            <button onClick={() => onUpdateStatus(order.id, 'READY')} className="px-2 py-1 bg-gray-100 rounded">Ready</button>
                            <button onClick={() => onUpdateStatus(order.id, 'COMPLETED')} className="px-2 py-1 bg-gray-100 rounded">Complete</button>
                        </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                        Items: {(order.items || []).map(i => `${i.name} x${i.quantity}`).join(', ')}
                    </div>
                </div>
            ))}
        </div>
    );
}
