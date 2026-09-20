import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { ControlCenterOverview } from "@/components/admin/ControlCenter";
import { ROLE } from "@/lib/roles";
export const Route = createFileRoute("/admin/control-center/")({ component: () => <RoleGuard roles={ROLE.SUPER_ADMIN}><ControlCenterOverview /></RoleGuard> });
