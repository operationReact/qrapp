import { cn } from "@/lib/utils";

/**
 * AnalyticsTable
 * columns: [{ key, header, render?, align? }]
 * rows: any[]
 */
export default function AnalyticsTable({ columns = [], rows = [], className }) {
  return (
    // outer div clips overflow; inner div adds horizontal scroll with min-width
    <div className={cn("overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0", className)}>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "text-[10px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wide py-2 px-2 sm:px-3 whitespace-nowrap",
                  col.align === "right" ? "text-right" : "text-left"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-10 text-zinc-400 text-xs"
              >
                No data available
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      // tighter padding on mobile, comfortable on desktop
                      "py-2 px-2 sm:py-2.5 sm:px-3 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap",
                      col.align === "right" ? "text-right" : "text-left"
                    )}
                  >
                    {col.render ? col.render(row[col.key], row, i) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
