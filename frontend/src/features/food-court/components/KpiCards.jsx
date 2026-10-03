import {
  Store,
  DoorOpen,
  Wallet,
  BadgeIndianRupee,
  Building2,
  TrendingUp,
  Receipt,
  PiggyBank,
  AlarmClock,
  ListChecks,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "../format";

function KpiCard({ icon, label, value, hint, tone = "default" }) {
  const Icon = icon;
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-red-600"
        : tone === "warning"
          ? "text-amber-600"
          : "text-[var(--cc-text)]";
  return (
    <Card className="flex flex-col gap-2 rounded-[16px] border-[var(--cc-border)] bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--cc-muted-text)]">
          {label}
        </span>
        <span className="grid size-8 place-items-center rounded-lg bg-[var(--cc-primary-light)] text-[var(--cc-primary)]">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
      <p className={cn("text-2xl font-bold leading-7", toneClass)}>{value}</p>
      {hint && <p className="text-xs text-[var(--cc-secondary-text)]">{hint}</p>}
    </Card>
  );
}

export function KpiCards({ kpis, loading }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-[16px]" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      icon: Store,
      label: "Stalls",
      value: formatNumber(kpis.stallCount),
      hint: `${formatNumber(kpis.occupied)} occupied`,
    },
    {
      icon: DoorOpen,
      label: "Occupancy",
      value: `${formatNumber(kpis.occupied)}/${formatNumber(kpis.stallCount)}`,
      hint: `${formatNumber(kpis.available)} available`,
    },
    {
      icon: Wallet,
      label: "Monthly Tenant Rent",
      value: formatCurrency(kpis.monthlyTenantRent),
      hint: "Billed to tenants",
    },
    {
      icon: BadgeIndianRupee,
      label: "Collected",
      value: formatCurrency(kpis.collected),
      hint: `${formatCurrency(kpis.outstanding)} outstanding`,
      tone: "positive",
    },
    {
      icon: Building2,
      label: "Landlord Lease",
      value: formatCurrency(kpis.landlordLease),
      hint: "Payable to landlord",
    },
    {
      icon: TrendingUp,
      label: "Gross Rent Spread",
      value: formatCurrency(kpis.grossRentSpread),
      hint: "Tenant rent − landlord lease",
      tone: kpis.grossRentSpread < 0 ? "negative" : "positive",
    },
    {
      icon: Receipt,
      label: "Expenses",
      value: formatCurrency(kpis.totalExpenses),
      hint: "Operating costs",
      tone: "warning",
    },
    {
      icon: PiggyBank,
      label: "Net Contribution",
      value: formatCurrency(kpis.netContribution),
      hint: "Spread − expenses",
      tone: kpis.netContribution < 0 ? "negative" : "positive",
    },
    {
      icon: AlarmClock,
      label: "Overdue Rents",
      value: formatNumber(kpis.overdueRents),
      hint: "Need follow-up",
      tone: kpis.overdueRents > 0 ? "negative" : "default",
    },
    {
      icon: ListChecks,
      label: "Open Actions",
      value: formatNumber(kpis.openActions),
      hint: "Pending items",
      tone: kpis.openActions > 0 ? "warning" : "default",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
