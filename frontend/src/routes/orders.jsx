import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import Navbar from "@/components/shared/Navbar";
import { useQuery } from "@tanstack/react-query";
import { myOrdersOptions } from "@/query/options/orders";
import { Cabinet } from "@boxicons/react";
import OrderCard from "@/components/orders/OrderCard";
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
  } = useQuery({
    ...myOrdersOptions,
    enabled: !!user?.token,
  });

  const orders = Array.isArray([ordersData]) ? ordersData : [ordersData];
  const error = fetchError
    ? typeof fetchError?.response?.data === "string"
      ? fetchError.response.data
      : "Unable to load your orders right now."
    : "";

  const groupedOrders = (orders || []).reduce(
    (group, order) => {
      if (!group[order.status]) {
        group[order.status] = [];
      }

      group[order.status] = [...group[order.status], order];
      return group;
    },
    { ALL: orders },
  );

  const statuses = Object.keys(groupedOrders);

  return (
    <div className="page-shell bg-background pb-mobile-nav! md:pb-[initial]!">
      <Navbar />
      <MobileMenu />

      <main className="container-premium py-6">
        <div className="mx-auto space-y-6">
          <div className="flex flex-col gap-2">
            <div>
              <h1 className="text-lg font-semibold sm:text-2xl">Your orders</h1>
              <p className="text-sm text-muted-foreground">
                Browse your order history and reorder past favourites.
              </p>
            </div>
          </div>

          {loading && (
            <div className="rounded-3xl bg-card px-6 py-16 text-center text-gray-500 shadow-xs border border-border">
              Loading your order history...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <Empty className="px-4 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ArchiveIcon />
                </EmptyMedia>
                <EmptyTitle>No orders yet!</EmptyTitle>
                <EmptyDescription>
                  Place your first order to see it here automatically.
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
            <Tabs defaultValue={Object.keys(groupedOrders)[0]}>
              <TabsList>
                {statuses.map((status) => (
                  <TabsTrigger
                    className="text-sm! font-medium! capitalize"
                    key={status}
                    value={status}
                  >
                    {status.toLowerCase()}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(groupedOrders).map(([status, statusOrders]) => (
                <TabsContent
                  key={`tab-content-${status}`}
                  className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3"
                  value={status}
                >
                  {statusOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}
