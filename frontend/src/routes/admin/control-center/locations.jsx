import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { ControlCenterLocations } from "@/components/admin/ControlCenter";
import { ROLE } from "@/lib/roles";
export const Route = createFileRoute("/admin/control-center/locations")({ component: () => <RoleGuard roles={ROLE.SUPER_ADMIN}><ControlCenterLocations /></RoleGuard> });
