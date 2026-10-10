import { queryOptions } from "@tanstack/react-query";
import {
  getPartnerInsightsEngagement,
  getPartnerInsightsFeedback,
  getPartnerInsightsMenu,
  getPartnerInsightsOverview,
} from "@/services/partner-portal-service";

const key = (kind, params) => ["partner-insights", kind, params.locationId || null, params.startDate, params.endDate];
export const partnerInsightsOverviewOptions = (params) => queryOptions({
  queryKey: key("overview", params),
  queryFn: () => getPartnerInsightsOverview(params),
  retry: false,
});
export const partnerInsightsEngagementOptions = (params) => queryOptions({
  queryKey: key("engagement", params),
  queryFn: () => getPartnerInsightsEngagement(params),
  retry: false,
});
export const partnerInsightsMenuOptions = (params) => queryOptions({
  queryKey: key("menu", params),
  queryFn: () => getPartnerInsightsMenu(params),
  retry: false,
});
export const partnerInsightsFeedbackOptions = (params) => queryOptions({
  queryKey: key("feedback", params),
  queryFn: () => getPartnerInsightsFeedback(params),
  retry: false,
});
