import { useState } from "react";
import { Users, Phone, Store, Wallet } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../format";
import { PanelError, PanelEmpty, PanelLoading, StatusPill } from "./FeatureStates";

function tenantTone(tenant) {
  const status = String(tenant?.status || "").toUpperCase();
  if (status === "ACTIVE" || !status) return "success";
  if (status === "PENDING") return "warning";
  return "muted";
}

function DetailRow({ icon, label, value }) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-3 rounded-[10px] bg-[#FBF9F5] p-3">
      <span className="grid size-8 place-items-center rounded-lg bg-white text-[var(--cc-muted-text)]">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-[var(--cc-muted-text)]">{label}</p>
        <p className="truncate text-sm font-medium text-[var(--cc-text)]">{value || "—"}</p>
      </div>
    </div>
  );
}

export function TenantsPanel({ query }) {
  const [selectedId, setSelectedId] = useState(null);

  if (query.isLoading) return <PanelLoading rows={4} />;
  if (query.isError) return <PanelError onRetry={query.refetch} />;

  const tenants = query.data || [];
  if (!tenants.length) {
    return (
      <PanelEmpty
        icon={Users}
        title="No tenants yet"
        description="Tenants leasing stalls in this food court will be listed here."
      />
    );
  }

  const selected = tenants.find((tenant) => tenant.id === selectedId) || tenants[0];

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(16rem,.8fr)_minmax(0,1.6fr)]">
      <Card className="rounded-[16px] border-[var(--cc-border)] bg-white p-2">
        <div className="max-h-[28rem] space-y-1 overflow-y-auto">
          {tenants.map((tenant) => (
            <button
              type="button"
              key={tenant.id}
              onClick={() => setSelectedId(tenant.id)}
              className={cn(
                "w-full rounded-[12px] border p-3 text-left transition",
                selected?.id === tenant.id
                  ? "border-[var(--cc-primary)] bg-[var(--cc-primary-light)]"
                  : "border-transparent hover:bg-[var(--cc-page)]",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-[var(--cc-text)]">
                  {tenant.name || tenant.businessName || `Tenant ${tenant.id}`}
                </span>
                <StatusPill tone={tenantTone(tenant)}>{tenant.status || "Active"}</StatusPill>
              </div>
              <p className="mt-0.5 truncate text-xs text-[var(--cc-secondary-text)]">
                {tenant.businessName || tenant.phone || "—"}
              </p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="rounded-[16px] border-[var(--cc-border)] bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-[var(--cc-text)]">
              {selected.name || selected.businessName || `Tenant ${selected.id}`}
            </h3>
            {selected.businessName && selected.name && (
              <p className="truncate text-sm text-[var(--cc-secondary-text)]">{selected.businessName}</p>
            )}
          </div>
          <StatusPill tone={tenantTone(selected)}>{selected.status || "Active"}</StatusPill>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <DetailRow icon={Phone} label="Phone" value={selected.phone || selected.phoneNumber} />
          <DetailRow icon={Store} label="Stall" value={selected.stallCode || selected.stallName || selected.stallId} />
          <DetailRow icon={Wallet} label="Monthly rent" value={formatCurrency(selected.monthlyRent ?? selected.rentAmount)} />
          <DetailRow icon={Wallet} label="Deposit held" value={formatCurrency(selected.depositAmount ?? selected.deposit)} />
        </div>
        {(selected.email || selected.address) && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {selected.email && <DetailRow icon={Users} label="Email" value={selected.email} />}
            {selected.address && <DetailRow icon={Store} label="Address" value={selected.address} />}
          </div>
        )}
      </Card>
    </div>
  );
}
