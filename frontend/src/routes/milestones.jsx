import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMilestoneCoupons } from "@/services/auth-service";
import Navbar from "@/components/shared/Navbar";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/milestones")({
  component: MilestonesPage,
});

const MILESTONES = [
  { amount: 500,   label: "₹500",    reward: "5% off" },
  { amount: 1000,  label: "₹1,000",  reward: "8% off" },
  { amount: 2500,  label: "₹2,500",  reward: "10% off" },
  { amount: 5000,  label: "₹5,000",  reward: "12% off" },
  { amount: 10000, label: "₹10,000", reward: "15% off" },
];

function MilestonesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.token) {
      navigate({ to: "/login", state: { from: "/milestones" } });
    }
  }, [user?.token, navigate]);

  const { data: milestoneCoupons = [], isLoading } = useQuery({
    queryKey: ["milestone-coupons"],
    queryFn: getMilestoneCoupons,
    enabled: !!user?.token,
  });

  const awardedByAmount = Object.fromEntries(
    milestoneCoupons.map((m) => [Number(m.milestoneAmount), m])
  );

  const earnedCount = MILESTONES.filter((m) => awardedByAmount[m.amount]).length;

  return (
    <div className="page-shell bg-page">
      <Navbar />

      <main className="container-premium py-6">
        <div className="mx-auto space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/profile" })}
              className="size-8 rounded-full flex items-center justify-center bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors shrink-0"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold sm:text-2xl">
                Milestones &amp; Rewards
              </h1>
              <p className="text-sm text-muted-foreground">
                Spend more, earn personalised coupons automatically.
              </p>
            </div>
          </div>

          {/* Progress summary */}
          <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-4 flex items-center gap-4">
            <div className="size-12 rounded-full bg-green-100 flex items-center justify-center text-2xl shrink-0">
              🏆
            </div>
            <div>
              <p className="font-semibold text-green-800">
                {earnedCount} of {MILESTONES.length} milestones reached
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                {earnedCount === MILESTONES.length
                  ? "You've unlocked all rewards!"
                  : `Keep spending to unlock the next reward.`}
              </p>
            </div>
          </div>

          {/* Milestone list */}
          <section className="rounded-xl bg-white shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                Loading milestones…
              </div>
            ) : (
              <div className="divide-y">
                {MILESTONES.map((m) => {
                  const earned = awardedByAmount[m.amount];
                  return (
                    <div key={m.amount} className="flex items-center gap-4 p-4">
                      <div
                        className={`size-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                          earned
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {earned ? "✓" : "🎯"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          Spend {m.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {m.reward} (up to milestone value)
                        </div>
                        {earned && (
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs bg-green-50 border border-green-200 text-green-800 px-2 py-0.5 rounded">
                              {earned.couponCode}
                            </span>
                            {earned.isValid ? (
                              <span className="text-xs text-green-600">
                                Valid until{" "}
                                {new Date(earned.expiresAt).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Expired / Used
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                        className={`text-xs font-medium shrink-0 ${
                          earned ? "text-green-600" : "text-muted-foreground"
                        }`}
                      >
                        {earned ? "Earned 🎉" : "Locked"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
