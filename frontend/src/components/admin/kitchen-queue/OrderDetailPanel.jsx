import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  LoaderCircle,
  CreditCard,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminOrder, updateOrderStatusAdmin } from "@/services/order-service";
import { cn, isOrderPaid, formatAge } from "@/lib/utils";

const STATUS_META = {
  ORDER_PLACED: { label: "New", color: "#7C3AED", dot: "bg-[#7C3AED]" },
  PREPARING: { label: "Cooking", color: "#EA580C", dot: "bg-[#EA580C]" },
  READY: { label: "Ready", color: "#16A34A", dot: "bg-[#16A34A]" },
  COMPLETED: { label: "Hand Over", color: "#10B981", dot: "bg-[#10B981]" },
  CANCELLED: { label: "Cancelled", color: "#EF4444", dot: "bg-[#EF4444]" },
};

const FORWARD_ACTIONS = {
  ORDER_PLACED: { target: "PREPARING", label: "Start Preparing" },
  PREPARING: { target: "READY", label: "Mark Ready" },
  READY: { target: "COMPLETED", label: "Hand Over" },
};

const BACKWARD_ACTIONS = {
  PREPARING: { target: "ORDER_PLACED", label: "Move to New", requiresReason: true },
  READY: { target: "PREPARING", label: "Move to Cooking", requiresReason: true },
  COMPLETED: { target: "READY", label: "Move to Ready", requiresReason: true },
};

const BACKWARD_REASONS = [
  { value: "incorrect_advancement", label: "Incorrectly advanced" },
  { value: "payment_pending", label: "Payment not completed" },
  { value: "preparation_issue", label: "Item preparation issue" },
  { value: "customer_request", label: "Customer requested change" },
  { value: "operational_correction", label: "Operational correction" },
  { value: "other", label: "Other" },
];

