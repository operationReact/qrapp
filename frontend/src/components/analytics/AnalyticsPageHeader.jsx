/**
 * AnalyticsPageHeader – consistent page header for all analytics pages.
 */
export default function AnalyticsPageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
