import { queryOptions } from "@tanstack/react-query";
import {
  fetchAllRecommendations,
  fetchAllSuggestions,
  fetchPendingSuggestions,
  fetchPendingCount,
  fetchAllUpsellRules,
  fetchAllCategoryPairings,
} from "@/services/recommendation-service";

export const recommendationsOptions = queryOptions({
  queryKey: ["growth", "recommendations"],
  queryFn: fetchAllRecommendations,
  staleTime: 1000 * 60 * 2,
});

export const autoSuggestionsOptions = queryOptions({
  queryKey: ["growth", "suggestions"],
  queryFn: fetchAllSuggestions,
  staleTime: 1000 * 60 * 2,
});

export const pendingSuggestionsOptions = queryOptions({
  queryKey: ["growth", "suggestions", "pending"],
  queryFn: fetchPendingSuggestions,
  staleTime: 1000 * 60 * 2,
});

export const pendingCountOptions = queryOptions({
  queryKey: ["growth", "suggestions", "count"],
  queryFn: fetchPendingCount,
  staleTime: 1000 * 60,
});

export const upsellRulesOptions = queryOptions({
  queryKey: ["growth", "upsell-rules"],
  queryFn: fetchAllUpsellRules,
  staleTime: 1000 * 60 * 2,
});

export const categoryPairingsOptions = queryOptions({
  queryKey: ["growth", "category-pairings"],
  queryFn: fetchAllCategoryPairings,
  staleTime: 1000 * 60 * 2,
});
