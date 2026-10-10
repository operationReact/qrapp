import { queryOptions } from "@tanstack/react-query";
import { getPartnerReportCatalog, getPartnerReportSummary } from "@/services/partner-portal-service";

export const PARTNER_REPORTS_KEY = ["partner-reports"];

export const partnerReportCatalogOptions = () => queryOptions({
  queryKey: [...PARTNER_REPORTS_KEY, "catalog"],
  queryFn: getPartnerReportCatalog,
  retry: false,
  staleTime: 5 * 60_000,
});

/** `params` is the backend query shape from reportParams(): { locationId, from, to }. */
export const partnerReportSummaryOptions = (type, params, { enabled = true } = {}) => queryOptions({
  queryKey: [...PARTNER_REPORTS_KEY, "summary", type, params.locationId || null, params.from, params.to],
  queryFn: () => getPartnerReportSummary(type, params),
  retry: false,
  staleTime: 60_000,
  enabled,
});
