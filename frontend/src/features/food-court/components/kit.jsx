import { useEffect, useId, useState } from "react";
import { AlertTriangle, Inbox, MoreVertical, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { formatCompactCurrency, formatCurrency } from "../format";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");

// Surfaces ------------------------------------------------------------

export function Surface({ className, children, ...props }) {
  return (
    <div
      className={cn("rounded-[16px] border border-[var(--cc-border)] bg-white", className)}
      {...props}
    >
      {children}
    </div>
  );
}

// A whole-card click target. When `menu` is supplied it sits above the button so
// the card stays a valid (non-nested) interactive element.
export function PressCard({ onClick, children, className, label, menu }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          "block w-full cursor-pointer rounded-[16px] border border-[var(--cc-border)] bg-white p-3.5 text-left transition",
          "hover:border-[var(--cc-primary)]/40 hover:shadow-sm active:scale-[0.99] active:bg-[var(--cc-page)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]",
          menu && "pr-12",
          className,
        )}
      >
        {children}
      </button>
      {menu && <div className="absolute right-1 top-1">{menu}</div>}
    </div>
  );
}

export function KebabMenu({ items, label = "More actions" }) {
  const visible = items.filter(Boolean);
  if (!visible.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className="grid size-11 cursor-pointer place-items-center rounded-xl text-[var(--cc-secondary-text)] hover:bg-[var(--cc-page)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]"
          />
        }
      >
        <MoreVertical className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {visible.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={item.onSelect}
            className={cn("min-h-11 cursor-pointer text-sm", item.danger && "text-red-600")}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PILL_TONES = {
  success: "bg-emerald-50 text-emerald-700",
  danger: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-sky-50 text-sky-700",
  muted: "bg-[#F3F1EF] text-[var(--cc-muted-text)]",
};

export function StatusPill({ tone = "muted", children, className }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4",
        PILL_TONES[tone] || PILL_TONES.muted,
        className,
      )}
    >
      {children}
    </span>
  );
}

// Money that never pretends: skeleton while loading, dash on error, real value (incl. ₹0) otherwise.
export function Amount({ value, loading, error, compact = false, className }) {
  if (loading) {
    return <span className={cn("inline-block h-[1em] w-20 animate-pulse rounded bg-[var(--cc-border)] align-middle", className)} role="status" aria-label="Loading" />;
  }
  if (error) return <span className={cn("text-[var(--cc-muted-text)]", className)}>Unavailable</span>;
  return <span className={className}>{compact ? formatCompactCurrency(value) : formatCurrency(value)}</span>;
}

export function SectionHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold leading-6 text-[var(--cc-text)]">{title}</h2>
        {subtitle && <p className="truncate text-xs text-[var(--cc-secondary-text)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon = Inbox, title, description, action }) {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-[var(--cc-border)] bg-white px-4 py-8 text-center">
      <div className="grid size-10 place-items-center rounded-xl bg-[var(--cc-primary-light)] text-[var(--cc-primary)]">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-[var(--cc-text)]">{title}</p>
      {description && <p className="max-w-xs text-xs text-[var(--cc-secondary-text)]">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = "Unable to load data.", onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-amber-300 bg-amber-50/50 px-4 py-8 text-center"
    >
      <AlertTriangle className="size-6 text-amber-500" aria-hidden="true" />
      <p className="text-sm font-medium text-[var(--cc-text)]">{message}</p>
      {onRetry && (
        <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => onRetry()}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function ListSkeleton({ rows = 4, className = "h-24" }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className={cn("w-full rounded-[16px]", className)} />
      ))}
    </div>
  );
}

// loading → skeleton, error → retry, otherwise children.
export function QueryGate({ query, noun = "data", skeleton, children }) {
  if (query.isLoading) return skeleton || <ListSkeleton />;
  if (query.isError) return <ErrorState message={`Unable to load ${noun}.`} onRetry={query.refetch} />;
  return children;
}

