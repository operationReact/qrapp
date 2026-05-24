import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

/**
 * ChartContainer – wraps a chart with a title, optional subtitle and loading/error states.
 */
export default function ChartContainer({
  title,
  subtitle,
  loading = false,
  error = null,
  onRetry,
  children,
  className,
  action,
}) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 p-3 sm:p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-snug">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40 sm:h-52 animate-pulse">
          <div className="w-full h-full bg-zinc-50 dark:bg-zinc-800 rounded-lg" />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center h-40 sm:h-52 gap-2 text-zinc-400">
          <p className="text-xs sm:text-sm">Failed to load chart data</p>
          {onRetry && (
            /* min-h-[44px] ensures 44 px touch target */
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-xs text-primary hover:underline min-h-[44px] px-3"
            >
              <RefreshCw size={12} /> Retry
            </button>
          )}
        </div>
      )}

      {!loading && !error && children}
    </div>
  );
}
