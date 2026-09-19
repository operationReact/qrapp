import { createFileRoute, Navigate } from "@tanstack/react-router";

// Keep the former URL as a deep-link-safe compatibility redirect. The queue
// itself has one source of truth at /admin/kitchen-queue.
export const Route = createFileRoute("/admin/(orders)/operational-queue")({
  component: () => <Navigate to="/admin/kitchen-queue" replace />,
});
