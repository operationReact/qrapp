import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

export default function CountdownTimer({
  targetDate,
  label,
  expiredLabel = "Expired",
  className,
}) {
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
    <div className={cn("text-xs md:text-sm grid gap-0.5", className)}>
      {label && <span className="text-muted-foreground">{label}</span>}
      <div className="tabular-nums flex justify-center bg-white p-0.5 rounded border-muted shadow-xs gap-0.5 font-medium text-primary">
        {parts.map((part, index) => (
          <span key={index} className="rounded">
            {part} {index < parts.length - 1 && ":"}
          </span>
        ))}
      </div>
    </div>
  );
}
