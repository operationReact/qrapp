import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu as MenuIcon } from "lucide-react";
import { getPartnerMenu } from "@/services/partner-portal-service";
import { usePartner } from "@/context/PartnerContext";
import { PartnerEmptyState, SectionHeader } from "@/routes/partner";

export const Route = createFileRoute("/partner/menu")({ component: PartnerMenu });
function PartnerMenu() {
  const { selectedLocationId } = usePartner();
  const query = useQuery({ queryKey: ["partner-menu", selectedLocationId], queryFn: () => getPartnerMenu(selectedLocationId), enabled: Boolean(selectedLocationId), retry: false });
  if (!selectedLocationId) return <PartnerEmptyState icon={MenuIcon} title="Select a location" description="Choose a location above to view its read-only menu." />;
  if (query.isLoading) return <div className="partner-page-skeleton"><div /><div /><div /></div>;
  if (query.isError) return <p className="partner-inline-error">Menu items are temporarily unavailable.</p>;
  const items = query.data || [];
  return <section className="partner-route-page"><SectionHeader eyebrow="Operations" title="Menu" /><p className="partner-route-description">Your current menu and availability. Menu changes are managed by Bro & Bro.</p>{items.length ? <div className="partner-menu-grid">{items.map((item) => <article key={item.id} className="partner-menu-card"><div className="partner-menu-card-top"><span className="partner-menu-category">{item.category || "Menu item"}</span><span className={item.available ? "partner-available" : "partner-unavailable"}>{item.available ? "Available" : "Unavailable"}</span></div><h2>{item.name}</h2><p>{item.description || "No description available."}</p><strong>₹{item.price}</strong></article>)}</div> : <PartnerEmptyState icon={MenuIcon} title="Menu is empty" description="Menu items for this location will appear here." />}</section>;
}
