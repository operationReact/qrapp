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
import { buttonVariants } from "@/components/ui/button";
import { ConfettiIcon } from "@phosphor-icons/react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

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

      <main className="mx-auto container-premium px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex gap-2 items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold sm:text-2xl">Party orders</h1>
            <p className="text-sm text-muted-foreground">
              Track your catering requests
            </p>
          </div>
          <Link
            to="/new-party-order"
            className={buttonVariants({ variant: "shadow-white", size: "lg" })}
          >
            <ConfettiIcon weight="fill" /> New Party Order
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ConfettiIcon weight="duotone" />
              </EmptyMedia>
              <EmptyTitle>No party orders yet</EmptyTitle>
              <EmptyDescription>Plan your next event with us!</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                to="/new-party-order"
                className={buttonVariants({
                  variant: "secondary",
                  size: "lg",
                  class: "w-full max-w-3xs",
                })}
              >
                <ConfettiIcon weight="fill" /> Request Catering
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-4 grid md:grid-cols-2 gap-4">
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
