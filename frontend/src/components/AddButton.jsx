import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "./ui/button";
import QuantityUpdater from "./QuantityUpdater";

export default function ItemActionButton({ qty, onAdd, onDecrease }) {
  return (
    <div className="tabular-nums rounded-lg overflow-hidden shrink-0 h-10">
      <Button
        variant="outline"
        className="rounded-lg w-full h-full bg-white font-semibold! border border-primary-foreground"
        onClick={onAdd}
        disabled={qty > 0}
      >
        <PlusIcon className="size-5" />{" "}
        <span>Add</span>
      </Button>
      <QuantityUpdater qty={qty} onIncrease={onAdd} onDecrease={onDecrease} className={qty > 0 && "-translate-y-full"}/>
    </div>
  );
}
