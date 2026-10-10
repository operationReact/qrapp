import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPartnerOrder } from "@/services/partner-portal-service";

export const Route = createFileRoute("/partner/orders/$orderId")({ component: OrderDetails });
function OrderDetails() {
  const { orderId } = Route.useParams();
  const query = useQuery({ queryKey: ["partner-order", orderId], queryFn: () => getPartnerOrder(orderId) });
  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading order...</p>;
  const order = query.data;
  return <div className="rounded-2xl border bg-white p-6"><h1 className="text-xl font-bold">Order {order.orderNumber}</h1><p className="mt-2 text-sm text-muted-foreground">{order.createdAt}</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">₹{order.total}</p></div><div><p className="text-xs text-muted-foreground">Payment</p><p className="font-semibold">{order.paymentStatus}</p></div><div><p className="text-xs text-muted-foreground">Status</p><p className="font-semibold">{order.status}</p></div></div></div>;
}
