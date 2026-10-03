import { createFileRoute } from "@tanstack/react-router";

import { RoleGuard } from "@/components/RoleGuard";
import { ROLE } from "@/lib/roles";
import { FoodCourtDashboard } from "@/features/food-court/FoodCourtDashboard";

export const Route = createFileRoute("/admin/(foodcourt)/food-court")({
  component: FoodCourtRoute,
});

function FoodCourtRoute() {
  return (
    <RoleGuard roles={[ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER]}>
      <FoodCourtDashboard />
    </RoleGuard>
  );
}
