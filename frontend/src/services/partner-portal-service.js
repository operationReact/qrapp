import { apiClient } from "@/services";
import { getPartnerLogoUrl } from "@/lib/partnerBranding";

export const getPartnerPortal = () => apiClient.get("/api/v1/partner/me").then((response) => {
  const data = response.data;
  const partner = data.portal?.partner || data.partner;
  return {
    ...data,
    portal: {
      ...data.portal,
      partner: {
        ...partner,
        logoUrl: getPartnerLogoUrl(partner),
      },
    },
  };
});
export const getPartnerDashboard = () => apiClient.get("/api/v1/partner/dashboard").then((response) => response.data);
export const getPartnerPortalLocation = (id) => apiClient.get(`/api/v1/partner/locations/${id}`).then((response) => response.data);
export const getPartnerLocationUsers = (id) => apiClient.get(`/api/v1/partner/locations/${id}/users`).then((response) => response.data);
export const getPartnerMenu = (locationId) => apiClient.get(`/api/v1/partner/locations/${locationId}/menu`).then((response) => response.data);
export const getPartnerOrders = ({ locationId, page = 0 } = {}) => apiClient.get("/api/v1/partner/orders", { params: { locationId, page, size: 20 } }).then((response) => response.data);
export const getPartnerOrder = (id) => apiClient.get(`/api/v1/partner/orders/${id}`).then((response) => response.data);
export const getPartnerAnalyticsOverview = ({ locationId, startDate, endDate }) => apiClient
  .get("/api/v1/partner/analytics/overview", { params: { locationId, startDate, endDate } })
  .then((response) => response.data);
const partnerInsightParams = ({ locationId, startDate, endDate }) => ({ locationId, startDate, endDate });
export const getPartnerInsightsOverview = (params) => apiClient
  .get("/api/v1/partner/insights/overview", { params: partnerInsightParams(params) }).then((response) => response.data);
export const getPartnerInsightsEngagement = (params) => apiClient
  .get("/api/v1/partner/insights/engagement", { params: partnerInsightParams(params) }).then((response) => response.data);
export const getPartnerInsightsMenu = (params) => apiClient
  .get("/api/v1/partner/insights/menu", { params: partnerInsightParams(params) }).then((response) => response.data);
export const getPartnerInsightsFeedback = (params) => apiClient
  .get("/api/v1/partner/insights/feedback", { params: partnerInsightParams(params) }).then((response) => response.data);
const financeBase = "/api/v1/partner/finance";
const financeData = (response) => response.data;
export const getPartnerFinanceAgreements = () => apiClient.get(`${financeBase}/agreements`).then(financeData);
export const getPartnerFinanceCurrentAgreement = () => apiClient.get(`${financeBase}/agreements/current`).then(financeData);
export const getPartnerFinanceSummary = () => apiClient.get(`${financeBase}/summary`).then(financeData);
export const getPartnerFinancePreview = (period) => apiClient.get(`${financeBase}/preview`, { params: { period } }).then(financeData);
export const getPartnerSettlements = ({ page = 0, size = 20, status } = {}) => apiClient
  .get(`${financeBase}/settlements`, { params: { page, size, status: status || undefined } }).then(financeData);
export const getPartnerSettlement = (id) => apiClient.get(`${financeBase}/settlements/${id}`).then(financeData);
export const getPartnerSettlementLineItems = (id, { page = 0, size = 20, locationId } = {}) => apiClient
  .get(`${financeBase}/settlements/${id}/line-items`, { params: { page, size, locationId: locationId || undefined } }).then(financeData);
export const getPartnerSettlementAudit = (id) => apiClient.get(`${financeBase}/settlements/${id}/audit`).then(financeData);
export const downloadPartnerSettlementStatement = (id) => apiClient
  .get(`${financeBase}/settlements/${id}/statement.pdf`, { responseType: "blob" }).then((response) => response.data);
export const generatePartnerSettlement = (body) => apiClient.post(`${financeBase}/settlements`, body).then(financeData);
export const recalculatePartnerSettlement = (id) => apiClient.post(`${financeBase}/settlements/${id}/recalculate`).then(financeData);
export const addPartnerSettlementAdjustment = (id, body) => apiClient.post(`${financeBase}/settlements/${id}/adjustments`, body).then(financeData);
export const approvePartnerSettlement = (id) => apiClient.post(`${financeBase}/settlements/${id}/approve`).then(financeData);
export const markPartnerSettlementPaid = (id, body) => apiClient.post(`${financeBase}/settlements/${id}/mark-paid`, body).then(financeData);
export const voidPartnerSettlement = (id, body) => apiClient.post(`${financeBase}/settlements/${id}/void`, body).then(financeData);
const reportsBase = "/api/v1/partner/reports";
const notificationsBase = "/api/v1/partner/notifications";
const reportQuery = ({ locationId, from, to }) => ({ locationId: locationId || undefined, from, to });
// Blob responses hide the JSON error body; parse it so callers can map the backend error code.
const parseBlobError = async (error) => {
  const body = error?.response?.data;
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    try { error.response.data = JSON.parse(await body.text()); } catch { error.response.data = {}; }
  }
  throw error;
};
export const getPartnerReportCatalog = () => apiClient.get(reportsBase).then((response) => response.data);
export const getPartnerReportSummary = (type, params) => apiClient
  .get(`${reportsBase}/${encodeURIComponent(type)}/summary`, { params: reportQuery(params) }).then((response) => response.data);
export const downloadPartnerReportCsv = (type, params) => apiClient
  .get(`${reportsBase}/${encodeURIComponent(type)}/export.csv`, { params: reportQuery(params), responseType: "blob" })
  .catch(parseBlobError);
export const downloadPartnerExecutivePdf = (params) => apiClient
  .get(`${reportsBase}/executive.pdf`, { params: reportQuery(params), responseType: "blob" })
  .catch(parseBlobError);
export const getPartnerNotifications = ({ unreadOnly = false, page = 0, size = 20 } = {}) => apiClient
  .get(notificationsBase, { params: { unreadOnly, page, size } }).then((response) => response.data);
export const getPartnerNotificationUnreadCount = () => apiClient.get(`${notificationsBase}/unread-count`).then((response) => response.data);
export const markPartnerNotificationRead = (id) => apiClient.patch(`${notificationsBase}/${id}/read`).then((response) => response.data);
export const markAllPartnerNotificationsRead = () => apiClient.post(`${notificationsBase}/read-all`).then((response) => response.data);
