import { Button } from "./ui/button";
import QuantityUpdater from "@/components/shared/QuantityUpdater";
import { motion } from "motion/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PlusIcon } from "@phosphor-icons/react";

const MotionDiv = motion.div;

export default function ItemActionButton({ qty, onAdd, onDecrease }) {
  const isMobile = useIsMobile();
  const initialWidth = isMobile ? "32px" : "69.5px";

  return (
    <MotionDiv
      initial={{
        width: initialWidth,
        backgroundColor: "var(--primary-foreground)",
      }}
      animate={{
        width: qty > 0 ? "69.5px" : initialWidth,
        backgroundColor:
          qty > 0 ? "var(--color-white)" : "var(--primary-foreground)",
      }}
      className="h-8 shrink-0 shadow shadow-black/10 bg-primary rounded-md overflow-hidden"
    >
      {qty === 0 ? (
        <Button
          variant="secondary"
          className="rounded-md bg-transparent text-primary h-8"
          style={{ width: initialWidth }}
          onClick={onAdd}
          disabled={qty > 0}
        >
          <PlusIcon weight="bold" className="size-4" />

          <span className="hidden lg:inline animate-in transition-opacity duration-200">
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
    </MotionDiv>
  );
}
