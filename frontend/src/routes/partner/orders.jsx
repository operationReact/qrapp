import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ReceiptText } from "lucide-react";
import { getPartnerOrders } from "@/services/partner-portal-service";
import { usePartner } from "@/context/PartnerContext";
import { PartnerEmptyState, SectionHeader } from "@/routes/partner";

export const Route = createFileRoute("/partner/orders")({ component: PartnerOrders });
function PartnerOrders() {
  const { selectedLocationId } = usePartner();
  const query = useQuery({ queryKey: ["partner-orders", selectedLocationId], queryFn: () => getPartnerOrders({ locationId: selectedLocationId }), enabled: Boolean(selectedLocationId), retry: false });
  const orders = query.data?.content || [];
  if (query.isLoading) return <div className="partner-page-skeleton"><div /><div /></div>;
  if (query.isError) return <p className="partner-inline-error">Orders are temporarily unavailable.</p>;
  return <section className="partner-route-page"><SectionHeader eyebrow="Operations" title="Orders" /><p className="partner-route-description">Read-only order activity for your selected location.</p>{orders.length ? <div className="partner-orders-card"><table className="partner-data-table"><thead><tr><th>Order</th><th>Location</th><th>Date / time</th><th>Amount</th><th>Status</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><Link to="/partner/orders/$orderId" params={{ orderId: String(order.id) }} className="partner-data-link">{order.orderNumber}</Link></td><td>{order.locationName || "Selected location"}</td><td>{order.createdAt}</td><td>₹{order.total}</td><td><span className="partner-table-status">{order.status}</span></td><td><Link to="/partner/orders/$orderId" params={{ orderId: String(order.id) }} className="partner-view-link">View</Link></td></tr>)}</tbody></table><div className="partner-order-mobile-list">{orders.map((order) => <Link key={order.id} to="/partner/orders/$orderId" params={{ orderId: String(order.id) }} className="partner-order-mobile-card"><div><ReceiptText className="size-4" /><strong>{order.orderNumber}</strong></div><b>₹{order.total}</b><span>{order.createdAt}</span><em>{order.status}</em></Link>)}</div></div> : <PartnerEmptyState icon={ClipboardList} title="No orders yet" description="Orders for this location will appear here when customers place them." />}</section>;
}
