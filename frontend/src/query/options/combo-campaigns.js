import { queryOptions } from "@tanstack/react-query";
import {
  getActiveComboCampaigns,
  listComboCampaigns,
  getComboCampaign,
  evaluateComboCart,
} from "../../services/comboCampaignService";

export const activeComboCampaignsOptions = queryOptions({
  queryKey: ["combo-campaigns", "active"],
  queryFn: getActiveComboCampaigns,
  staleTime: 1000 * 60 * 5,
});

export const comboCampaignListOptions = queryOptions({
  queryKey: ["combo-campaigns", "admin-list"],
  queryFn: listComboCampaigns,
  staleTime: 1000 * 60,
});

export const comboCampaignOptions = (id) =>
  queryOptions({
    queryKey: ["combo-campaigns", id],
    queryFn: () => getComboCampaign(id),
    enabled: !!id,
    staleTime: 1000 * 60,
  });

export const comboCartEvaluationOptions = (payload) =>
  queryOptions({
    queryKey: ["combo-cart-eval", payload],
    queryFn: () => evaluateComboCart(payload),
    enabled: !!payload && Array.isArray(payload?.items) && payload.items.length > 0,
    staleTime: 0,
    retry: 1,
  });

