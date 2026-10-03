import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Store, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import * as api from "../api";
import { useFc } from "../context";
import {
  STALL_TONES,
  formatCurrency,
  formatDateRange,
  stallTitle,
  tenantDisplayName,
  titleCase,
} from "../format";
import { useFcMutation } from "../hooks";
import { EmptyState, KebabMenu, PressCard, QueryGate, SectionHeader, StatusPill, TabStrip } from "./kit";
import { RentPill } from "./shared";

const LEASE_TONES = { ACTIVE: "success", PENDING: "info", ENDED: "muted", TERMINATED: "danger" };
const GRID = "grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3";

function AddButton({ label = "Add", onClick }) {
  return (
    <Button className="min-h-11 rounded-xl px-4" onClick={onClick}>
      <Plus className="size-4" aria-hidden="true" /> {label}
    </Button>
  );
}

export function StallsScreen() {
  const fc = useFc();
  const [filter, setFilter] = useState("ALL");
  const update = useFcMutation(({ stall, status }) =>
    api.updateStall(fc.foodCourtId, stall.id, {
      code: stall.code,
      name: stall.name,
      floor: stall.floor,
      areaSqft: stall.areaSqft,
      baseRent: stall.baseRent,
      notes: stall.notes,
      status,
    }),
    { success: "Stall updated", failure: "Unable to update the stall" },
  );

  const rows = fc.stallRows;
  const occupied = rows.filter((row) => row.state === "OCCUPIED").length;
  const available = rows.filter((row) => row.state === "VACANT").length;
  const filtered = filter === "ALL" ? rows : rows.filter((row) => row.state === filter);
  const chips = [
    { key: "ALL", label: "All", count: rows.length },
    { key: "OCCUPIED", label: "Occupied", count: occupied },
    { key: "VACANT", label: "Vacant", count: available },
    { key: "MAINTENANCE", label: "Maintenance", count: rows.filter((row) => row.state === "MAINTENANCE").length },
  ];

  return (
    <section className="space-y-3">
      <SectionHeader title="Stalls" subtitle={`${occupied} occupied · ${available} available`} action={<AddButton onClick={() => fc.open("stall-form")} />} />
      <TabStrip variant="pill" label="Filter stalls" items={chips} value={filter} onChange={setFilter} />
      <QueryGate query={fc.stalls} noun="stalls">
        {rows.length === 0 ? (
          <EmptyState icon={Store} title="No stalls yet" description="Add your first stall to start managing this Food Court." action={<AddButton label="Add Stall" onClick={() => fc.open("stall-form")} />} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Store} title="No stalls match this filter" />
        ) : (
          <div className={GRID}>
            {filtered.map((row) => {
              const { stall, state, tenantName, monthlyRent, lease, invoice } = row;
              const vacant = state === "VACANT";
              return (
                <div key={stall.id} className="space-y-1.5">
                  <PressCard
                    label={`${stallTitle(stall)} details`}
                    onClick={() => fc.open("stall-detail", { stallId: stall.id })}
                    menu={
                      <KebabMenu
                        label={`${stallTitle(stall)} actions`}
                        items={[
                          { label: "View details", onSelect: () => fc.open("stall-detail", { stallId: stall.id }) },
                          { label: "Edit stall", onSelect: () => fc.open("stall-form", { stallId: stall.id }) },
                          state === "OCCUPIED"
                            ? { label: "Change tenant", onSelect: () => fc.open("lease-form", { stallId: stall.id, replaceLeaseId: lease?.id }) }
                            : { label: "Assign tenant", onSelect: () => fc.open("lease-form", { stallId: stall.id }) },
                          state !== "OCCUPIED" && (state === "MAINTENANCE"
                            ? { label: "End maintenance", onSelect: () => update.mutate({ stall, status: "AVAILABLE" }) }
                            : { label: "Mark under maintenance", onSelect: () => update.mutate({ stall, status: "MAINTENANCE" }) }),
                        ]}
                      />
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--cc-muted-text)]">{stallTitle(stall)}</span>
                      <StatusPill tone={STALL_TONES[state]}>{titleCase(state)}</StatusPill>
                    </div>
                    <p className="mt-1 truncate text-base font-bold text-[var(--cc-text)]">
                      {state === "OCCUPIED" ? tenantName || "Tenant" : vacant ? "Vacant" : titleCase(state)}
                    </p>
                    {state === "OCCUPIED" ? (
                      <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold tabular-nums">
                          {monthlyRent == null ? "—" : formatCurrency(monthlyRent)}
                          <span className="font-normal text-[var(--cc-secondary-text)]"> / month</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <RentPill invoice={invoice} />
                        </span>
                      </div>
                    ) : (
                      stall.baseRent != null && <p className="mt-2 text-sm text-[var(--cc-secondary-text)]">Base rent {formatCurrency(stall.baseRent)} / month</p>
                    )}
                    {lease && <p className="mt-1 text-xs text-[var(--cc-secondary-text)]">Lease: {titleCase(lease.status)}</p>}
                  </PressCard>
                  {vacant && (
                    <Button variant="outline" className="min-h-11 w-full rounded-xl" onClick={() => fc.open("lease-form", { stallId: stall.id })}>
                      Assign Tenant
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </QueryGate>
    </section>
  );
}

export function TenantsScreen() {
  const fc = useFc();
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return fc.tenantRows;
    return fc.tenantRows.filter(({ tenant }) =>
      [tenant.name, tenant.businessName, tenant.contactPhone].some((value) => value?.toLowerCase().includes(needle)),
    );
  }, [fc.tenantRows, query]);

  return (
    <section className="space-y-3">
      <SectionHeader title="Tenants" subtitle={`${fc.tenantRows.length} total`} action={<AddButton onClick={() => fc.open("tenant-form")} />} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cc-muted-text)]" aria-hidden="true" />
        <Input aria-label="Search tenants" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tenants" className="h-11 rounded-xl bg-white pl-9 text-base md:text-sm" />
      </div>
      <QueryGate query={fc.tenants} noun="tenants">
        {fc.tenantRows.length === 0 ? (
          <EmptyState icon={Users} title="No tenants yet" description="Add a tenant to start leasing stalls." action={<AddButton label="Add Tenant" onClick={() => fc.open("tenant-form")} />} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Search} title="No tenants match your search" />
        ) : (
          <div className={GRID}>
            {rows.map(({ tenant, lease, stall, invoice }) => (
              <PressCard
                key={tenant.id}
                label={`${tenantDisplayName(tenant)} details`}
                onClick={() => fc.open("tenant-detail", { tenantId: tenant.id })}
                menu={
                  <KebabMenu
                    label={`${tenantDisplayName(tenant)} actions`}
                    items={[
                      { label: "View details", onSelect: () => fc.open("tenant-detail", { tenantId: tenant.id }) },
                      { label: "Edit tenant", onSelect: () => fc.open("tenant-form", { tenantId: tenant.id }) },
                      lease && { label: "View lease", onSelect: () => fc.open("lease-detail", { leaseId: lease.id }) },
                    ]}
                  />
                }
              >
                <div className="flex items-center gap-2">
                  <p className="min-w-0 truncate text-base font-bold">{tenantDisplayName(tenant)}</p>
                  {tenant.status === "INACTIVE" && <StatusPill>Inactive</StatusPill>}
                </div>
                <p className="text-xs text-[var(--cc-secondary-text)]">{stall ? stallTitle(stall) : "No stall assigned"}</p>
                {lease && (
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(lease.monthlyRent)}
                      <span className="font-normal text-[var(--cc-secondary-text)]"> / month</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <RentPill invoice={invoice} />
                      <StatusPill tone={LEASE_TONES[lease.status]}>{titleCase(lease.status)}</StatusPill>
                    </span>
                  </div>
                )}
              </PressCard>
            ))}
          </div>
        )}
      </QueryGate>
    </section>
  );
}

