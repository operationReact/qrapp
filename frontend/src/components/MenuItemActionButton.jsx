import { Button } from "./ui/button";
import QuantityUpdater from "./QuantityUpdater";
import { motion } from "motion/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PlusIcon } from "@phosphor-icons/react";

export default function ItemActionButton({ qty, onAdd, onDecrease }) {
  const isMobile = useIsMobile();
  const initialWidth = isMobile ? "32px" : "69.5px";

  return (
    <motion.div
      initial={{
        width: initialWidth,
        backgroundColor: "var(--primary-foreground)",
      }}
      animate={{
        width: qty > 0 ? "69.5px" : initialWidth,
        backgroundColor:
          qty > 0 ? "var(--color-white)" : "var(--primary-foreground)",
      }}
      className="h-8 shrink-0 shadow shadow-black/10 bg-primary rounded-lg overflow-hidden"
    >
      {qty === 0 ? (
        <Button
          className="rounded-lg bg-transparent text-primary text-sm! font-medium! h-8"
          style={{ width: initialWidth }}
          onClick={onAdd}
          disabled={qty > 0}
        >
          <PlusIcon weight="bold" className="size-4" />

          <span className="hidden md:inline animate-in transition-opacity duration-200">
            Add
          </span>
        </Button>
      ) : null}

      {qty > 0 && (
        <QuantityUpdater
          className="bg-transparent border-transparent"
          qty={qty}
          onIncrease={onAdd}
          onDecrease={onDecrease}
        />
      )}
    </motion.div>
  );
}
