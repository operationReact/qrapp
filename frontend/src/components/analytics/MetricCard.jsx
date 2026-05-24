import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MetricCard – shows a single KPI with optional trend indicator.
 *
 * Props:
 *   title       string
 *   value       string | number
 *   subtitle    string  (optional)
 *   icon        ReactNode (optional)
 *   trend       number  (positive = up, negative = down, undefined = neutral)
 *   trendLabel  string  (optional, e.g. "vs yesterday")
 *   loading     bool
 *   className   string
 */
export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  loading = false,
  className,
}) {
  const trendColor =
    trend === undefined || trend === null
      ? "text-zinc-400"
      : trend > 0
      ? "text-emerald-500"
      : trend < 0
      ? "text-red-500"
      : "text-zinc-400";

  const TrendIcon =
    trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        // responsive padding + min-w-0 prevents flex-child overflow
        "min-w-0 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 p-3 sm:p-5 shadow-sm hover:shadow-md transition-shadow",
        className
      )}
    >
      {loading ? (
        <div className="space-y-2 sm:space-y-3 animate-pulse">
          <div className="h-2.5 w-16 sm:w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
          <div className="h-6 sm:h-7 w-20 sm:w-32 bg-zinc-100 dark:bg-zinc-800 rounded" />
          <div className="h-2.5 w-14 sm:w-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
            {/* min-w-0 + truncate prevent title overflow */}
            <span className="min-w-0 truncate text-[10px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide leading-tight">
              {title}
            </span>
            {icon && (
              <div className="flex-shrink-0 size-7 sm:size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {icon}
              </div>
            )}
          </div>
          {/* truncate long formatted currency values on narrow cards */}
          <div className="truncate text-lg sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1 leading-tight">
            {value ?? "—"}
          </div>
          {(trend !== undefined || subtitle || trendLabel) && (
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mt-1">
              {trend !== undefined && trend !== null && (
                <span className={cn("flex items-center gap-0.5 text-[10px] sm:text-xs font-medium", trendColor)}>
                  <TrendIcon size={11} />
                  {Math.abs(trend)}%
                </span>
              )}
              {trendLabel && (
                <span className="text-[10px] sm:text-xs text-zinc-400 truncate">{trendLabel}</span>
              )}
              {subtitle && !trendLabel && (
                <span className="text-[10px] sm:text-xs text-zinc-400 truncate">{subtitle}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
