import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/customer-companies")({
  component: () => <Navigate to="/admin/control-center/customer-companies" replace />,
});
