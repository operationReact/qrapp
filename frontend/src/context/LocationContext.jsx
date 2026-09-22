import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services";
import { useAuth } from "./AuthContext";
import { canAccessAdmin, canSelectAllLocations } from "@/lib/roles";
import { ALL_LOCATIONS, activeLocationScopeId, isAllLocationsSelection } from "@/lib/allLocations";
import { resolveSectionOverride } from "@/lib/sectionLocation";

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
  const allowAllLocations = canSelectAllLocations(user);
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
  // Transient, section-level override. It changes the effective location
  // locally and is intentionally NOT persisted to localStorage, so it never
  // mutates the global (persisted) location context.
  const [sectionOverride, setSectionOverride] = useState(null);
  const availableLocations = useMemo(
    () => (usePublicLocations ? publicQuery.data : authorizedQuery.data) || [],
    [authorizedQuery.data, publicQuery.data, usePublicLocations],
  );
  const allLocationsSelected = allowAllLocations && isAllLocationsSelection(storedLocation);
  const defaultLocation = user?.defaultLocation || user?.info?.defaultLocation;
  const baseLocation = allLocationsSelected
    ? ALL_LOCATIONS
    : availableLocations.find((item) => String(item.id) === String(storedLocation?.id))
    || availableLocations.find((item) => String(item.id) === String(defaultLocation?.id))
    || availableLocations.find((item) => item.code === "PRAGATI_NAGAR")
    || availableLocations[0]
    || null;
  const overrideLocation = useMemo(
    () => resolveSectionOverride(sectionOverride, availableLocations),
    [sectionOverride, availableLocations],
  );
  const activeLocation = overrideLocation || baseLocation;
  const isAllLocations = isAllLocationsSelection(activeLocation);
  const activeLocationId = activeLocationScopeId(activeLocation);

  useEffect(() => {
    if (baseLocation) localStorage.setItem(STORAGE_KEY, JSON.stringify(baseLocation));
    else localStorage.removeItem(STORAGE_KEY);
  }, [baseLocation]);

  useEffect(() => {
    if (allLocationsSelected) return;
    if (isAllLocationsSelection(storedLocation) && !allowAllLocations) {
      const timer = window.setTimeout(() => setStoredLocation(null), 0);
      return () => window.clearTimeout(timer);
    }
    if (!locationQuerySuccess) return;
    if (storedLocation && !availableLocations.some((item) => String(item.id) === String(storedLocation.id))) {
      const timer = window.setTimeout(() => setStoredLocation(null), 0);
      return () => window.clearTimeout(timer);
    } else if (!storedLocation && baseLocation) {
      const timer = window.setTimeout(() => setStoredLocation(baseLocation), 0);
      return () => window.clearTimeout(timer);
    }
  }, [baseLocation, allLocationsSelected, allowAllLocations, availableLocations, locationQuerySuccess, storedLocation]);

  const setActiveLocation = useCallback((location) => {
    // A root-level selection supersedes any transient section override.
    setSectionOverride(null);
    if (allowAllLocations && isAllLocationsSelection(location)) {
      setStoredLocation(ALL_LOCATIONS);
      return;
    }
    const next = location && availableLocations.find((item) => String(item.id) === String(location.id));
    setStoredLocation(next || null);
  }, [allowAllLocations, availableLocations]);
  // Section-level selection: transient override, never persisted, and only
  // among assigned locations (never the "All Locations" sentinel).
  const setSectionLocation = useCallback((location) => {
    setSectionOverride(resolveSectionOverride(location, availableLocations));
  }, [availableLocations]);
  const clearSectionLocation = useCallback(() => setSectionOverride(null), []);
  const value = useMemo(() => ({
    activeLocation, activeLocationId, availableLocations,
    isAllLocations, canSelectAllLocations: allowAllLocations, allLocationsOption: ALL_LOCATIONS,
    setActiveLocation, locations: availableLocations, selectLocation: setActiveLocation,
    sectionLocation: overrideLocation, hasSectionOverride: Boolean(overrideLocation),
    setSectionLocation, clearSectionLocation,
    isLoading: locationQuery.isLoading,
    error: locationQuery.error,
    refetch: locationQuery.refetch,
  }), [activeLocation, activeLocationId, availableLocations, isAllLocations, allowAllLocations,
    setActiveLocation, overrideLocation, setSectionLocation, clearSectionLocation,
    locationQuery.isLoading, locationQuery.error, locationQuery.refetch]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  return useContext(LocationContext) || {
    activeLocation: null, activeLocationId: null, availableLocations: [], locations: [],
    isAllLocations: false, canSelectAllLocations: false, allLocationsOption: ALL_LOCATIONS,
    setActiveLocation: () => {}, selectLocation: () => {},
    sectionLocation: null, hasSectionOverride: false,
    setSectionLocation: () => {}, clearSectionLocation: () => {},
    isLoading: false, error: null,
  };
}
