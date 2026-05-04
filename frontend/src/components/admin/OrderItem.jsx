import { cn } from "@/lib/utils";
import {
  AlarmExclamation,
  Archive,
  ClockDashedHalf,
  CreditCardAlt,
  Rupee,
} from "@boxicons/react";
import { Link } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";

const STATUS_META = {
  PLACED: {
    label: "Placed",
    tone: "bg-amber-100 text-amber-800 border-amber-200",
  },
  PREPARING: {
    label: "Preparing",
    tone: "bg-sky-100 text-sky-800 border-sky-200",
  },
  READY: {
    label: "Ready",
    tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  COMPLETED: {
    label: "Completed",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "bg-rose-100 text-rose-700 border-rose-200",
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

function toneForPaymentStatus(paymentStatus) {
  return PAYMENT_STATUS_META[paymentStatus] || PAYMENT_STATUS_META.PENDING;
}

function summarizeItems(order) {
  const items = order?.items || [];
  if (!items.length) return "No items attached";
  return items
    .slice(0, 3)
    .map((item) => `${item.name || "Item"} ×${item.quantity}`)
    .join(", ");
}

export default function OrderItem({ order }) {
  return (
    <article className={cn(`text-left`)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full">
          <div className="flex gap-2 items-start justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-base font-medium">Order #{order.id}</span>
              <div className="flex gap-1">
                <Badge
                  variant="outline"
                  className={toneForStatus(order.status).tone}
                >
                  <Archive pack="filled" />
                  {toneForStatus(order.status).label}
                </Badge>
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
            </div>

            <div className="text-base font-semibold">
              {formatCurrency(order.total)}
            </div>
          </div>
          <div className="flex gap-1 items-center"></div>
          <div className="mt-2 text-sm text-slate-500">
            {order.phone} • {formatDateTime(order.createdAt)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Badge
          className={
            toneForPaymentStatus(order.paymentStatus || "PENDING").tone
          }
        >
          <CreditCardAlt pack="filled" /> Payment{" "}
          {toneForPaymentStatus(order.paymentStatus || "PENDING").label}
        </Badge>
        <Badge variant="ghost">
          <ClockDashedHalf />
          <span>{order.stageAgeMinutes} min in stage</span>
        </Badge>
      </div>
      <div className="mt-3 border bg-white rounded-lg px-4 py-2 text-sm text-slate-700">
        {summarizeItems(order)}
      </div>
    </article>
  );
}
