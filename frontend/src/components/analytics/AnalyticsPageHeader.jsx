import { SectionLocationSelector } from "@/components/SectionLocationSelector";

/**
 * AnalyticsPageHeader – consistent page header for all analytics pages.
 *
 * Renders a section-level location selector for regular ADMIN / MANAGER users
 * (it self-hides for SUPER_ADMIN, KITCHEN_STAFF and single-location users), so
 * every analytics page can be scoped to an assigned location without wiring the
 * selector individually.
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
      <div className="flex flex-shrink-0 items-center gap-2">
        <SectionLocationSelector />
        {action}
      </div>
    </div>
  );
}
