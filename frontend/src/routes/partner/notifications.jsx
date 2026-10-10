import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BellOff, ChevronRight, CheckCheck, CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/partnerFinance";
import { NOTIFICATION_PAGE_SIZE, notificationErrorMessage, safePartnerPath } from "@/lib/partnerNotifications";
import { PARTNER_NOTIFICATIONS_KEY, partnerNotificationsOptions, partnerNotificationUnreadCountOptions } from "@/query/options/partner-notifications";
import { markAllPartnerNotificationsRead, markPartnerNotificationRead } from "@/services/partner-portal-service";

export const Route = createFileRoute("/partner/notifications")({ component: PartnerNotifications });

function PartnerNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const list = useQuery(partnerNotificationsOptions({ unreadOnly, page, size: NOTIFICATION_PAGE_SIZE }));
  const count = useQuery(partnerNotificationUnreadCountOptions());
  const unread = Number(count.data?.unread) || 0;
  const refresh = () => queryClient.invalidateQueries({ queryKey: PARTNER_NOTIFICATIONS_KEY });
  const markRead = useMutation({ mutationFn: markPartnerNotificationRead, onSuccess: refresh });
  const markAll = useMutation({
    mutationFn: markAllPartnerNotificationsRead,
    onSuccess: () => { toast.success("All notifications marked as read"); return refresh(); },
    onError: () => toast.error("Notifications could not be updated. Please try again."),
  });
  const items = list.data?.content || [];
  const totalPages = list.data?.totalPages || 1;
  const chooseFilter = (value) => { setUnreadOnly(value); setPage(0); };

  const open = async (item) => {
    const path = safePartnerPath(item.targetPath);
    if (!item.read) {
      try { await markRead.mutateAsync(item.id); } catch { toast.error("The notification could not be marked as read."); }
    }
    if (path) navigate({ to: path });
  };

  return (
    <section className="partner-analytics-page partner-notif-page">
      <div className="partner-analytics-heading">
        <div><p className="partner-eyebrow">Notifications</p><h1>Notification center</h1><p>{unread ? `${unread} unread` : "You're all caught up"}</p></div>
        <div className="partner-notif-toolbar">
          <div className="partner-notif-filter" role="group" aria-label="Filter notifications">
            <button type="button" aria-pressed={!unreadOnly} className={!unreadOnly ? "is-active" : ""} onClick={() => chooseFilter(false)}>All</button>
            <button type="button" aria-pressed={unreadOnly} className={unreadOnly ? "is-active" : ""} onClick={() => chooseFilter(true)}>Unread</button>
          </div>
          <Button type="button" variant="outline" onClick={() => markAll.mutate()} disabled={!unread || markAll.isPending}>
            {markAll.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}Mark all as read
          </Button>
        </div>
      </div>
      {list.isLoading ? (
        <div className="partner-notif-skeleton" aria-busy="true"><div /><div /><div /></div>
      ) : list.isError ? (
        <div className="partner-inline-error partner-rpt-error" role="alert">
          <p><CircleAlert className="size-4 shrink-0" />{notificationErrorMessage(list.error)}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => list.refetch()}>Retry</Button>
        </div>
      ) : !items.length ? (
        <div className="partner-notif-empty">
          <BellOff className="size-5" />
          <h2>{unreadOnly ? "No unread notifications" : "No notifications yet"}</h2>
          <p>{unreadOnly ? "You have read everything." : "Settlement updates will appear here when they happen."}</p>
          {page > 0 && <Button type="button" variant="outline" size="sm" onClick={() => setPage(0)}>Back to first page</Button>}
        </div>
      ) : (
        <>
          <ul className="partner-notif-list">
            {items.map((item) => {
              const path = safePartnerPath(item.targetPath);
              return (
                <li key={item.id} className={`partner-notif-item ${item.read ? "" : "is-unread"}`}>
                  <button type="button" className="partner-notif-main" onClick={() => open(item)}>
                    <span className="partner-notif-dot" aria-hidden="true" />
                    <span className="partner-notif-copy">
                      <strong>{item.title}{!item.read && <span className="sr-only"> (unread)</span>}</strong>
                      <span>{item.message}</span>
                      <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                    </span>
                    {path && <ChevronRight className="size-4 shrink-0 opacity-50" aria-hidden="true" />}
                  </button>
                  {!item.read && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => markRead.mutate(item.id)} disabled={markRead.isPending}>Mark read</Button>
                  )}
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && (
            <nav className="partner-notif-pager" aria-label="Notification pages">
              <Button type="button" variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 0}>Previous</Button>
              <span>Page {page + 1} of {totalPages}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page + 1 >= totalPages}>Next</Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
