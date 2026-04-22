import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";

export default function QuantityUpdater({
  qty,
  onIncrease,
  onDecrease,
  className,
}) {
  return (
    <div
      className={cn(
        `flex bg-white ease-out rounded-lg duration-200 items-center justify-between w-full h-full border border-red-100`,
        className,
      )}
    >
      <button
        onClick={onDecrease}
        className="flex w-8 h-full aspect-square items-center justify-center text-lg text-gray-600"
        disabled={qty === 0}
      >
        <MinusIcon className="size-5" />
      </button>
      <span className="min-w-6 text-center text-base font-semibold">{qty}</span>
      <button
        disabled={qty === 0}
        onClick={onIncrease}
        className="flex w-8 h-full aspect-square items-center justify-center text-lg text-gray-600"
      >
        <PlusIcon className="size-5" />
      </button>
    </div>
  );
}
