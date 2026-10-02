import { queryOptions } from "@tanstack/react-query";
import { getHomeCampaignFeed, listHomeCampaigns } from "../../services/homeCampaignService";

/** Customer-facing Home feed — active, in-schedule, location-scoped campaigns. */
export const homeCampaignFeedOptions = (locationId) =>
  queryOptions({
    queryKey: ["home-campaigns", "feed", locationId ?? "global"],
    queryFn: () => getHomeCampaignFeed(locationId),
    staleTime: 1000 * 60,
  });

/** Admin list — all non-deleted campaigns visible to the caller's location scope. */
export const homeCampaignAdminListOptions = (locationId) =>
  queryOptions({
    queryKey: ["home-campaigns", "admin-list", locationId ?? "all"],
    queryFn: () => listHomeCampaigns(locationId),
    staleTime: 1000 * 30,
  });