export function LeasesScreen() {
  const fc = useFc();
  const [filter, setFilter] = useState("ACTIVE");
  const leases = fc.leases.data || [];
  const filtered = filter === "ALL" ? leases : leases.filter((lease) => lease.status === filter);
  const chips = [
    { key: "ACTIVE", label: "Active", count: leases.filter((lease) => lease.status === "ACTIVE").length },
    { key: "ALL", label: "All", count: leases.length },
    { key: "ENDED", label: "Ended", count: leases.filter((lease) => lease.status === "ENDED" || lease.status === "TERMINATED").length },
  ];
  const shown = filter === "ENDED" ? leases.filter((lease) => lease.status === "ENDED" || lease.status === "TERMINATED") : filtered;

  return (
    <section className="space-y-3">
      <SectionHeader title="Leases" subtitle={`${chips[0].count} active`} action={<AddButton label="New lease" onClick={() => fc.open("lease-form")} />} />
      <TabStrip variant="pill" label="Filter leases" items={chips} value={filter} onChange={setFilter} />
      <QueryGate query={fc.leases} noun="leases">
        {shown.length === 0 ? (
          <EmptyState icon={FileText} title="No leases here" description="Assign a tenant to a stall to create a lease." action={<AddButton label="New lease" onClick={() => fc.open("lease-form")} />} />
        ) : (
          <div className={GRID}>
            {shown.map((lease) => (
              <PressCard
                key={lease.id}
                label={`Lease ${lease.tenantName}`}
                onClick={() => fc.open("lease-detail", { leaseId: lease.id })}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-base font-bold">{lease.tenantName} · Unit {lease.stallCode}</p>
                  <StatusPill tone={LEASE_TONES[lease.status]}>{titleCase(lease.status)}</StatusPill>
                </div>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatCurrency(lease.monthlyRent)}
                  <span className="font-normal text-[var(--cc-secondary-text)]">/month</span>
                </p>
                <p className="mt-1 text-xs text-[var(--cc-secondary-text)]">{formatDateRange(lease.startDate, lease.endDate)}</p>
              </PressCard>
            ))}
          </div>
        )}
      </QueryGate>
    </section>
  );
}
