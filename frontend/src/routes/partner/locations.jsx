import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { getPartnerPortal } from "@/services/partner-portal-service";
import { PartnerEmptyState, PartnerLocationCard, SectionHeader } from "@/routes/partner";

export const Route = createFileRoute("/partner/locations")({ component: Locations });
function Locations() {
  const query = useQuery({ queryKey: ["partner-portal-me"], queryFn: getPartnerPortal, retry: false });
  if (query.isLoading) return <div className="partner-page-skeleton"><div /><div /></div>;
  if (query.isError) return <p className="partner-inline-error">Locations are temporarily unavailable.</p>;
  const locations = query.data?.locations || [];
  return <section className="partner-route-page"><SectionHeader eyebrow="Operations" title="Locations" /><p className="partner-route-description">Locations assigned to your partner workspace.</p>{locations.length ? <div className="partner-full-location-grid">{locations.map((location) => <PartnerLocationCard key={location.id} location={location} />)}</div> : <PartnerEmptyState icon={MapPin} title="No locations assigned" description="Assigned locations will appear here." />}</section>;
}