// One-line, horizontally scrollable tab strip — never wraps.
export function TabStrip({ items, value, onChange, label, variant = "underline", className }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        variant === "underline" ? "border-b border-[var(--cc-divider)]" : "py-0.5",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap text-[12px] font-semibold sm:text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]",
              variant === "underline"
                ? cn(
                    "flex-1 border-b-2 px-1",
                    active
                      ? "border-[var(--cc-primary)] text-[var(--cc-primary)]"
                      : "border-transparent text-[var(--cc-secondary-text)] hover:text-[var(--cc-text)]",
                  )
                : cn(
                    "rounded-full border px-3.5",
                    active
                      ? "border-[var(--cc-primary)] bg-[var(--cc-primary)] text-white"
                      : "border-[var(--cc-border)] bg-white text-[var(--cc-secondary-text)] hover:border-[var(--cc-primary)]/50",
                  ),
            )}
          >
            {item.label}
            {item.count !== undefined && item.count !== null && (
              <span className={cn("text-[11px]", active ? "opacity-90" : "opacity-60")}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function KeyValue({ label, children, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 py-2 text-sm", className)}>
      <dt className="shrink-0 text-[var(--cc-secondary-text)]">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-[var(--cc-text)]">{children ?? "—"}</dd>
    </div>
  );
}

export function DetailSection({ title, action, children }) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--cc-muted-text)]">{title}</h3>
        {action}
      </div>
      <div className="rounded-xl border border-[var(--cc-border)] bg-white px-3.5">{children}</div>
    </section>
  );
}

// Sheets & forms --------------------------------------------------------

// Bottom sheet on phones/tablets, side panel on desktop. Header and footer stay
// pinned; only the body scrolls.
export function AppSheet({ open, onOpenChange, title, description, children, footer, onSubmit }) {
  const desktop = useIsDesktop();
  const Wrapper = onSubmit ? "form" : "div";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        showCloseButton={false}
        className="gap-0 bg-[var(--cc-page)] p-0 data-[side=bottom]:max-h-[92dvh] data-[side=bottom]:rounded-t-[20px] data-[side=right]:w-full data-[side=right]:sm:max-w-[480px]"
      >
        <Wrapper
          {...(onSubmit ? { onSubmit, noValidate: true } : {})}
          className="flex min-h-0 flex-1 flex-col"
        >
          <header className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--cc-divider)] bg-white px-4 py-2.5">
            <div className="min-w-0 py-1.5">
              <SheetTitle className="truncate text-base font-bold text-[var(--cc-text)]">{title}</SheetTitle>
              {description && (
                <SheetDescription className="truncate text-xs text-[var(--cc-secondary-text)]">
                  {description}
                </SheetDescription>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-[var(--cc-secondary-text)] hover:bg-[var(--cc-page)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
          {footer && (
            <footer className="shrink-0 border-t border-[var(--cc-divider)] bg-white pl-4 pr-[72px] pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              {footer}
            </footer>
          )}
        </Wrapper>
      </SheetContent>
    </Sheet>
  );
}

export function FormSheet({ open, onOpenChange, title, description, onSubmit, saving, submitLabel = "Save", error, children }) {
  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      footer={
        <div className="space-y-2">
          {error && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-11 rounded-xl" disabled={saving}>
              {saving ? "Saving…" : submitLabel}
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </AppSheet>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", destructive, pending, onConfirm, children }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100vw-32px)] max-w-sm rounded-[16px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="min-h-11 rounded-xl">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn("min-h-11 rounded-xl", destructive && "bg-red-600 text-white hover:bg-red-700")}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Field({ label, required, error, hint, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[13px] font-semibold text-[var(--cc-text)]">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-[var(--cc-muted-text)]">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = "h-11 rounded-xl text-base md:text-sm";

export function TextField({ label, required, error, hint, ...props }) {
  const id = useId();
  return (
    <Field label={label} required={required} error={error} hint={hint} htmlFor={id}>
      <Input id={id} className={inputClass} aria-invalid={Boolean(error)} {...props} />
    </Field>
  );
}

export function MoneyField(props) {
  return <TextField type="number" inputMode="decimal" min="0" step="0.01" {...props} />;
}

export function DateField(props) {
  return <TextField type="date" {...props} />;
}

export function TextAreaField({ label, error, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} htmlFor={id}>
      <Textarea id={id} className="min-h-20 rounded-xl text-base md:text-sm" {...props} />
    </Field>
  );
}

export function SelectField({ label, required, error, hint, value, onChange, options, placeholder = "Select", disabled }) {
  const selected = options.find((option) => option.value === value);
  const id = useId();
  return (
    <Field label={label} required={required} error={error} hint={hint} htmlFor={id}>
      <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className={cn(inputClass, "w-full bg-white")} aria-invalid={Boolean(error)}>
          <SelectValue placeholder={placeholder}>{selected?.label ?? placeholder}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="min-h-11">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

// Tiny controlled-form helper: bind("name") for inputs, set("name") for selects.
export function useFormState(initial) {
  const [values, setValues] = useState(initial);
  return {
    values,
    setValues,
    bind: (name) => ({
      value: values[name] ?? "",
      onChange: (event) => setValues((current) => ({ ...current, [name]: event.target.value })),
    }),
    set: (name) => (value) => setValues((current) => ({ ...current, [name]: value })),
  };
}

export const emptyToNull = (value) => (value === "" || value === undefined ? null : value);



