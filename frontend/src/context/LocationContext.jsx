import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services";
import { useAuth } from "./AuthContext";
import { canAccessAdmin, canSelectAllLocations } from "@/lib/roles";
import { ALL_LOCATIONS, activeLocationScopeId, isAllLocationsSelection } from "@/lib/allLocations";
import { resolveSectionOverride } from "@/lib/sectionLocation";
import { setEffectiveLocationId } from "@/lib/activeLocationStore";

const STORAGE_KEY = "active-location";
const LocationContext = createContext(null);

function readActiveLocation() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

export function authorizedLocationsOptions(enabled = true, token = null) {
  return {
    queryKey: ["locations", "accessible"],
    queryFn: async () => {
      const response = await apiClient.get("/api/locations/accessible", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
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

export function publicLocationSearchOptions({ search = "", size = 12 } = {}) {
  return {
    queryKey: ["locations", "public", "search", search, size],
    queryFn: async ({ pageParam, signal }) => {
      const response = await apiClient.get("/api/locations/public/search", {
        params: { search: search || undefined, page: pageParam, size },
        signal,
      });
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage?.hasNext ? lastPage.page + 1 : undefined),
  };
}

export function LocationProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = canAccessAdmin(user);
  const allowAllLocations = canSelectAllLocations(user);
  const usePublicLocations = !isAdmin;
  const authorizedQuery = useQuery(
    authorizedLocationsOptions(Boolean(user?.token) && isAdmin, user?.token),
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
  const assignedLocations = user?.locations
    || user?.info?.locations
    || (user?.locationAccess || user?.info?.locationAccess)?.map((access) => access.location);
  const scopedLocations = useMemo(() => {
    if (usePublicLocations || canSelectAllLocations(user) || !Array.isArray(assignedLocations)) {
      return availableLocations;
    }
    const assignedIds = new Set(assignedLocations.map((location) => String(location.id)));
    return availableLocations.filter((location) => assignedIds.has(String(location.id)));
  }, [assignedLocations, availableLocations, user, usePublicLocations]);
  const allLocationsSelected = allowAllLocations && isAllLocationsSelection(storedLocation);
  const defaultLocation = user?.defaultLocation || user?.info?.defaultLocation;
  const persistedPublicSelection = usePublicLocations && storedLocation?.selectedByUser === true;
  const persistedLocation = scopedLocations.find(
    (item) => String(item.id) === String(storedLocation?.id),
  );
  const baseLocation = allLocationsSelected
    ? ALL_LOCATIONS
    : usePublicLocations
      ? (persistedPublicSelection ? persistedLocation : null)
      : persistedLocation
        || scopedLocations.find((item) => String(item.id) === String(defaultLocation?.id))
        || scopedLocations.find((item) => item.code === "PRAGATI_NAGAR")
        || scopedLocations[0]
        || null;
  const overrideLocation = useMemo(
    () => resolveSectionOverride(sectionOverride, scopedLocations),
    [sectionOverride, scopedLocations],
  );
  const activeLocation = overrideLocation || baseLocation;
  const isAllLocations = isAllLocationsSelection(activeLocation);
  const activeLocationId = activeLocationScopeId(activeLocation);

  useEffect(() => {
    setEffectiveLocationId(activeLocationId);
  }, [activeLocationId]);

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
    if (usePublicLocations && storedLocation && !persistedPublicSelection) {
      const timer = window.setTimeout(() => setStoredLocation(null), 0);
      return () => window.clearTimeout(timer);
    }
    if (storedLocation && !scopedLocations.some((item) => String(item.id) === String(storedLocation.id))) {
      const timer = window.setTimeout(() => setStoredLocation(null), 0);
      return () => window.clearTimeout(timer);
    } else if (!storedLocation && baseLocation) {
      const timer = window.setTimeout(() => setStoredLocation(baseLocation), 0);
      return () => window.clearTimeout(timer);
    }
  }, [baseLocation, allLocationsSelected, allowAllLocations, scopedLocations, locationQuerySuccess,
    storedLocation, usePublicLocations, persistedPublicSelection]);

  const setActiveLocation = useCallback((location) => {
    // A root-level selection supersedes any transient section override.
    setSectionOverride(null);
    if (allowAllLocations && isAllLocationsSelection(location)) {
      setStoredLocation(ALL_LOCATIONS);
      setEffectiveLocationId(null);
      return;
    }
    const next = location && scopedLocations.find((item) => String(item.id) === String(location.id));
    setStoredLocation(next ? { ...next, selectedByUser: true } : null);
    setEffectiveLocationId(activeLocationScopeId(next));
  }, [allowAllLocations, scopedLocations]);
  const clearActiveLocation = useCallback(() => {
    setSectionOverride(null);
    setStoredLocation(null);
    setEffectiveLocationId(null);
  }, []);
  // Section-level selection: transient override, never persisted, and only
  // among assigned locations (never the "All Locations" sentinel).
  const setSectionLocation = useCallback((location) => {
    const next = resolveSectionOverride(location, scopedLocations);
    setSectionOverride(next);
    setEffectiveLocationId(activeLocationScopeId(next));
  }, [scopedLocations]);
  const clearSectionLocation = useCallback(() => {
    setSectionOverride(null);
    setEffectiveLocationId(activeLocationScopeId(baseLocation));
  }, [baseLocation]);
  const value = useMemo(() => ({
    activeLocation, activeLocationId, availableLocations: scopedLocations,
    isAllLocations, canSelectAllLocations: allowAllLocations, allLocationsOption: ALL_LOCATIONS,
    setActiveLocation, clearActiveLocation, locations: scopedLocations, selectLocation: setActiveLocation,
    sectionLocation: overrideLocation, hasSectionOverride: Boolean(overrideLocation),
    setSectionLocation, clearSectionLocation,
    isLoading: locationQuery.isLoading,
    error: locationQuery.error,
    refetch: locationQuery.refetch,
  }), [activeLocation, activeLocationId, scopedLocations, isAllLocations, allowAllLocations,
    setActiveLocation, clearActiveLocation, overrideLocation, setSectionLocation, clearSectionLocation,
    locationQuery.isLoading, locationQuery.error, locationQuery.refetch]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  return useContext(LocationContext) || {
    activeLocation: null, activeLocationId: null, availableLocations: [], locations: [],
    isAllLocations: false, canSelectAllLocations: false, allLocationsOption: ALL_LOCATIONS,
    setActiveLocation: () => {}, selectLocation: () => {},
    clearActiveLocation: () => {}, sectionLocation: null, hasSectionOverride: false,
    setSectionLocation: () => {}, clearSectionLocation: () => {},
    isLoading: false, error: null,
  };
}
