import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import PartyOrderCard from "@/components/admin/PartyOrderCard";
import { partyOrdersOptions } from "@/query/options/party-orders";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfettiIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export const Route = createFileRoute("/admin/(orders)/party-orders")({
  component: PartyOrdersPage,
});

const STATUS_FILTERS = [
  { label: "All", value: null },
  { label: "New", value: "NEW" },
  { label: "Under Review", value: "UNDER_REVIEW" },
  { label: "Estimate Sent", value: "ESTIMATE_SENT" },
  { label: "Advance Pending", value: "ADVANCE_PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Expired", value: "ESTIMATE_EXPIRED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

function PartyOrdersPage() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading: loading } =
    useQuery(partyOrdersOptions);
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
          o.menuItems?.some((m) => m.toLowerCase().includes(q)),
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
          <MagnifyingGlassIcon
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, menu item…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground transition-all"
          />
        </div>

        <Tabs defaultValue="" onValueChange={setActiveStatus}>
          <ScrollArea
            orientation="horizontal"
            className="[&_[data-orientation=vertical]]:hidden"
          >
            <TabsList variant="line">
              {STATUS_FILTERS.map(({ label, value }) => {
                const count = countFor(value);
                const active = activeStatus === value;
                return (
                  <TabsTrigger disabled={count === 0} key={label} value={value}>
                    {label}
                    <span
                      className={`rounded-full px-1.5 py-0 text-[10px] font-semibold ${active ? "bg-primary-foreground/50 text-primary" : "bg-muted text-foreground"}`}
                    >
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <ScrollBar orientation="horizontal" className="hidden sm:block" />
          </ScrollArea>

          <TabsContent value={activeStatus}>
            {/* ── Grid ────────────────────────────────────────────────────── */}
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ConfettiIcon weight="duotone" />
                  </EmptyMedia>
                  <EmptyTitle>No party orders</EmptyTitle>
                  <EmptyDescription>
                    {orders.length === 0
                      ? "No party orders created seeking estimates"
                      : "No orders match your filters."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((order) => (
                  <PartyOrderCard
                    key={order.id}
                    order={order}
                    onEstimateSubmitted={() =>
                      queryClient.invalidateQueries({
                        queryKey: ["party-orders"],
                      })
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
