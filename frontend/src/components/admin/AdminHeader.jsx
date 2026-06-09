import { cn } from "@/lib/utils";

export default function AdminHeader({ title, description, className, actions }) {
  return (
    <div className={cn("px-4 pt-5 pb-2 min-w-0", className)}>
      <h1 className="text-2xl font-bold tracking-tight leading-tight text-foreground md:text-[28px]">
        {title}
      </h1>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xl leading-relaxed">
          {description}
        </p>
      )}
      {actions && (
        <div className="flex flex-wrap items-center gap-2 mt-4">{actions}</div>
      )}
    </div>
  );
}
