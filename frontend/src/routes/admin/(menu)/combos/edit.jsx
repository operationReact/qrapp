import ComboForm from "@/components/admin/combo/ComboForm";
import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/(menu)/combos/edit")({
  component: EditComboPage,
});

export default function EditComboPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-zinc-50">
      <ComboForm comboId={id} />
    </div>
  );
}