function TimelineEntry({ entry, index, total }) {
  const statusMeta = STATUS_META[entry.newStatus];

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn("size-3 rounded-full border-2", statusMeta?.dot)}
          style={{ borderColor: statusMeta?.color }}
          aria-hidden="true"
        />
        {index < total - 1 && (
          <div
            className="w-0.5 flex-1 bg-gray-200"
            style={{ height: "3rem" }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold text-sm text-gray-900">
              {statusMeta?.label || entry.newStatus}
            </h4>
            {entry.reason && (
              <p className="text-xs text-gray-500 mt-1">
                Reason: {entry.reason}
              </p>
            )}
            {entry.note && (
              <p className="text-xs text-gray-600 mt-1">
                {entry.note}
              </p>
            )}
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {entry.changedAt && new Date(entry.changedAt).toLocaleString()}
          </span>
        </div>
        {entry.changedBy && (
          <p className="text-xs text-gray-500 mt-1">
            by {entry.changedBy}
          </p>
        )}
      </div>
    </div>
  );
}

function PaymentConfirmationDialog({
  isOpen,
  onOpenChange,
  order,
  onConfirm,
  isLoading,
}) {
  if (!order) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[20px]">
        <DialogHeader>
          <DialogTitle className="text-left">Mark Payment as Received?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">Order</p>
            <p className="font-semibold text-gray-900">{order.orderNumber}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">Amount</p>
            <p className="font-semibold text-gray-900">₹{order.total?.toFixed(0) || 0}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">Current Payment Status</p>
            <span className="inline-block px-3 py-1 rounded bg-yellow-100 text-yellow-700 text-sm font-semibold">
              UNPAID
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">New Payment Status</p>
            <span className="inline-block px-3 py-1 rounded bg-green-100 text-green-700 text-sm font-semibold">
              PAID
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading && <LoaderCircle size={16} className="animate-spin" />}
            Mark as Paid
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StageControlDialog({
  isOpen,
  onOpenChange,
  order,
  targetStatus,
  isBackward,
  onConfirm,
  isLoading,
}) {
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  const handleConfirm = () => {
    if (isBackward && !selectedReason) {
      toast.error("Please select a reason for moving back.");
      return;
    }
    if (selectedReason === "other" && !otherReason.trim()) {
      toast.error("Please provide a reason.");
      return;
    }
    const reason = selectedReason === "other" ? otherReason : selectedReason;
    onConfirm(reason);
  };

  const currentMeta = STATUS_META[order?.status];
  const targetMeta = STATUS_META[targetStatus];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[20px]">
        <DialogHeader>
          <DialogTitle className="text-left">
            {isBackward ? "Move Order Back?" : "Advance Order?"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Current Stage</p>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: currentMeta?.color }}
                aria-hidden="true"
              />
              <span className="font-semibold text-sm text-gray-900">
                {currentMeta?.label}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">New Stage</p>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: targetMeta?.color }}
                aria-hidden="true"
              />
              <span className="font-semibold text-sm text-gray-900">
                {targetMeta?.label}
              </span>
            </div>
          </div>

          {isBackward && (
            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium text-gray-700">
                Reason (Required)
              </label>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger id="reason" className="rounded-lg">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {BACKWARD_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedReason === "other" && (
                <input
                  type="text"
                  placeholder="Please explain..."
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading && <LoaderCircle size={16} className="animate-spin" />}
            {isBackward ? "Move Back" : "Advance"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KitchenQueueOrderDetailPanel({
  orderId,
  isOpen,
  onOpenChange,
  locationId,
}) {
  const queryClient = useQueryClient();
  const [stageControlOpen, setStageControlOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null);
  const [isBackwardMove, setIsBackwardMove] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["orders", "admin", orderId],
    queryFn: () => getAdminOrder(orderId, locationId),
    enabled: isOpen && !!orderId,
  });

  // Update order status mutation
  const updateMutation = useMutation({
    mutationFn: ({ status, reason, paymentStatus }) =>
      updateOrderStatusAdmin(orderId, { status, reason, paymentStatus }, locationId),
    onError: (error) => {
      const message = error?.response?.data?.message || "Failed to update order";
      if (message.includes("PAYMENT_REQUIRED_FOR_HANDOVER")) {
        // Extract payment status from message: "... Current payment status: PENDING"
        const statusMatch = message.match(/Current payment status: (\w+)/);
        const status = statusMatch ? statusMatch[1] : "pending";
        toast.error(`Cannot hand over: Payment is ${status}. Mark as Paid first.`);
      } else if (message.includes("Reason is required")) {
        toast.error("Please provide a reason for this correction");
      } else if (message.includes("PAYMENT_REQUIRED")) {
        toast.error("Payment required before hand over");
      } else {
        toast.error(message);
      }
    },
    onSuccess: () => {
      toast.success("Order updated successfully");
      setStageControlOpen(false);
      setPaymentDialogOpen(false);
      setTargetStatus(null);
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["orders", "admin", "live"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "admin", orderId] });
    },
  });

  const handleStageChange = (newStatus, isBackward = false) => {
    setTargetStatus(newStatus);
    setIsBackwardMove(isBackward);
    setStageControlOpen(true);
  };

  const handleStageConfirm = (reason) => {
    updateMutation.mutate({ status: targetStatus, reason });
  };

  const handleMarkAsPaid = () => {
    updateMutation.mutate({ paymentStatus: "PAID" });
  };

  if (!isOpen) return null;

  const paid = order && isOrderPaid(order);
  const canHandOver =
    order?.status === "READY" &&
    paid &&
    FORWARD_ACTIONS[order.status]?.target === "COMPLETED";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-[20px] max-w-2xl max-h-[90vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoaderCircle size={24} className="animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-600">Failed to load order details</p>
            </div>
          ) : order ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-left text-lg font-bold text-gray-900">
                  {order.orderNumber}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Order Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Order Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="size-2 rounded-full"
                          style={{ backgroundColor: STATUS_META[order.status]?.color }}
                          aria-hidden="true"
                        />
                        <p className="font-medium">{STATUS_META[order.status]?.label}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500">Elapsed Time</p>
                      <p className="font-medium mt-1">{formatAge(order.ageMinutes)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="font-medium mt-1 text-xs">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Customer</p>
                      <p className="font-medium mt-1">{order.userName || order.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Payment</h3>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">
                      ₹{order.total?.toFixed(0) || 0}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-1 rounded",
                        paid
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      )}
                    >
                      {paid ? "PAID" : "UNPAID"}
                    </span>
                  </div>
                  {!paid && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle size={14} />
                      Payment required before hand over
                    </p>
                  )}
                </div>

                {/* Items */}
                {order.items && order.items.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Items</h3>
                    <ul className="space-y-2">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between text-sm">
                          <span>
                            {item.quantity}× {item.name}
                          </span>
                          <span className="text-gray-600">₹{item.subtotal?.toFixed(0)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Stage Control & Payment Actions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {paid ? "Stage Control" : "Payment & Stage Control"}
                  </h3>
                  <div className="space-y-2">
                    {/* Mark as Paid button for unpaid orders */}
                    {!paid && order.status === "READY" && (
                      <button
                        type="button"
                        onClick={() => setPaymentDialogOpen(true)}
                        disabled={updateMutation.isPending}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                      >
                        <span>Mark as Paid</span>
                        <CreditCard size={16} />
                      </button>
                    )}

                    {/* Forward action (disabled if payment required) */}
                    {FORWARD_ACTIONS[order.status] && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleStageChange(FORWARD_ACTIONS[order.status].target, false)
                          }
                          disabled={
                            order.status === "READY" && !paid
                          }
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors",
                            order.status === "READY" && !paid
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          )}
                        >
                          <span>{FORWARD_ACTIONS[order.status].label}</span>
                          <ArrowRight size={16} />
                        </button>
                        {order.status === "READY" && !paid && (
                          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg flex items-center gap-1">
                            <AlertTriangle size={14} />
                            Mark as Paid before handing over
                          </p>
                        )}
                      </>
                    )}

                    {/* Backward action */}
                    {BACKWARD_ACTIONS[order.status] && (
                      <button
                        type="button"
                        onClick={() =>
                          handleStageChange(BACKWARD_ACTIONS[order.status].target, true)
                        }
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors bg-orange-100 text-orange-700 hover:bg-orange-200"
                      >
                        <span>{BACKWARD_ACTIONS[order.status].label}</span>
                        <ArrowLeft size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline/History */}
                {order.history && order.history.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Timeline</h3>
                    <div className="space-y-4">
                      {order.history.map((entry, idx) => (
                        <TimelineEntry
                          key={idx}
                          entry={entry}
                          index={idx}
                          total={order.history.length}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <StageControlDialog
        isOpen={stageControlOpen}
        onOpenChange={setStageControlOpen}
        order={order}
        targetStatus={targetStatus}
        isBackward={isBackwardMove}
        onConfirm={handleStageConfirm}
        isLoading={updateMutation.isPending}
      />

      <PaymentConfirmationDialog
        isOpen={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        order={order}
        onConfirm={handleMarkAsPaid}
        isLoading={updateMutation.isPending}
      />
    </>
  );
}
