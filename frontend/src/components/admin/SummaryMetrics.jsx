import { cn } from "@/lib/utils";

const TONE_STYLES = {
  red: {
    icon: "bg-red-50 text-red-500",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600",
  },
  rose: {
    icon: "bg-rose-50 text-rose-600",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
  },
  blue: {
    icon: "bg-blue-50 text-blue-600",
  },
  zinc: {
    icon: "bg-zinc-100 text-zinc-700",
  },
};

export default function SummaryMetrics({ items = [], loading = false }) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:gap-4">
      {items.map((item) => {
        const tone = TONE_STYLES[item.tone] ?? TONE_STYLES.zinc;
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="shrink-0 w-36 sm:w-auto bg-card border border-border rounded-lg p-3.5 shadow-sm flex flex-col gap-2"
          >
            <div
              className={cn(
                "size-9 rounded-lg flex items-center justify-center",
                tone.icon,
              )}
            >
              {Icon ? <Icon size={18} weight="bold" /> : null}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground leading-none mb-1">
                {item.label}
              </p>
              {loading ? (
                <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-xl font-bold text-foreground leading-tight truncate">
                  {item.value}
                </p>
              )}
              {item.sub && !loading && (
                <p
                  className={cn(
                    "text-[11px] mt-1 font-medium",
                    item.subColor ?? "text-muted-foreground",
                  )}
                >
                  {item.sub}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
