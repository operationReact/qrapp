import { queryOptions } from "@tanstack/react-query";
import {
  getPartnerFinanceAgreements,
  getPartnerFinanceCurrentAgreement,
  getPartnerFinancePreview,
  getPartnerFinanceSummary,
  getPartnerSettlement,
  getPartnerSettlementAudit,
  getPartnerSettlementLineItems,
  getPartnerSettlements,
} from "@/services/partner-portal-service";

export const PARTNER_FINANCE_KEY = ["partner-finance"];

export const partnerFinanceSummaryOptions = () => queryOptions({
  queryKey: [...PARTNER_FINANCE_KEY, "summary"],
  queryFn: getPartnerFinanceSummary,
  retry: false,
});
export const partnerFinanceAgreementsOptions = () => queryOptions({
  queryKey: [...PARTNER_FINANCE_KEY, "agreements"],
  queryFn: getPartnerFinanceAgreements,
  retry: false,
});
export const partnerFinanceCurrentAgreementOptions = () => queryOptions({
  queryKey: [...PARTNER_FINANCE_KEY, "agreement-current"],
  queryFn: getPartnerFinanceCurrentAgreement,
  retry: false,
});
export const partnerFinancePreviewOptions = (period) => queryOptions({
  queryKey: [...PARTNER_FINANCE_KEY, "preview", period],
  queryFn: () => getPartnerFinancePreview(period),
  retry: false,
});
export const partnerSettlementsOptions = ({ page = 0, size = 20, status } = {}) => queryOptions({
  queryKey: [...PARTNER_FINANCE_KEY, "settlements", { page, size, status: status || null }],
  queryFn: () => getPartnerSettlements({ page, size, status }),
  retry: false,
  placeholderData: (previous) => previous,
});
export const partnerSettlementOptions = (id) => queryOptions({
  queryKey: [...PARTNER_FINANCE_KEY, "settlement", String(id)],
  queryFn: () => getPartnerSettlement(id),
  retry: false,
});
export const partnerSettlementLineItemsOptions = (id, { page = 0, size = 20, locationId } = {}) => queryOptions({
  queryKey: [...PARTNER_FINANCE_KEY, "line-items", String(id), { page, size, locationId: locationId || null }],
  queryFn: () => getPartnerSettlementLineItems(id, { page, size, locationId }),
  retry: false,
  placeholderData: (previous) => previous,
});
export const partnerSettlementAuditOptions = (id) => queryOptions({
  queryKey: [...PARTNER_FINANCE_KEY, "audit", String(id)],
  queryFn: () => getPartnerSettlementAudit(id),
  retry: false,
});
