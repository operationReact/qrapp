import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { CustomerCompanies } from "@/components/admin/ControlCenter";
import { ROLE } from "@/lib/roles";

export const Route = createFileRoute("/admin/customer-companies")({
  component: () => <RoleGuard roles={ROLE.SUPER_ADMIN}><CustomerCompanies /></RoleGuard>,
});
