import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import AdminHeader from "@/components/admin/AdminHeader";
import PartyOrderCard from "@/components/admin/PartyOrderCard";
import { partyOrdersOptions } from "@/query/options/party-orders";
import { Skeleton } from "@/components/ui/skeleton";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

export const Route = createFileRoute('/admin/(orders)/party-orders')({
  component: PartyOrdersPage
})

const STATUS_FILTERS = [
  { label: "All",          value: null },
  { label: "New",          value: "NEW" },
  { label: "Under Review", value: "UNDER_REVIEW" },
  { label: "Estimate Sent",value: "ESTIMATE_SENT" },
  { label: "Confirmed",    value: "CONFIRMED" },
  { label: "Completed",    value: "COMPLETED" },
  { label: "Cancelled",    value: "CANCELLED" },
];

function PartyOrdersPage() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading: loading } = useQuery(partyOrdersOptions);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState(null);

  const filtered = useMemo(() => {
    let result = orders;
    if (activeStatus) result = result.filter((o) => o.status === activeStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.userName?.toLowerCase().includes(q) ||
          o.userPhone?.toLowerCase().includes(q) ||
          o.venue?.toLowerCase().includes(q) ||
          o.eventType?.toLowerCase().includes(q) ||
          o.menuItems?.some((m) => m.toLowerCase().includes(q))
      );
    }
    return result;
  }, [orders, search, activeStatus]);

  const countFor = (status) =>
    status ? orders.filter((o) => o.status === status).length : orders.length;

  return (
    <>
      <AdminHeader
        title="Party Orders"
        description="Manage party order requests and provide estimates."
      />

      <div className="px-4 py-4 space-y-4">

        {/* ── Search ──────────────────────────────────────────────────── */}
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, menu item…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground transition-all"
          />
        </div>

        {/* ── Status filter tabs ───────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map(({ label, value }) => {
            const count = countFor(value);
            const active = activeStatus === value;
            return (
              <button
                key={label}
                onClick={() => setActiveStatus(value)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {label}
                <span className={`rounded-full px-1.5 py-0 text-[10px] font-semibold ${active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-foreground"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Grid ────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/20">
            <p className="text-sm font-medium text-muted-foreground">
              {orders.length === 0 ? "No party orders yet." : "No orders match your filters."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((order) => (
              <PartyOrderCard
                key={order.id}
                order={order}
                onEstimateSubmitted={() => queryClient.invalidateQueries({ queryKey: ['party-orders'] })}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
