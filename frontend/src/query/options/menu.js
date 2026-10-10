import { queryOptions } from "@tanstack/react-query";
import {
  getMenu,
  getCategories,
  getRecommendedMenu,
  getRetailMenu,
} from "../../services/menu-service";
import { getEffectiveLocationId } from "@/lib/activeLocationStore";

const storedLocationId = () => {
  return getEffectiveLocationId();
};

export const menuOptions = (opts = {}) => {
  const locationId = opts.locationId ?? storedLocationId();
  return queryOptions({
    queryKey: ["menu", locationId, opts],
    queryFn: () => getMenu({ ...opts, locationId }),
    enabled: Boolean(locationId),
    staleTime: 1000 * 15,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
    placeholderData: [],
  });
};

export const categoriesOptions = (locationId = storedLocationId()) => queryOptions({
  queryKey: ["categories", locationId],
  queryFn: () => getCategories(locationId),
  enabled: Boolean(locationId),
  staleTime: 1000 * 60 * 10,
  gcTime: 1000 * 60 * 30,
  refetchOnWindowFocus: false,
});

export const recommendedMenuOptions = (limit = 6, locationId = storedLocationId()) =>
  queryOptions({
    queryKey: ["menu", "recommended", locationId, limit],
    queryFn: () => getRecommendedMenu({ limit, locationId }),
    enabled: Boolean(locationId),
    staleTime: 1000 * 15,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
  });

export const retailMenuOptions = (locationId = storedLocationId()) =>
  queryOptions({
    queryKey: ["menu", "retail", locationId],
    queryFn: () => getRetailMenu({ locationId }),
    enabled: Boolean(locationId),
    staleTime: 1000 * 15,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
    placeholderData: [],
  });
