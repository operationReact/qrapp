import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { ControlCenterAccess } from "@/components/admin/ControlCenter";
import { ROLE } from "@/lib/roles";
export const Route = createFileRoute("/admin/control-center/access")({ component: () => <RoleGuard roles={ROLE.SUPER_ADMIN}><ControlCenterAccess /></RoleGuard> });
