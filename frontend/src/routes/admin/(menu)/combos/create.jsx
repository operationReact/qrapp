import ComboForm from "@/components/admin/combo/ComboForm";

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/(menu)/combos/create")({
  component: CreateComboPage,
});

export default function CreateComboPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <ComboForm />
    </div>
  );
}
