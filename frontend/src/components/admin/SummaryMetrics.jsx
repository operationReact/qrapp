import { cn } from "@/lib/utils";

const TONE_STYLES = {
  red:     { icon: "bg-red-50     text-red-500"     },
  emerald: { icon: "bg-emerald-50 text-emerald-600" },
  rose:    { icon: "bg-rose-50    text-rose-600"    },
  amber:   { icon: "bg-amber-50   text-amber-600"   },
  blue:    { icon: "bg-blue-50    text-blue-600"    },
  zinc:    { icon: "bg-zinc-100   text-zinc-700"    },
};

export default function SummaryMetrics({ items = [], loading = false }) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:overflow-visible sm:gap-3">
      {items.map((item) => {
        const tone = TONE_STYLES[item.tone] ?? TONE_STYLES.zinc;
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="shrink-0 w-40 sm:w-auto bg-white border border-border rounded-2xl p-4 shadow-sm flex flex-col gap-2.5"
          >
            <div className={cn("size-10 rounded-xl flex items-center justify-center", tone.icon)}>
              {Icon ? <Icon size={20} weight="bold" /> : null}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground leading-none mb-1.5">
                {item.label}
              </p>
              {loading ? (
                <div className="h-6 w-16 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-foreground leading-tight tracking-tight">
                  {item.value}
                </p>
              )}
              {item.subtext && !loading && (
                <p className={cn("text-xs mt-1 font-medium leading-snug", item.subColor ?? "text-muted-foreground")}>
                  {item.subtext}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


