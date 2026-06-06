import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Coupon management has been consolidated into Promotions.
 * This route permanently redirects to /admin/promotions.
 */
export const Route = createFileRoute("/admin/(coupons)/coupons")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/promotions", replace: true });
  },
  component: () => null,
});

