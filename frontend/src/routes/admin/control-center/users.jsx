import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { ControlCenterUsers } from "@/components/admin/ControlCenter";
import { ROLE } from "@/lib/roles";
export const Route = createFileRoute("/admin/control-center/users")({ component: () => <RoleGuard roles={ROLE.SUPER_ADMIN}><ControlCenterUsers /></RoleGuard> });
