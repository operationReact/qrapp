import AdminOrderOperations from '../components/AdminOrderOperations';

export default function AdminOrders() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-3 py-6 sm:px-4">
            <div className="mx-auto max-w-7xl">
                <AdminOrderOperations />
            </div>
        </div>
    );
}
