import AdminHeader from "@/components/admin/AdminHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import {
  AlarmExclamation,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ClockDashedHalf,
  Package,
  PlayCircle
} from "@boxicons/react";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

const STATUS_META = {
  PLACED: {
    label: "Placed",
    tone: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Package,
  },
  PREPARING: {
    label: "Preparing",
    tone: "bg-sky-100 text-sky-800 border-sky-200",
    icon: PlayCircle,
  },
  READY: {
    label: "Ready",
    tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: CheckCircle,
  },
  COMPLETED: {
    label: "Completed",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "bg-rose-100 text-rose-700 border-rose-200",
    icon: AlertCircle,
  },
};

const PAYMENT_STATUS_META = {
  PENDING: {
    label: "Pending",
    tone: "bg-amber-100 text-amber-800 border-amber-200",
  },
  PAID: {
    label: "Paid",
    tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
};

const PRIORITY_META = {
  NORMAL: {
    label: "Normal",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
  },
  HIGH: {
    label: "High",
    tone: "bg-orange-100 text-orange-700 border-orange-200",
  },
  URGENT: {
    label: "Urgent",
    tone: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

const LIVE_STAGES = ["PLACED", "PREPARING", "READY"];

function formatCurrency(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function toneForStatus(status) {
  return STATUS_META[status] || STATUS_META.PLACED;
}

function toneForPriority(priority) {
  return PRIORITY_META[priority] || PRIORITY_META.NORMAL;
}

function summarizeItems(order) {
  const items = order?.items || [];
  if (!items.length) return "No items attached";
  return items
    .slice(0, 3)
    .map((item) => `${item.name || "Item"} ×${item.quantity}`)
    .join(", ");
}

export default function ServiceBoard() {
  const { ordersPage, loading, handleOrderUpdate, loadData } =
    useAdminDashboard();

  useEffect(() => {
    loadData({ quiet: true });
  }, []);

  const groupedLiveOrders = useMemo(() => {
    return LIVE_STAGES.reduce((acc, stage) => {
      acc[stage] = (ordersPage.content || []).filter(
        (order) => order.status === stage,
      );
      return acc;
    }, {});
  }, [ordersPage.content]);

  return (
    <>
      <AdminHeader
        title="Service Board"
        description="Real-time fulfillment tracking and workflow management."
      />

      <div className="px-4 pb-4 mt-5">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {LIVE_STAGES.map((stage) => {
            const orders = groupedLiveOrders[stage] || [];
            const meta = toneForStatus(stage);
            const Icon = meta.icon;

            return (
              <div key={stage} className="flex flex-col min-h-[400px]">
                <div
                  className={`flex items-center justify-between p-3 rounded-t-2xl border-x border-t bg-white ${meta.tone.split(" ")[2]}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${meta.tone.split(" ")[0]}`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <h3 className="font-medium">{meta.label}</h3>
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-slate-100"
                  >
                    {orders.length}
                  </Badge>
                </div>

                <div className="flex-1 bg-slate-100/50 border rounded-b-2xl p-3 space-y-4">
                  {loading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-32 bg-white rounded-xl animate-pulse"
                      />
                    ))
                  ) : orders.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                      <Package className="size-6 mb-2 opacity-50" />
                      <span className="text-xs">No orders</span>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col"
                      >
                        <div className="w-full">
                          <div className="flex gap-2 flex-wrap items-center justify-between">
                            <div className="flex gap-2 items-center">
                              <Link
                                to={`/admin/operational-queue/${order.id}`}
                                className="text-base font-medium hover:text-primary transition-colors"
                              >
                                Order #{order.id}
                              </Link>
                              <Badge
                                variant="outline"
                                className={toneForPriority(order.priority).tone}
                              >
                                {toneForPriority(order.priority).label}
                              </Badge>
                              {order.delayed && (
                                <Badge variant="destructive">
                                  <AlarmExclamation pack="filled" /> Delayed
                                </Badge>
                              )}
                            </div>
                            <div className="text-base font-semibold">
                              {formatCurrency(order.total)}
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-slate-500">
                            {order.phone} • {formatDateTime(order.createdAt)}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {/* <Badge
                              className={
                                toneForPaymentStatus(
                                  order.paymentStatus || "PENDING",
                                ).tone
                              }
                            >
                              <CreditCardAlt pack="filled" /> Payment{" "}
                              {
                                toneForPaymentStatus(
                                  order.paymentStatus || "PENDING",
                                ).label
                              }
                            </Badge>*/}
                          <Badge variant="ghost" className="h-auto">
                            <ClockDashedHalf />
                            {order.stageAgeMinutes} min in stage
                          </Badge>
                        </div>

                        <div className="mt-3 border bg-slate-50/50 rounded-xl px-3 py-2 text-sm text-slate-700 italic">
                          {summarizeItems(order)}
                        </div>

                        <div className="mt-2 pt-2 flex gap-2">
                          {(order.availableTransitions || [])
                            .slice(0, 2)
                            .map((nextStatus) => (
                              <Button
                                key={`${order.id}-${nextStatus}`}
                                size="sm"
                                variant="outline"
                                className="font-medium! text-sm!"
                                onClick={() =>
                                  handleOrderUpdate(order.id, {
                                    status: nextStatus,
                                  })
                                }
                              >
                                Move to {toneForStatus(nextStatus).label}
                                <ChevronRight />
                              </Button>
                            ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
