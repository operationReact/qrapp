import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/analytics/")({
  beforeLoad: () => {
    return Route.redirect({
      to: "/admin/analytics/overview",
    });
  },
});
