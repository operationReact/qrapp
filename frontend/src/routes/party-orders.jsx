import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/shared/Navbar";
import MobileMenu from "@/components/shared/MobileMenu";
import { useAuth } from "@/context/AuthContext";
import { myPartyOrdersOptions } from "@/query/options/party-orders";
import UserPartyOrderCard from "@/components/UserPartyOrderCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ConfettiIcon } from "@phosphor-icons/react";

export const Route = createFileRoute("/party-orders")({
  component: MyPartyOrdersPage,
});

function MyPartyOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.token) {
      navigate({ to: "/login", state: { from: "/party-orders" } });
    }
  }, [user?.token, navigate]);

  const { data: orders = [], isLoading } = useQuery({
    ...myPartyOrdersOptions,
    enabled: !!user?.token,
  });

  return (
    <div className="page-shell pb-mobile-nav! md:pb-[initial]!">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">My Party Orders</h1>
            <p className="text-sm text-muted-foreground">Track your catering requests</p>
          </div>
          <Link to="/new-party-order">
            <Button size="sm">New Request</Button>
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <ConfettiIcon className="size-10 text-primary" weight="duotone" />
            </div>
            <div>
              <p className="font-semibold">No party orders yet</p>
              <p className="text-sm text-muted-foreground mt-1">Plan your next event with us!</p>
            </div>
            <Link to="/new-party-order">
              <Button>Request Catering</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <UserPartyOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>

      <MobileMenu />
    </div>
  );
}

