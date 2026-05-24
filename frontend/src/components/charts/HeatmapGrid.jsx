import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 8}:00`); // 8am–7pm
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Abbreviated hour labels for tighter rendering
const SHORT_HOURS = Array.from({ length: 12 }, (_, i) => `${i + 8}`);

export default function HeatmapGrid({ data = [] }) {
  const max = Math.max(...data.map((d) => d.count ?? 0), 1);

  function getCount(day, hour) {
    return data.find((d) => d.day === day && d.hour === hour)?.count ?? 0;
  }

  function intensity(count) {
    const ratio = count / max;
    if (ratio === 0) return "bg-zinc-100 dark:bg-zinc-800";
    if (ratio < 0.25) return "bg-indigo-100 dark:bg-indigo-900/40";
    if (ratio < 0.5) return "bg-indigo-200 dark:bg-indigo-800/60";
    if (ratio < 0.75) return "bg-indigo-400 dark:bg-indigo-600";
    return "bg-indigo-600 dark:bg-indigo-500";
  }

  return (
    // overflow-x-auto lets mobile scroll horizontally; pb-1 avoids scrollbar cutting off cells
    <div className="overflow-x-auto pb-1 -mx-1 px-1">
      {/* min-w-max prevents the table from shrinking below its natural width */}
      <table className="min-w-max text-[10px] sm:text-xs border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th className="w-8 sm:w-10" />
            {HOURS.map((h, i) => (
              <th
                key={h}
                className="text-zinc-400 font-normal px-0.5 pb-1 text-center"
              >
                {/* Short label on narrow screens */}
                <span className="sm:hidden">{SHORT_HOURS[i]}</span>
                <span className="hidden sm:inline">{h}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => (
            <tr key={day}>
              <td className="text-zinc-400 pr-1 sm:pr-2 text-right whitespace-nowrap font-medium">
                {day}
              </td>
              {HOURS.map((h) => {
                const hourNum = parseInt(h);
                const count = getCount(day, hourNum);
                return (
                  <td key={h} title={`${day} ${h}: ${count} orders`}>
                    <div
                      className={cn(
                        // slightly smaller cells than before; round corners; tap-friendly
                        "w-7 h-6 sm:w-8 sm:h-7 rounded cursor-default transition-colors",
                        intensity(count)
                      )}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center gap-1 sm:gap-1.5 mt-3 text-[10px] sm:text-xs text-zinc-400">
        <span>Low</span>
        {[
          "bg-zinc-100 dark:bg-zinc-800",
          "bg-indigo-100",
          "bg-indigo-200",
          "bg-indigo-400",
          "bg-indigo-600",
        ].map((c, i) => (
          <div key={i} className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 rounded", c)} />
        ))}
        <span>High</span>
      </div>
    </div>
  );
}

