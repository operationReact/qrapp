import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

/**
 * Reusable countdown timer component.
 * Props:
 *  - targetDate: ISO string
 *  - label: string shown above the timer
 *  - expiredLabel: string shown when expired
 *  - className: extra CSS classes
 */
export default function CountdownTimer({ targetDate, label, expiredLabel = "Expired", className }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(targetDate);

  if (!targetDate) return null;

  if (expired) {
    return (
      <div className={cn("text-destructive text-xs font-medium", className)}>
        {expiredLabel}
      </div>
    );
  }

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${String(hours).padStart(2, "0")}h`);
  parts.push(`${String(minutes).padStart(2, "0")}m`);
  parts.push(`${String(seconds).padStart(2, "0")}s`);

  return (
    <div className={cn("text-xs", className)}>
      {label && <span className="text-muted-foreground mr-1">{label}</span>}
      <span className="font-mono font-semibold tabular-nums text-foreground">
        {parts.join(" ")}
      </span>
    </div>
  );
}

