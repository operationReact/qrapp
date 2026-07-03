import { createFileRoute, useParams } from "@tanstack/react-router";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import OrderDetailPanel from "@/components/admin/OrderDetailPanel";

export const Route = createFileRoute(
  "/admin/(orders)/operational-queue/$orderId",
)({
  component: SelectedOrderPage,
});

function SelectedOrderPage() {
  const params = useParams({ strict: false });
  const selectedOrderId = params?.orderId;

  const { selectedOrder, actionLoading, handleOrderUpdate } =
    useAdminDashboard(selectedOrderId);

  return (
    <div className="bg-white p-4 shadow-sm">
      <OrderDetailPanel
        order={selectedOrder}
        actionLoading={actionLoading}
        onUpdate={(payload) => handleOrderUpdate(selectedOrder?.id, payload)}
      />
    </div>
  );
}
