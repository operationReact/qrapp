import AnalyticsPageHeader from "@/components/analytics/AnalyticsPageHeader";
import ChartContainer from "@/components/analytics/ChartContainer";
import OrdersBarChart from "@/components/charts/OrdersBarChart";
import { EmptyState } from "@/components/analytics/States";
import { useTrendingItems } from "@/hooks/useAnalytics";
import { Flame, RefreshCw, Clock, Heart } from "lucide-react";

// eslint-disable-next-line no-unused-vars
function InsightCard({ icon, title, items = [], color = "text-primary", loading }) {
  // uppercase alias required for JSX component rendering
  const ItemIcon = icon;
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-3 sm:p-5">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <ItemIcon size={16} className={color} />
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100">{title}</h3>
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No data" />
      ) : (
        <ol className="space-y-1.5 sm:space-y-2">
          {items.slice(0, 5).map((item, i) => (
            <li
              key={i}
              // min-h-[44px] makes each item tap-friendly on touch devices
              className="min-h-[44px] flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0 text-xs font-bold text-zinc-400 w-4">{i + 1}</span>
                <span className="truncate text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">{item.name}</span>
              </span>
              {item.count != null && (
                <span className="flex-shrink-0 text-[10px] sm:text-xs text-zinc-400 ml-2">{item.count}×</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function Recommendations() {
  const trending = useTrendingItems();

  const data = trending.data ?? {};
  const trendingItems = data.trending ?? [];
  const reordered = data.mostReordered ?? [];
  const timeBased = data.timeBased ?? [];
  const preferred = data.userPreferred ?? [];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-screen-2xl mx-auto">
      <AnalyticsPageHeader
        title="Recommendation Insights"
        description="Trending, reordered and time-based item intelligence."
      />

      <ChartContainer
        title="Trending Items"
        subtitle="Currently popular items"
        loading={trending.loading}
        error={trending.error}
        onRetry={trending.refetch}
      >
        {trendingItems.length ? (
          <OrdersBarChart
            data={trendingItems.slice(0, 8)}
            xKey="name"
            dataKey="count"
            color="#f43f5e"
            label="Trend Score"
          />
        ) : (
          <EmptyState title="No trending data" />
        )}
      </ChartContainer>

      {/* 1 col on mobile, 2 on sm, 3 on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <InsightCard icon={Flame} title="Trending Now" items={trendingItems} color="text-red-500" loading={trending.loading} />
        <InsightCard icon={RefreshCw} title="Most Reordered" items={reordered} color="text-indigo-500" loading={trending.loading} />
        <InsightCard icon={Clock} title="Time-Based Picks" items={timeBased} color="text-amber-500" loading={trending.loading} />
      </div>

      <InsightCard icon={Heart} title="User Preferred Items" items={preferred} color="text-pink-500" loading={trending.loading} />
    </div>
  );
}

