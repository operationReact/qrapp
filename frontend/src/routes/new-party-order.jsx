import { createFileRoute } from "@tanstack/react-router";
import NewPartyOrderPage from "@/pages/NewPartyOrderPage";

export const Route = createFileRoute("/new-party-order")({
  component: NewPartyOrderPage,
});
