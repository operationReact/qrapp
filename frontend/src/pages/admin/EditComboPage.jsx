import { useParams } from "react-router-dom";

import ComboForm from "./ComboForm";

export default function EditComboPage() {

    const { id } = useParams();

    return (
        <div className="min-h-screen bg-zinc-50">
            <ComboForm comboId={id} />
        </div>
    );
}