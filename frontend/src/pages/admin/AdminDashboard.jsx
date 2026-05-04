import AdminHeader from "@/components/admin/AdminHeader";
import FlaggedOrders from "@/components/admin/FlaggedOrders";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import {
  Archive,
  Broadcast,
  CalendarDownArrow,
  Check,
  ClockDashedHalf,
  Workflow
} from "@boxicons/react";
import { useEffect, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function AdminDashboard() {
  const { ordersPage, dashboard, loadData } = useAdminDashboard();

  const stats = [
    {
      label: "Live orders",
      value: dashboard?.liveOrders ?? 0,
      subtext: "Orders needing action right now",
      icon: Broadcast,
      tone: "bg-purple-50 text-purple-600",
    },
    {
      label: "Placed",
      value: dashboard?.placedOrders ?? 0,
      subtext: "Freshly created and waiting",
      icon: Archive,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Preparing",
      value: dashboard?.preparingOrders ?? 0,
      subtext: "Kitchen currently working",
      icon: Workflow,
      tone: "bg-orange-50 text-orange-600",
    },
    {
      label: "Ready",
      value: dashboard?.readyOrders ?? 0,
      subtext: "Ready for pickup / handoff",
      icon: Check,
      tone: "bg-teal-50 text-teal-600",
    },
    {
      label: "Delayed",
      value: dashboard?.delayedOrders ?? 0,
      subtext: "Orders outside expected SLA",
      icon: ClockDashedHalf,
      tone: "bg-red-50 text-red-600",
    },
    {
      label: "Completed today",
      value: dashboard?.completedToday ?? 0,
      subtext: `${dashboard?.averageFulfillmentMinutes ?? 0} min avg fulfillment`,
      icon: CalendarDownArrow,
      tone: "bg-green-50 text-green-600",
    },
  ];

  const location = useLocation();
  const { admin } = useAdminAuth();

  useEffect(() => {
    loadData({ quiet: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flaggedOrders = useMemo(() => {
    return (ordersPage.content || []).filter(
      (order) => order.delayed || order.priority === "URGENT",
    );
  }, [ordersPage.content]);

  if (!admin?.username || !admin?.password) {
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
        {/* <Link
          to="/admin/service-board#flagged-orders"
          className="flex mt-5 py-3 group px-4 bg-amber-50 border border-amber-200 rounded-lg flex-wrap items-center justify-between"
        >
          <div className="flex items-start flex-1 gap-2 text-amber-800">
            <AlertCircle className="size-5 mt-1 animate-alarm shrink-0" />
            <div>
              <h2 className="font-medium">
                {flaggedOrders.length} orders need your attention
              </h2>
              <p className="text-sm text-amber-800">
                These orders are either delayed, urgent, or waiting to be handed
                over
              </p>
            </div>
          </div>
          <ChevronRight className="text-amber-800 group-hover:translate-x-1 duration-200 transition-transform" />
        </Link>*/}

        <div className="grid mt-4 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg flex flex-col gap-2 overflow-hidden relative border pt-3"
            >
              <span
                className={`absolute size-7 grid place-items-center rounded-lg right-2 top-2 ${stat.tone}`}
              >
                <stat.icon pack="filled" className="size-5" />
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
