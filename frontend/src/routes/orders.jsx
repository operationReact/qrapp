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
import { ArchiveIcon } from "@phosphor-icons/react";
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
              <div className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsList className="flex min-w-full w-max justify-start rounded-xl bg-muted p-1">
                  {ORDER_STATUS_FILTER_ORDER.map((status) => (
                    <TabsTrigger
                      className="min-h-11 shrink-0 px-4 text-sm! font-semibold!"
                      key={status}
                      value={status}
                    >
                      {getStatusFilterLabel(status)}
                    </TabsTrigger>
                  ))}
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
