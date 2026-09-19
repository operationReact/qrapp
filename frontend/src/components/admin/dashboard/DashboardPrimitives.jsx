import { Link } from "@tanstack/react-router";
import { createElement } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export const formatCurrency = (value, compact = false) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(Number(value));
};

export const formatNumber = (value) =>
  value == null || Number.isNaN(Number(value))
    ? "—"
    : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value));

export const formatPercent = (value) =>
  value == null || Number.isNaN(Number(value)) ? "—" : `${Number(value).toFixed(1)}%`;

export const formatTrend = (current, previous) => {
  if (current == null || previous == null || Number(previous) === 0) return null;
  return ((Number(current) - Number(previous)) / Number(previous)) * 100;
};

export const formatHour = (hour) => {
  const value = Number(hour);
  if (value === 0) return "12 AM";
  if (value === 12) return "12 PM";
  return value < 12 ? `${value} AM` : `${value - 12} PM`;
};

export function Panel({ children, className }) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_3px_14px_rgba(24,24,27,.03)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({ eyebrow, title, action, to }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{eyebrow}</p>
        )}
        <h2 className="mt-1 text-[15px] font-bold tracking-tight text-zinc-950">{title}</h2>
      </div>
      {action && to && (
        <Link
          to={to}
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {action}
          <ChevronRight size={13} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function PanelHeader({ children, action, to }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
      <h2 className="text-[15px] font-bold tracking-tight text-zinc-950">{children}</h2>
      {action && to && (
        <Link
          to={to}
          className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {action}
          <ChevronRight size={13} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-lg bg-zinc-100", className)} aria-hidden="true" />;
}

export function LoadingRows({ count = 3 }) {
  return (
    <div className="space-y-3 p-4 sm:p-5" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = CheckCircle2, title, description }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center px-4 py-7 text-center">
      {createElement(Icon, { size: 20, className: "mb-2 text-zinc-300", "aria-hidden": true })}
      <p className="text-sm font-semibold text-zinc-700">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-zinc-400">{description}</p>}
    </div>
  );
}

export function ErrorState({ message = "Unable to load this section.", onRetry }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center px-4 py-7 text-center">
      <AlertCircle size={20} className="mb-2 text-red-400" aria-hidden="true" />
      <p className="text-sm font-semibold text-zinc-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <RefreshCw size={13} aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}

export function Trend({ value, label = "vs previous period" }) {
  if (value == null) return <span className="text-xs text-zinc-400">No comparison</span>;
  const positive = Number(value) >= 0;
  return (
    <span className={cn("text-xs font-semibold", positive ? "text-emerald-600" : "text-red-500")}>
      {positive ? "↑" : "↓"} {Math.abs(Number(value)).toFixed(1)}% {label}
    </span>
  );
}
