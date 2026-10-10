import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UserRound, UsersRound } from "lucide-react";
import { getPartnerPortal } from "@/services/partner-portal-service";
import { PartnerEmptyState, SectionHeader } from "@/routes/partner";

export const Route = createFileRoute("/partner/users")({ component: Users });
function Users() {
  const query = useQuery({ queryKey: ["partner-portal-me"], queryFn: getPartnerPortal, retry: false });
  if (query.isLoading) return <div className="partner-page-skeleton"><div /><div /></div>;
  if (query.isError) return <p className="partner-inline-error">Partner users are temporarily unavailable.</p>;
  const users = query.data?.users || [];
  return <section className="partner-route-page"><SectionHeader eyebrow="Account access" title="Users" /><p className="partner-route-description">People associated with your partner workspace.</p>{users.length ? <div className="partner-users-card"><table className="partner-data-table"><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Status</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name || "Unnamed user"}</strong></td><td>{user.role || "Partner user"}</td><td>{user.phone || "--"}</td><td><span className="partner-table-status">{user.active && user.userActive !== false ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table><div className="partner-user-mobile-list">{users.map((user) => <article key={user.id} className="partner-user-mobile-card"><div className="partner-user-avatar"><UserRound className="size-4" /></div><div><strong>{user.name || "Unnamed user"}</strong><span>{user.role || "Partner user"} · {user.phone || "--"}</span></div><em>{user.active && user.userActive !== false ? "Active" : "Inactive"}</em></article>)}</div></div> : <PartnerEmptyState icon={UsersRound} title="No active users" description="Partner users will appear here when access is assigned." />}</section>;
}
