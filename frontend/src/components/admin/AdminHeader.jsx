import { cn } from "@/lib/utils";

export default function AdminHeader({ title, description, className, actions }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-4 pt-3 pb-1", className)}>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold leading-tight">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground max-w-md">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
