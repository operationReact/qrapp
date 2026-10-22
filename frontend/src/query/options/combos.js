import { queryOptions } from "@tanstack/react-query";
import { getEffectiveLocationId } from "@/lib/activeLocationStore";
import {
  getPublicCombos,
  listComboOpportunities,
  listMissedOpportunities,
} from "../../services/comboService";

const storedLocationId = () => {
  return getEffectiveLocationId();
};

export const publicCombosOptions = (activeLocationId) => {
  const locationId = activeLocationId !== undefined ? activeLocationId : storedLocationId();
  return queryOptions({
    queryKey: ["combos", "public", locationId ?? null],
    queryFn: () => getPublicCombos(locationId ?? undefined),
    staleTime: 1000 * 60 * 5,
  });
};

export const comboOpportunitiesOptions = (params = {}) =>
  queryOptions({
    queryKey: ["combo-opportunities", params],
    queryFn: () => listComboOpportunities(params),
    staleTime: 1000 * 60 * 2,
  });

export const missedOpportunitiesOptions = (locationId) => queryOptions({
  queryKey: ["combo-opportunities", "missed", locationId],
  queryFn: () => listMissedOpportunities(locationId),
  staleTime: 1000 * 60 * 5,
});
