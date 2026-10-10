import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, CreditCard, FileCheck2, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { getPartnerPortal } from "@/services/partner-portal-service";
import { PartnerBrand } from "@/components/partner/PartnerComponents";
import { PartnerEmptyState, SectionHeader } from "@/routes/partner";
import { getPartnerDisplayName } from "@/lib/partnerBranding";

export const Route = createFileRoute("/partner/profile")({ component: Profile });
function Profile() {
  const query = useQuery({ queryKey: ["partner-portal-me"], queryFn: getPartnerPortal, retry: false });
  if (query.isLoading) return <div className="partner-page-skeleton"><div /><div /><div /></div>;
  if (query.isError || !query.data?.partner) return <p className="partner-inline-error">Partner profile is temporarily unavailable.</p>;
  const { partner, locations } = query.data;
  return <section className="partner-route-page"><section className="partner-profile-hero"><PartnerBrand name={getPartnerDisplayName(partner)} logo={partner.logoUrl} code={partner.partnerCode} status={partner.status} /><div className="partner-profile-hero-code">{partner.partnerCode}</div></section><div className="partner-profile-grid"><ProfileSection icon={Building2} title="Business information"><Info label="Legal name" value={partner.legalName} /><Info label="Business type" value={partner.businessType} /><Info label="Registered address" value={[partner.registeredAddress, partner.city, partner.state, partner.pincode].filter(Boolean).join(", ")} /></ProfileSection><ProfileSection icon={Mail} title="Contact information"><Info label="Primary contact" value={partner.primaryContactName} /><Info label="Email" value={partner.primaryContactEmail} /><Info label="Phone" value={partner.primaryContactPhone} /><Info label="Alternate phone" value={partner.alternateContactPhone} /></ProfileSection><ProfileSection icon={FileCheck2} title="Compliance"><Info label="GST registered" value={partner.gstRegistered ? "Yes" : "No"} /><Info label="GSTIN" value={partner.gstin} /><Info label="PAN" value={partner.pan} /><Info label="FSSAI" value={partner.fssai} /></ProfileSection><ProfileSection icon={CreditCard} title="Banking"><Info label="Account holder" value={partner.accountHolderName} /><Info label="Bank" value={partner.bankName} /><Info label="Account number" value={partner.maskedAccountNumber} /><Info label="IFSC" value={partner.ifsc} /><Info label="UPI ID" value={partner.upiId} /></ProfileSection></div><section className="partner-profile-locations"><SectionHeader eyebrow="Assigned footprint" title="Locations" />{locations.length ? locations.map((location) => <div className="partner-profile-location-row" key={location.id}><MapPin className="size-4" /><strong>{location.locationName}</strong><span>{location.locationCode}</span><em>{location.relationshipType} · {location.status}</em></div>) : <PartnerEmptyState icon={MapPin} title="No locations assigned" description="Assigned locations will appear here." compact />}</section></section>;
}
function ProfileSection({ icon, title, children }) { const Icon = icon; return <section className="partner-profile-section"><div className="partner-profile-section-title"><Icon className="size-4" /><h2>{title}</h2></div><div className="partner-profile-info-grid">{children}</div></section>; }
function Info({ label, value }) { return <div><p>{label}</p><strong>{value || "--"}</strong></div>; }
