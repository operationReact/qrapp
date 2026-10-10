import { createContext, useContext, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPartnerPortal } from "@/services/partner-portal-service";
import { useAuth } from "@/context/AuthContext";

const PartnerContext = createContext(null);

export function PartnerProvider({ children }) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["partner-portal-me", user?.token],
    queryFn: getPartnerPortal,
    enabled: Boolean(user?.token),
    retry: false,
  });
  const locations = useMemo(() => query.data?.locations || [], [query.data?.locations]);
  const primary = locations.find((location) => location.relationshipType === "PRIMARY");
  const [stored, setStored] = useState(() => sessionStorage.getItem("partner-location-id") || "");
  const selectedLocationId = locations.some((location) => String(location.locationId) === stored)
    ? Number(stored) : (primary?.locationId || locations[0]?.locationId || null);
  const value = useMemo(() => ({
    ...query, portal: query.data, locations, selectedLocationId,
    setSelectedLocationId: (id) => { sessionStorage.setItem("partner-location-id", String(id)); setStored(String(id)); },
  }), [query, locations, selectedLocationId]);
  return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
}

export function usePartner() { return useContext(PartnerContext); }
