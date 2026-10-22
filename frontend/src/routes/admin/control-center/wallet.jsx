import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { ControlCenterWallet } from "@/components/admin/ControlCenter";
import { ROLE } from "@/lib/roles";
export const Route = createFileRoute("/admin/control-center/wallet")({ component: () => <RoleGuard roles={ROLE.SUPER_ADMIN}><ControlCenterWallet /></RoleGuard> });
