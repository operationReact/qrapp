import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PartnerDashboard } from "@/routes/partner";
import { getPartnerDashboard } from "@/services/partner-portal-service";

export const Route = createFileRoute("/partner/")({ component: () => <DashboardRoute /> });
function DashboardRoute() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["partner-dashboard"], queryFn: getPartnerDashboard, retry: false });
  if (isLoading) return <div className="partner-page-skeleton"><div /><div /><div /></div>;
  if (isError || !data) return <p className="partner-inline-error">Dashboard data is temporarily unavailable.</p>;
  return <PartnerDashboard dashboard={data} />;
}
