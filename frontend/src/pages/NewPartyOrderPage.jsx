import { useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import Navbar from "@/components/shared/Navbar";
import MobileMenu from "@/components/shared/MobileMenu";
import { useAuth } from "@/context/AuthContext";
import NewPartyOrder from "@/pages/NewPartyOrder";
import { ArrowLeftIcon } from "@phosphor-icons/react";

export default function NewPartyOrderPage() {
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

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="mb-6">
          <Link
            to="/party-orders"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeftIcon weight="bold" className="size-3.5" />
            My Party Orders
          </Link>

          <h1 className="text-xl font-bold">Create Party Order</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tell us about your event and preferred menu. We'll get back to you
            with an estimate.
          </p>
        </div>

        {/* ── Form card ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <NewPartyOrder
            onSuccess={() => navigate({ to: "/party-orders" })}
          />
        </div>
      </main>

      <MobileMenu />
    </div>
  );
}

