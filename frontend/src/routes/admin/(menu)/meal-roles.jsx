import { createFileRoute, Navigate } from "@tanstack/react-router";

function MealRolesRedirect() {
  return <Navigate to="/admin/manage-menu" replace />;
}

export const Route = createFileRoute("/admin/(menu)/meal-roles")({
  component: MealRolesRedirect,
});
