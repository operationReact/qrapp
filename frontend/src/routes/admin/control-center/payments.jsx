import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { ControlCenterPayments } from "@/components/admin/ControlCenter";
import { ROLE } from "@/lib/roles";
export const Route = createFileRoute("/admin/control-center/payments")({ component: () => <RoleGuard roles={ROLE.SUPER_ADMIN}><ControlCenterPayments /></RoleGuard> });
