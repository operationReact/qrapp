import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import Navbar from "@/components/shared/Navbar";
import { useQuery } from "@tanstack/react-query";
import { myOrdersOptions } from "@/query/options/orders";
import OrderCard, { OrderCardSkeleton } from "@/components/orders/OrderCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MobileMenu from "@/components/shared/MobileMenu";
import { useAuth } from "@/context/AuthContext";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ArchiveIcon, ReceiptIcon } from "@phosphor-icons/react";
import {
  getOrderStatusMeta,
  getStatusFilterLabel,
  normalizeOrderStatus,
  ORDER_STATUS_FILTER_ORDER,
} from "@/components/orders/orderPresentation";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.token) {
      navigate({ to: "/login", state: { from: "/orders" } });
    }
  }, [user?.token, navigate]);

  const {
    data: ordersData,
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useQuery({
    ...myOrdersOptions,
    enabled: !!user?.token,
  });

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [navOffset, setNavOffset] = useState(0);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return undefined;
    const update = () => setNavOffset(header.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  const orders = useMemo(
    () => (Array.isArray(ordersData) ? ordersData.filter(Boolean) : []),
    [ordersData],
  );
  const error = fetchError
    ? "Unable to load your orders"
    : "";

  const filteredOrders = useMemo(
    () =>
      activeFilter === "ALL"
        ? orders
        : orders.filter((order) => normalizeOrderStatus(order.status) === activeFilter),
    [activeFilter, orders],
  );

  const statusCounts = useMemo(() => {
    const counts = { ALL: orders.length };
    for (const order of orders) {
      const status = normalizeOrderStatus(order.status);
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }, [orders]);

  const emptyState = {
    ALL: {
      title: "No orders yet",
      description: "Place your first order to see it here automatically.",
    },
    ORDER_PLACED: {
      title: "No placed orders",
      description: "New orders will appear here after checkout.",
    },
    PREPARING: {
      title: "Nothing is being prepared",
      description: "Orders being prepared will appear here.",
    },
    READY: {
      title: "No ready orders",
      description: "Orders ready for pickup will appear here.",
    },
    COMPLETED: {
      title: "No completed orders",
      description: "Completed orders will appear here after pickup.",
    },
    CANCELLED: {
      title: "No cancelled orders",
      description: "Cancelled orders will appear here.",
    },
  }[activeFilter] || {
    title: `No ${getOrderStatusMeta(activeFilter).label.toLowerCase()} orders`,
    description: "Try another filter to view your order history.",
  };

  return (
    <div className="page-shell min-w-0 bg-background pb-mobile-nav! md:pb-[initial]!">
      <Navbar />
      <MobileMenu />

      <main className="container-premium min-w-0 py-6 pb-[calc(var(--app-mobile-menu-height)+1.5rem+env(safe-area-inset-bottom))] md:pb-8">
        <div className="mx-auto w-full max-w-3xl min-w-0 space-y-6">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Order history</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Your orders</h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Track recent orders and revisit everything you have enjoyed.
            </p>
          </div>

          {loading && (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {[0, 1, 2].map((index) => (
                <OrderCardSkeleton key={index} />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
              <h2 className="font-semibold">{error}</h2>
              <p className="mt-1 text-sm text-red-700">
                Something went wrong while loading your order history.
              </p>
              <Button type="button" className="mt-4 min-h-11" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <Empty className="rounded-2xl border border-border bg-card px-4 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ArchiveIcon />
                </EmptyMedia>
                <EmptyTitle>{emptyState.title}</EmptyTitle>
                <EmptyDescription>
                  {emptyState.description}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link
                  to="/"
                  className={buttonVariants({
                    variant: "secondary",
                    class: "w-full max-w-2xs",
                  })}
                >
                  Browse Menu
                </Link>
              </EmptyContent>
            </Empty>
          )}

          {!loading && !error && orders.length > 0 && (
            <Tabs value={activeFilter} onValueChange={setActiveFilter} className="min-w-0">
              <div
                style={{ top: navOffset }}
                className="sticky z-30 -mx-4 border-b border-border/70 bg-background/85 px-4 pt-2 pb-3 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:-mx-1 sm:px-1"
              >
                <TabsList className="flex h-auto! w-full flex-wrap justify-start gap-2 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto">
                  {ORDER_STATUS_FILTER_ORDER.map((status) => {
                    const meta = status === "ALL" ? null : getOrderStatusMeta(status);
                    const Icon = meta?.icon ?? ReceiptIcon;
                    const count = statusCounts[status] ?? 0;
                    return (
                      <TabsTrigger
                        key={status}
                        value={status}
                        className="group h-9 flex-none gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-semibold text-muted-foreground shadow-sm transition-all hover:border-foreground/20 hover:text-foreground data-active:border-transparent data-active:bg-foreground data-active:text-background data-active:shadow-md dark:data-active:bg-foreground dark:data-active:text-background"
                      >
                        <Icon size={15} weight="bold" aria-hidden="true" />
                        {getStatusFilterLabel(status)}
                        <span className="rounded-full bg-muted px-1.5 text-[11px] font-bold tabular-nums text-muted-foreground group-data-[active]:bg-background/20 group-data-[active]:text-background">
                          {count}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              <TabsContent value={activeFilter} className="mt-3 min-w-0">
                {filteredOrders.length > 0 ? (
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    {filteredOrders.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                ) : (
                  <Empty className="rounded-2xl border border-border bg-card px-4 py-8">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ArchiveIcon />
                      </EmptyMedia>
                      <EmptyTitle>{emptyState.title}</EmptyTitle>
                      <EmptyDescription>{emptyState.description}</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}
