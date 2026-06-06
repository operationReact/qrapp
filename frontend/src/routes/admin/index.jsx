import { createFileRoute, Navigate, useLocation } from "@tanstack/react-router";
import AdminHeader from "@/components/admin/AdminHeader";
import FlaggedOrders from "@/components/admin/FlaggedOrders";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ArchiveIcon,
  BroadcastIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  CookingPotIcon,
} from "@phosphor-icons/react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { ordersPage, dashboard, loadData } = useAdminDashboard();

  const stats = [
    {
      label: "Live orders",
      value: dashboard?.liveOrders ?? 0,
      subtext: "Orders needing action right now",
      icon: BroadcastIcon,
      tone: "bg-purple-50 text-purple-600",
    },
    {
      label: "Placed",
      value: dashboard?.placedOrders ?? 0,
      subtext: "Freshly created and waiting",
      icon: ArchiveIcon,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Preparing",
      value: dashboard?.preparingOrders ?? 0,
      subtext: "Kitchen currently working",
      icon: CookingPotIcon,
      tone: "bg-orange-50 text-orange-600",
    },
    {
      label: "Ready",
      value: dashboard?.readyOrders ?? 0,
      subtext: "Ready for pickup / handoff",
      icon: CheckCircleIcon,
      tone: "bg-teal-50 text-teal-600",
    },
    {
      label: "Delayed",
      value: dashboard?.delayedOrders ?? 0,
      subtext: "Orders outside expected SLA",
      icon: ClockCountdownIcon,
      tone: "bg-red-50 text-red-600",
    },
    {
      label: "Completed today",
      value: dashboard?.completedToday ?? 0,
      subtext: `${dashboard?.averageFulfillmentMinutes ?? 0} min avg fulfillment`,
      icon: CalendarCheckIcon,
      tone: "bg-green-50 text-green-600",
    },
  ];

  const location = useLocation();
  const { isAdmin, isSuperUser } = useAuth();

  useEffect(() => {
    loadData({ quiet: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const flaggedOrders = useMemo(() => {
    return (ordersPage.content || []).filter((order) => order.delayed);
  }, [ordersPage.content]);

  if (!isAdmin && !isSuperUser) {
    return (
      <Navigate to={"/login"} replace state={{ from: location.pathname }} />
    );
  }

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Get an overview of your orders and menu items."
      />
      <div className="pb-4 w-full px-4">
        <div className="grid mt-4 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg flex flex-col gap-2 overflow-hidden relative border pt-3"
            >
              <span
                className={`absolute size-7 grid place-items-center rounded-lg right-2 top-2 ${stat.tone}`}
              >
                <stat.icon weight="fill" className="size-5" />
              </span>
              <div className="text-2xl font-semibold px-4">{stat.value}</div>
              <div className={`${stat.tone} pb-3 pt-2 flex-1`}>
                <div className={`text-sm font-medium px-4 ${stat.tone}`}>
                  {stat.label}
                </div>
                <div className="text-xs mt-1 text-muted-foreground px-4">
                  {stat.subtext}
                </div>
              </div>
            </div>
          ))}
        </div>

        {flaggedOrders.length > 0 ? (
          <div className="mt-5">
            <FlaggedOrders flaggedOrders={flaggedOrders} />
          </div>
        ) : null}
      </div>
    </>
  );
}

