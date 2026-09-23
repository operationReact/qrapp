import { queryOptions } from "@tanstack/react-query";
import {
  getMenu,
  getCategories,
  getRecommendedMenu,
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
    staleTime: 1000 * 60 * 2,
    placeholderData: [],
  });
};

export const categoriesOptions = (locationId = storedLocationId()) => queryOptions({
  queryKey: ["categories", locationId],
  queryFn: () => getCategories(locationId),
  enabled: Boolean(locationId),
  staleTime: 1000 * 60 * 5,
});

export const recommendedMenuOptions = (limit = 6, locationId = storedLocationId()) =>
  queryOptions({
    queryKey: ["menu", "recommended", locationId, limit],
    queryFn: () => getRecommendedMenu({ limit, locationId }),
    enabled: Boolean(locationId),
    staleTime: 1000 * 60 * 2,
  });
