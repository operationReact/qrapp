import { Layers, CheckCircle, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n) =>
  n != null
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n)
    : "—";

function KpiCard({ icon, iconBg, iconColor, label, value, sub, subColor }) {
  const Icon = icon;
  return (
    <div className="flex-shrink-0 w-36 sm:w-auto bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-3.5 shadow-sm flex flex-col gap-2">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon size={18} className={iconColor} />
      </div>
      <div>
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide leading-none mb-1">
          {label}
        </p>
        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-tight truncate">
          {value}
        </p>
        {sub && (
          <p className={cn("text-xs font-medium mt-0.5", subColor ?? "text-zinc-400")}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ComboKpiCards({ summary, loading }) {
  const s = summary ?? {};
  const topCombo = s.topSellingCombos?.[0];

  const activePct =
    s.totalCombos > 0 ? Math.round((s.activeCombos / s.totalCombos) * 100) : 0;

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar px-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-36 sm:w-auto h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar px-4 sm:grid sm:grid-cols-4 sm:overflow-visible">
      <KpiCard
        icon={Layers}
        iconBg="bg-violet-50 dark:bg-violet-900/30"
        iconColor="text-violet-500"
        label="Total Combos"
        value={s.totalCombos ?? 0}
        sub="All Time"
      />
      <KpiCard
        icon={CheckCircle}
        iconBg="bg-emerald-50 dark:bg-emerald-900/30"
        iconColor="text-emerald-500"
        label="Active Combos"
        value={s.activeCombos ?? 0}
        sub={`${activePct}%`}
        subColor="text-emerald-500"
      />
      <KpiCard
        icon={TrendingUp}
        iconBg="bg-orange-50 dark:bg-orange-900/30"
        iconColor="text-orange-500"
        label="Combo Revenue"
        value={fmt(s.totalRevenue)}
        sub="Today"
      />
      <KpiCard
        icon={Star}
        iconBg="bg-blue-50 dark:bg-blue-900/30"
        iconColor="text-blue-500"
        label="Top Combo"
        value={topCombo?.comboName ?? "—"}
        sub={topCombo ? fmt(topCombo.totalRevenue) : undefined}
        subColor="text-blue-500"
      />
    </div>
  );
}

