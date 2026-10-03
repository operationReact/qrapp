import { Store } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCurrency, isStallOccupied, isStallAvailable } from "../format";
import { PanelError, PanelEmpty, PanelLoading, StatusPill } from "./FeatureStates";

function stallTone(stall) {
  if (isStallOccupied(stall)) return "success";
  if (isStallAvailable(stall)) return "info";
  return "muted";
}

function stallStatusLabel(stall) {
  if (stall?.status) return String(stall.status).replace(/_/g, " ");
  return isStallOccupied(stall) ? "Occupied" : "Available";
}

export function StallsPanel({ query }) {
  if (query.isLoading) return <PanelLoading rows={3} />;
  if (query.isError) return <PanelError onRetry={query.refetch} />;

  const stalls = query.data || [];
  if (!stalls.length) {
    return (
      <PanelEmpty
        icon={Store}
        title="No stalls configured"
        description="Stalls added to this food court will appear here as cards."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stalls.map((stall) => (
        <Card key={stall.id} className="flex flex-col gap-3 rounded-[16px] border-[var(--cc-border)] bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[var(--cc-text)]">
                {stall.name || stall.code || `Stall ${stall.number ?? stall.id}`}
              </p>
              {(stall.code || stall.number) && (
                <p className="text-xs text-[var(--cc-secondary-text)]">
                  Unit {stall.code || stall.number}
                  {stall.area ? ` · ${stall.area} sq.ft` : ""}
                </p>
              )}
            </div>
            <StatusPill tone={stallTone(stall)}>{stallStatusLabel(stall)}</StatusPill>
          </div>
          <div className="mt-auto flex items-end justify-between border-t border-[var(--cc-divider)] pt-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[var(--cc-muted-text)]">Monthly rent</p>
              <p className="text-sm font-semibold text-[var(--cc-text)]">
                {formatCurrency(stall.monthlyRent ?? stall.rentAmount)}
              </p>
            </div>
            <p className="max-w-[55%] truncate text-right text-xs text-[var(--cc-secondary-text)]">
              {stall.tenantName || stall.tenant?.name || "Vacant"}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
