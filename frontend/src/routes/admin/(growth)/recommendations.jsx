import { createFileRoute, redirect } from "@tanstack/react-router";

// The "Pairing Explorer" page has been removed.
// Any link to /admin/recommendations is forwarded to Item Pairings.
export const Route = createFileRoute("/admin/(growth)/recommendations")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/item-recommendations", replace: true });
  },
  component: () => null,
});
