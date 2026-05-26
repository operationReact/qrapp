import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import Navbar from "@/components/shared/Navbar";
import { useQuery } from "@tanstack/react-query";
import { myOrdersOptions } from "@/query/options/orders";
import { Cabinet } from "@boxicons/react";
import OrderCard from "@/components/orders/OrderCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MobileMenu from "@/components/shared/MobileMenu";
import { useAuth } from "@/context/AuthContext";

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

  const orders = Array.isArray(ordersData) ? ordersData : [];
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
    <div className="page-shell pb-mobile-nav! md:pb-[initial]!">
      <Navbar />
      <MobileMenu />

      <main className="container-premium py-6">
        <div className="mx-auto space-y-6">
          <div className="flex flex-col gap-2">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Orders</h1>
              <p className="mt-1 text-md text-muted-foreground">
                Review live order status, see what you ordered, and revisit
                recent purchases.
              </p>
            </div>
          </div>

          {loading && (
            <div className="rounded-3xl bg-white px-6 py-16 text-center text-gray-500 shadow-sm border border-gray-100">
              Loading your order history...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm border">
              <Cabinet pack="filled" className="size-12 mx-auto" />
              <h2 className="mt-4 text-xl font-semibold">No orders yet!</h2>
              <p className="mt-2 max-w-sm mx-auto text-muted-foreground">
                Start with your favourite dishes and they'll show up here
                automatically.
              </p>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="font-medium! mt-8 min-w-60 w-1/2 h-12"
              >
                <Link to="/">Browse Menu</Link>
              </Button>
            </div>
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
