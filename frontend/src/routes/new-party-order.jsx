import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import Navbar from "@/components/shared/Navbar";
import MobileMenu from "@/components/shared/MobileMenu";
import { useAuth } from "@/context/AuthContext";
import NewPartyOrder from "@/components/shared/NewPartyOrder";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/new-party-order")({
  component: NewPartyOrderPage,
});

function NewPartyOrderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.token) {
      navigate({ to: "/login" });
    }
  }, [user?.token, navigate]);

  return (
    <div className="page-shell pb-mobile-nav! md:pb-[initial]!">
      <Navbar />

      <main className="container-premium mx-auto py-6">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="mb-2">
          <Link
            to="/party-orders"
            className={buttonVariants({
              variant: "ghost",
              className: "hover:bg-transparent hover:text-primary",
            })}
          >
            <ArrowLeftIcon weight="bold" className="size-4" />
            My Party Orders
          </Link>
        </div>

        {/* ── Form card ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="font-semibold">Create Party Order</CardTitle>
            <CardDescription>
              {" "}
              Tell us about your event and preferred menu. We'll get back to you
              with an estimate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewPartyOrder
              onSuccess={() => navigate({ to: "/party-orders" })}
            />
          </CardContent>
        </Card>
      </main>

      <MobileMenu />
    </div>
  );
}
