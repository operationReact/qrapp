import { Loader2, AlertTriangle, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PanelLoading({ rows = 4, className }) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-[12px]" />
      ))}
    </div>
  );
}

export function InlineLoading({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--cc-muted-text)]">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function PanelError({ onRetry, message = "Something went wrong while loading this data." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-[var(--cc-border)] py-10 text-center">
      <AlertTriangle className="size-6 text-amber-500" aria-hidden="true" />
      <p className="max-w-sm text-sm text-[var(--cc-secondary-text)]">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PanelEmpty({ title = "Nothing here yet", description, icon = Inbox, action }) {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[var(--cc-border)] py-12 text-center">
      <div className="grid size-10 place-items-center rounded-lg bg-[var(--cc-primary-light)] text-[var(--cc-primary)]">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-[var(--cc-text)]">{title}</p>
      {description && <p className="max-w-sm text-xs text-[var(--cc-secondary-text)]">{description}</p>}
      {action}
    </div>
  );
}

// Convenience wrapper that picks the right state for a react-query result.
export function QueryBoundary({ query, loading, children, emptyWhen, empty }) {
  if (query.isLoading) return loading || <PanelLoading />;
  if (query.isError) return <PanelError onRetry={query.refetch} />;
  if (emptyWhen) return empty;
  return children;
}

const PILL_TONES = {
  success: "bg-[var(--cc-success-bg)] text-[var(--cc-success)]",
  danger: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-[var(--cc-primary-light)] text-[var(--cc-primary)]",
  muted: "bg-[#F3F1EF] text-[var(--cc-muted-text)]",
};

export function StatusPill({ tone = "muted", children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        PILL_TONES[tone] || PILL_TONES.muted,
      )}
    >
      {children}
    </span>
  );
}
