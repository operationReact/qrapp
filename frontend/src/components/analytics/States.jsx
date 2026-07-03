import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }) {
  return (
    <div className={cn("animate-pulse space-y-3", className)}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title = "No data", description, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center gap-2 sm:gap-3 text-zinc-400">
      {Icon && (
        <Icon size={36} strokeWidth={1} className="text-zinc-300 dark:text-zinc-600" />
      )}
      <p className="text-xs sm:text-sm font-medium text-zinc-500">{title}</p>
      {description && (
        <p className="text-[11px] sm:text-xs max-w-xs text-zinc-400">{description}</p>
      )}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center gap-3">
      <p className="text-xs sm:text-sm text-red-500 font-medium">{message}</p>
      {onRetry && (
        /* min-h-[44px] ensures 44px touch target */
        <button
          onClick={onRetry}
          className="text-xs text-primary underline hover:no-underline min-h-[44px] px-4"
        >
          Try again
        </button>
      )}
    </div>
  );
}
