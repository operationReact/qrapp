import { queryOptions } from "@tanstack/react-query";
import {
  fetchAllRecommendations,
  fetchAllSuggestions,
  fetchPendingSuggestions,
  fetchPendingCount,
  fetchAllUpsellRules,
  fetchAllCategoryPairings,
} from "@/services/recommendation-service";

export const recommendationsOptions = (locationId) => queryOptions({
  queryKey: ["growth", "recommendations", locationId],
  queryFn: () => fetchAllRecommendations(locationId),
  enabled: !!locationId,
  staleTime: 1000 * 60 * 2,
});

export const autoSuggestionsOptions = (locationId) => queryOptions({
  queryKey: ["growth", "suggestions", locationId],
  queryFn: () => fetchAllSuggestions(locationId),
  enabled: !!locationId,
  staleTime: 1000 * 60 * 2,
});

export const pendingSuggestionsOptions = (locationId) => queryOptions({
  queryKey: ["growth", "suggestions", "pending", locationId],
  queryFn: () => fetchPendingSuggestions(locationId),
  enabled: !!locationId,
  staleTime: 1000 * 60 * 2,
});

export const pendingCountOptions = (locationId) => queryOptions({
  queryKey: ["growth", "suggestions", "count", locationId],
  queryFn: () => fetchPendingCount(locationId),
  enabled: !!locationId,
  staleTime: 1000 * 60,
});

export const upsellRulesOptions = (locationId) => queryOptions({
  queryKey: ["growth", "upsell-rules", locationId],
  queryFn: () => fetchAllUpsellRules(locationId),
  enabled: !!locationId,
  staleTime: 1000 * 60 * 2,
});

export const categoryPairingsOptions = (locationId) => queryOptions({
  queryKey: ["growth", "category-pairings", locationId],
  queryFn: () => fetchAllCategoryPairings(locationId),
  enabled: !!locationId,
  staleTime: 1000 * 60 * 2,
});
