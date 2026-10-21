import { queryOptions } from "@tanstack/react-query";
import {
  fetchAllSuggestions,
  fetchPendingSuggestions,
  fetchPendingCount,
  fetchRecommendationRules,
  fetchRuleStats,
} from "@/services/recommendation-service";

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

export const recommendationRulesOptions = (locationId) => queryOptions({
  queryKey: ["growth", "recommendation-rules", locationId],
  queryFn: () => fetchRecommendationRules(locationId),
  enabled: !!locationId,
  staleTime: 1000 * 60 * 2,
});

export const ruleStatsOptions = (locationId) => queryOptions({
  queryKey: ["growth", "recommendation-rule-stats", locationId],
  queryFn: () => fetchRuleStats(locationId),
  enabled: !!locationId,
  staleTime: 1000 * 60,
});
