import { cn } from "@/lib/utils";

export default function AdminHeader({ title, description, className, actions, icon }) {
  return (
    <div className={cn("relative overflow-hidden px-4 pt-6 pb-4 min-w-0 md:px-0 md:pt-2", className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white shadow-sm">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold tracking-tight leading-[1.15] text-stone-900 md:text-[30px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-stone-500">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 mt-4">{actions}</div>
      )}
    </div>
  );
}
