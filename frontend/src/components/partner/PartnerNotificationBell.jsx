import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { partnerNotificationUnreadCountOptions } from "@/query/options/partner-notifications";
import { unreadLabel } from "@/lib/partnerNotifications";

export function NotificationBell() {
  const { data } = useQuery(partnerNotificationUnreadCountOptions());
  const unread = Number(data?.unread) || 0;
  const badge = unreadLabel(unread);
  return (
    <Link to="/partner/notifications" className="partner-icon-button partner-notification-bell" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
      <Bell className="size-4" />
      {badge && <span className="partner-notification-badge" aria-hidden="true">{badge}</span>}
    </Link>
  );
}
