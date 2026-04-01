import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getOrdersAdmin, updateOrderStatusAdmin } from '../services/api';
import OrderList from '../components/OrderList';

export default function AdminOrders() {
    const { setAdmin } = useAdminAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [statusFilter, setStatusFilter] = useState(''); // '' means all

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await getOrdersAdmin({ page, size, status: statusFilter || undefined });
                // Spring Page has properties: content, totalPages, number
                const data = res.data || {};
                setOrders(data.content || []);
                setTotalPages(data.totalPages || 0);
            } catch (e) {
                if (e?.response?.status === 401 || e?.response?.status === 403) {
                    setAdmin(null);
                    navigate('/login');
                    return;
                }
                console.error(e);
                setError('Failed to load orders');
            } finally { setLoading(false); }
        }
        load();
    }, [setAdmin, navigate, page, size, statusFilter]);

    async function handleUpdateStatus(id, status) {
        // map UI status to server status
        const serverStatus = status === 'NEW' ? 'PLACED' : status;

        const prev = orders;
        setOrders(o => o.map(x => x.id === id ? { ...x, status: serverStatus } : x));
        try {
            await updateOrderStatusAdmin(id, { status: serverStatus });
        } catch (e) {
            setOrders(prev);
            if (e?.response?.status === 401 || e?.response?.status === 403) {
                setAdmin(null);
                navigate('/login');
                return;
            }
            console.error(e);
            setError(e?.response?.data?.message || 'Failed to update order');
            setTimeout(() => setError(null), 4000);
        }
    }

    return (
        <div className="min-h-screen bg-page">
            <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Orders</h1>
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/admin')} className="px-3 py-1 bg-gray-100 rounded">Back</button>
                        <button onClick={async () => { setLoading(true); try { const r = await getOrdersAdmin(); setOrders(r.data || []); } catch (e) { console.error(e); } finally { setLoading(false); } }} className="px-3 py-1 bg-brand-600 text-white rounded">Refresh</button>
                    </div>
                </div>

                {error && <div className="mb-4 text-red-600">{error}</div>}

                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <label className="text-sm">Status:</label>
                        <select value={statusFilter} onChange={e => { setPage(0); setStatusFilter(e.target.value); }} className="border rounded px-2 py-1">
                            <option value="">All</option>
                            <option value="PLACED">NEW</option>
                            <option value="PREPARING">PREPARING</option>
                            <option value="READY">READY</option>
                            <option value="COMPLETED">COMPLETED</option>
                        </select>
                        <label className="text-sm">Page size:</label>
                        <select value={size} onChange={e => { setPage(0); setSize(Number(e.target.value)); }} className="border rounded px-2 py-1">
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { if (page > 0) setPage(page - 1); }} disabled={page === 0} className="px-3 py-1 bg-gray-100 rounded">Prev</button>
                        <div className="text-sm">Page {page + 1} of {totalPages || 1}</div>
                        <button onClick={() => { if (page < (totalPages - 1)) setPage(page + 1); }} disabled={page >= (totalPages - 1)} className="px-3 py-1 bg-gray-100 rounded">Next</button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded shadow animate-pulse h-32" />
                        <div className="bg-white p-4 rounded shadow animate-pulse h-32" />
                        <div className="bg-white p-4 rounded shadow animate-pulse h-32" />
                        <div className="bg-white p-4 rounded shadow animate-pulse h-32" />
                    </div>
                ) : (
                    <>
                        <OrderList orders={orders} onUpdateStatus={handleUpdateStatus} />
                        <div className="mt-4 flex items-center justify-between">
                            <div className="text-sm text-gray-600">Total pages: {totalPages}</div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { if (page > 0) setPage(page - 1); }} disabled={page === 0} className="px-3 py-1 bg-gray-100 rounded">Prev</button>
                                <div className="text-sm">Page {page + 1} of {totalPages || 1}</div>
                                <button onClick={() => { if (page < (totalPages - 1)) setPage(page + 1); }} disabled={page >= (totalPages - 1)} className="px-3 py-1 bg-gray-100 rounded">Next</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
