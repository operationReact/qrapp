import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services";
import { useAuth } from "./AuthContext";

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
  const authorizedQuery = useQuery(authorizedLocationsOptions(Boolean(user?.token)));
  const publicQuery = useQuery(publicLocationsOptions(!user?.token));
  const [storedLocation, setStoredLocation] = useState(readActiveLocation);
  const availableLocations = useMemo(
    () => (user?.token ? authorizedQuery.data : publicQuery.data) || [],
    [authorizedQuery.data, publicQuery.data, user?.token],
  );
  const defaultLocation = user?.defaultLocation || user?.info?.defaultLocation;
  const activeLocation = availableLocations.find((item) => String(item.id) === String(storedLocation?.id))
    || availableLocations.find((item) => String(item.id) === String(defaultLocation?.id))
    || availableLocations[0]
    || null;

  useEffect(() => {
    if (activeLocation) localStorage.setItem(STORAGE_KEY, JSON.stringify(activeLocation));
    else localStorage.removeItem(STORAGE_KEY);
  }, [activeLocation]);

  useEffect(() => {
    const locationsQuery = user?.token ? authorizedQuery : publicQuery;
    if (!locationsQuery.isSuccess) return;
    if (storedLocation && !availableLocations.some((item) => String(item.id) === String(storedLocation.id))) {
      const timer = window.setTimeout(() => setStoredLocation(null), 0);
      return () => window.clearTimeout(timer);
    } else if (!storedLocation && activeLocation) {
      const timer = window.setTimeout(() => setStoredLocation(activeLocation), 0);
      return () => window.clearTimeout(timer);
    }
  }, [activeLocation, availableLocations, authorizedQuery.isSuccess, publicQuery.isSuccess,
    user?.token, storedLocation]);

  const setActiveLocation = useCallback((location) => {
    const next = location && availableLocations.find((item) => String(item.id) === String(location.id));
    setStoredLocation(next || null);
  }, [availableLocations]);
  const value = useMemo(() => ({
    activeLocation, activeLocationId: activeLocation?.id ?? null, availableLocations,
    setActiveLocation, locations: availableLocations, selectLocation: setActiveLocation,
    isLoading: authorizedQuery.isLoading || publicQuery.isLoading,
    error: authorizedQuery.error || publicQuery.error,
    refetch: user?.token ? authorizedQuery.refetch : publicQuery.refetch,
  }), [activeLocation, availableLocations, setActiveLocation, authorizedQuery.isLoading,
    publicQuery.isLoading, authorizedQuery.error, publicQuery.error, user?.token,
    authorizedQuery.refetch, publicQuery.refetch]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  return useContext(LocationContext) || {
    activeLocation: null, activeLocationId: null, availableLocations: [], locations: [],
    setActiveLocation: () => {}, selectLocation: () => {}, isLoading: false, error: null,
  };
}
