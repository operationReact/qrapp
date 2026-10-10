import { queryOptions } from "@tanstack/react-query";
import { getPartnerNotificationUnreadCount, getPartnerNotifications } from "@/services/partner-portal-service";

export const PARTNER_NOTIFICATIONS_KEY = ["partner-notifications"];

export const partnerNotificationsOptions = ({ unreadOnly = false, page = 0, size = 20 } = {}) => queryOptions({
  queryKey: [...PARTNER_NOTIFICATIONS_KEY, "list", { unreadOnly, page, size }],
  queryFn: () => getPartnerNotifications({ unreadOnly, page, size }),
  retry: false,
  placeholderData: (previous) => previous,
});

export const partnerNotificationUnreadCountOptions = () => queryOptions({
  queryKey: [...PARTNER_NOTIFICATIONS_KEY, "unread-count"],
  queryFn: getPartnerNotificationUnreadCount,
  retry: false,
  staleTime: 30_000,
  refetchInterval: 60_000,
});
