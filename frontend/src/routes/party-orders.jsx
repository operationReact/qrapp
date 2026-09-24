import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/shared/Navbar";
import MobileMenu from "@/components/shared/MobileMenu";
import { useAuth } from "@/context/AuthContext";
import { myPartyOrdersOptions } from "@/query/options/party-orders";
import UserPartyOrderCard from "@/components/UserPartyOrderCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfettiIcon, HeartIcon } from "@phosphor-icons/react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { myHallOfHappinessOptions } from "@/query/options/hall-of-happiness";
import { setHallOfHappinessConsent } from "@/services/hall-of-happiness-service";

export const Route = createFileRoute("/party-orders")({
  component: MyPartyOrdersPage,
});

function MyPartyOrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const { data: photosPage } = useQuery(myHallOfHappinessOptions({
    enabled: !!user?.token,
  }));
  const consentMutation = useMutation({
    mutationFn: ({ id, granted }) => setHallOfHappinessConsent(id, granted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hall-of-happiness"] }),
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

        {photosPage?.content?.length > 0 && (
          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <HeartIcon size={21} weight="duotone" className="text-rose-500" />
              <div>
                <h2 className="font-semibold">Hall of Happiness photo consent</h2>
                <p className="text-xs text-muted-foreground">
                  Choose which event photos Bro &amp; Bro may publish in the Hall of Happiness.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {photosPage.content.map((photo) => (
                <div key={photo.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img src={photo.thumbnailUrl} alt="" className="h-12 w-16 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{photo.caption || photo.eventType || "Event memory"}</p>
                      <p className="text-xs text-muted-foreground">Current consent: {photo.consentStatus}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={photo.consentStatus === "GRANTED" ? "default" : "outline"}
                      disabled={consentMutation.isPending}
                      onClick={() => consentMutation.mutate({ id: photo.id, granted: true })}
                    >
                      Allow publishing
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={consentMutation.isPending || photo.consentStatus === "REVOKED"}
                      onClick={() => consentMutation.mutate({ id: photo.id, granted: false })}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <MobileMenu />
    </div>
  );
}
