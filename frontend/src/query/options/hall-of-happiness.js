import { queryOptions } from "@tanstack/react-query";
import { getHallOfHappiness, getMyHallOfHappinessPhotos } from "@/services/hall-of-happiness-service";
import { getEffectiveLocationId } from "@/lib/activeLocationStore";

export const hallOfHappinessOptions = ({ page = 0, size = 8, locationId, enabled = true } = {}) => {
  const effectiveLocationId = locationId ?? getEffectiveLocationId();
  return queryOptions({
    queryKey: ["hall-of-happiness", effectiveLocationId, page, size],
    queryFn: () => getHallOfHappiness({ page, size, locationId: effectiveLocationId }),
    enabled,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: true,
  });
};

export const myHallOfHappinessOptions = ({ page = 0, size = 50, enabled = true } = {}) =>
  queryOptions({
    queryKey: ["hall-of-happiness", "mine", page, size],
    queryFn: () => getMyHallOfHappinessPhotos({ page, size }),
    enabled,
    staleTime: 1000 * 30,
  });
