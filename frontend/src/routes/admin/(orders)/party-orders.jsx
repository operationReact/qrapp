import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import PartyOrderCard from "@/components/admin/PartyOrderCard";
import { partyOrdersOptions } from "@/query/options/party-orders";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfettiIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

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
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[28px] leading-tight">
          Party Orders
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage party order requests and provide estimates.
        </p>
      </div>

      <div className="px-4 pb-6 space-y-4">
        {/* ── Search ──────────────────────────────────────────────────── */}
        <InputGroup className="w-full max-w-sm">
          <InputGroupAddon>
            <MagnifyingGlassIcon weight="bold" />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, menu item…"
          />
        </InputGroup>

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
