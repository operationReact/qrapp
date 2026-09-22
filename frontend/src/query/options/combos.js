import { queryOptions } from "@tanstack/react-query";
import {
  getPublicCombos,
  getComboAnalyticsSummary,
  listCombos,
  getCombo,
  listSignatureProducts,
  listComboOpportunities,
  listMissedOpportunities,
} from "../../services/comboService";

const storedLocationId = () => {
  try {
    return JSON.parse(localStorage.getItem("active-location") || "null")?.id ?? null;
  } catch {
    return null;
  }
};

export const publicCombosOptions = queryOptions({
  queryKey: ["combos", "public"],
  queryFn: getPublicCombos,
  staleTime: 1000 * 60 * 5,
});

export const comboSummaryOptions = (activeLocationId) => {
  const locationId = activeLocationId !== undefined ? activeLocationId : storedLocationId();
  return queryOptions({
    queryKey: ["combos", "summary", locationId ?? null],
    queryFn: () => getComboAnalyticsSummary(locationId ?? undefined),
    staleTime: 1000 * 60 * 2,
  });
};

export const comboListOptions = (params = {}) =>
  queryOptions({
    queryKey: ["combos", "list", params],
    queryFn: () => listCombos(params),
    staleTime: 1000 * 60,
  });

export const comboOptions = (id) =>
  queryOptions({
    queryKey: ["combos", id],
    queryFn: () => getCombo(id),
    enabled: !!id,
    staleTime: 1000 * 60,
  });

export const signatureProductListOptions = (params = {}) =>
  queryOptions({
    queryKey: ["signature-products", "list", params],
    queryFn: () => listSignatureProducts(params),
    staleTime: 1000 * 60 * 2,
  });

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
