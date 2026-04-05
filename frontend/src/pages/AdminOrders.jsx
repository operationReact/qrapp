import AdminOrderOperations from '../components/AdminOrderOperations';

export default function AdminOrders() {
    return (
        <div className="page-shell bg-gradient-to-b from-slate-50 via-white to-slate-100 px-3 py-4 sm:px-4 sm:py-6">
            <div className="mx-auto max-w-7xl">
                <AdminOrderOperations />
            </div>
        </div>
    );
}
