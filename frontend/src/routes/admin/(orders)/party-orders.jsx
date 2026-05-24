import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import PartyOrderCard from "@/components/admin/PartyOrderCard";
import { getPartyOrdersAdmin } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute('/admin/(orders)/party-orders')({
  component: PartyOrdersPage
})

function PartyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const resp = await getPartyOrdersAdmin();
      setOrders(resp.data || []);
    } catch (err) {
      console.error("Failed to load party orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <>
      <AdminHeader
        title="Party Orders"
        description="Manage party order requests and provide estimates."
      />

      <div className="px-4 py-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="col-span-full py-20 text-center rounded-3xl border border-dashed border-slate-200 bg-white">
            <h3 className="text-lg font-semibold">No Party Orders Found!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              There's are no party orders needing estimations, please check again leter.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <PartyOrderCard
                key={order.id}
                order={order}
                onEstimateSubmitted={loadOrders}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
