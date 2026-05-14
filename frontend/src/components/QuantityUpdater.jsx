import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react";

export default function QuantityUpdater({
  qty,
  onIncrease,
  onDecrease,
  className,
}) {
  return (
    <div
      className={cn(
        `grid grid-cols-[32px_6px_32px] h-8 place-items-center bg-white ease-out rounded-lg duration-200 w-32px border border-primary-foreground`,
        className,
      )}
    >
      <button
        onClick={onDecrease}
        className="flex size-full items-center justify-center text-lg text-gray-600"
        disabled={qty === 0}
      >
        <MinusIcon weight="bold" className="size-4" />
      </button>
      <span className="text-center text-sm font-semibold">{qty}</span>
      <button
        disabled={qty === 0}
        onClick={onIncrease}
        className="flex size-full aspect-square justify-center items-center text-lg text-gray-600"
      >
        <PlusIcon weight="bold" className="size-4" />
      </button>
    </div>
  );
}
