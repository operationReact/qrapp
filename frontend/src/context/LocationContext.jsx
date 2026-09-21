import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services";
import { useAuth } from "./AuthContext";
import { canAccessAdmin } from "@/lib/roles";

const STORAGE_KEY = "active-location";
const LocationContext = createContext(null);

function readActiveLocation() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

export function authorizedLocationsOptions(enabled = true) {
  return {
    queryKey: ["locations", "accessible"],
    queryFn: async () => {
      const response = await apiClient.get("/api/locations/accessible");
      const body = response.data;
      return Array.isArray(body) ? body : (body?.content || body?.data || body?.locations || []);
    },
    enabled,
  };
}

export function publicLocationsOptions(enabled = true) {
  return {
    queryKey: ["locations", "public"],
    queryFn: async () => (await apiClient.get("/api/locations/public")).data || [],
    enabled,
  };
}

export function LocationProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = canAccessAdmin(user);
  const usePublicLocations = !isAdmin;
  const authorizedQuery = useQuery(
    authorizedLocationsOptions(Boolean(user?.token) && isAdmin),
  );
  const publicQuery = useQuery(publicLocationsOptions(usePublicLocations));
  const locationQuery = usePublicLocations ? publicQuery : authorizedQuery;
  const locationQuerySuccess = usePublicLocations
    ? publicQuery.isSuccess
    : authorizedQuery.isSuccess;
  const [storedLocation, setStoredLocation] = useState(readActiveLocation);
  const availableLocations = useMemo(
    () => (usePublicLocations ? publicQuery.data : authorizedQuery.data) || [],
    [authorizedQuery.data, publicQuery.data, usePublicLocations],
  );
  const defaultLocation = user?.defaultLocation || user?.info?.defaultLocation;
  const activeLocation = availableLocations.find((item) => String(item.id) === String(storedLocation?.id))
    || availableLocations.find((item) => String(item.id) === String(defaultLocation?.id))
    || availableLocations.find((item) => item.code === "PRAGATI_NAGAR")
    || availableLocations[0]
    || null;

  useEffect(() => {
    if (activeLocation) localStorage.setItem(STORAGE_KEY, JSON.stringify(activeLocation));
    else localStorage.removeItem(STORAGE_KEY);
  }, [activeLocation]);

  useEffect(() => {
    if (!locationQuerySuccess) return;
    if (storedLocation && !availableLocations.some((item) => String(item.id) === String(storedLocation.id))) {
      const timer = window.setTimeout(() => setStoredLocation(null), 0);
      return () => window.clearTimeout(timer);
    } else if (!storedLocation && activeLocation) {
      const timer = window.setTimeout(() => setStoredLocation(activeLocation), 0);
      return () => window.clearTimeout(timer);
    }
  }, [activeLocation, availableLocations, locationQuerySuccess, storedLocation]);

  const setActiveLocation = useCallback((location) => {
    const next = location && availableLocations.find((item) => String(item.id) === String(location.id));
    setStoredLocation(next || null);
  }, [availableLocations]);
  const value = useMemo(() => ({
    activeLocation, activeLocationId: activeLocation?.id ?? null, availableLocations,
    setActiveLocation, locations: availableLocations, selectLocation: setActiveLocation,
    isLoading: locationQuery.isLoading,
    error: locationQuery.error,
    refetch: locationQuery.refetch,
  }), [activeLocation, availableLocations, setActiveLocation,
    locationQuery.isLoading, locationQuery.error, locationQuery.refetch]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  return useContext(LocationContext) || {
    activeLocation: null, activeLocationId: null, availableLocations: [], locations: [],
    setActiveLocation: () => {}, selectLocation: () => {}, isLoading: false, error: null,
  };
}
