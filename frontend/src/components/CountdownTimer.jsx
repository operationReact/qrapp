import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

/**
 * CountdownTimer
 *
 * Compact right-slot timer for FeaturedSegmentHeader.
 * Renders on light warm backgrounds — uses near-black text with
 * accent-tinted pill. No white-on-dark styles.
 */
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
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none",
          className,
        )}
        style={{
          background: "rgba(0,0,0,0.05)",
          color: "#6B7280",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {expiredLabel}
      </span>
    );
  }

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${String(hours).padStart(2, "0")}h`);
  parts.push(`${String(minutes).padStart(2, "0")}m`);
  parts.push(`${String(seconds).padStart(2, "0")}s`);

  return (
    <div className={cn("flex flex-col items-end gap-0.5", className)}>
      {label && (
        <span
          className="text-[9px] font-semibold uppercase tracking-widest leading-none"
          style={{ color: "#9CA3AF" }}
        >
          {label}
        </span>
      )}
      <span
        className="tabular-nums rounded-full px-2.5 py-1 text-[11px] font-bold leading-none"
        style={{
          background: "rgba(0,0,0,0.05)",
          color: "#374151",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {parts.join(" : ")}
      </span>
    </div>
  );
}
