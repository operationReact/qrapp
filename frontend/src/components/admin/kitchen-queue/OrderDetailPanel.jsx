import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  LoaderCircle,
  CreditCard,
  XCircle,
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
import {
  getAdminOrder,
  updateOrderStatusAdmin,
  downloadAdminInvoice,
  getOrderSupportRequests,
  resolveOrderSupportRequest,
  completeManualRefund,
} from "@/services/order-service";
import { cn, isOrderPaid, formatAge } from "@/lib/utils";
import { parseApiError, getBusinessErrorMessage } from "@/lib/api-error-parser";
import { useMarkOrderAsPaid } from "@/hooks/useOrderMutations";

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

const CANCEL_REASONS = [
  { value: "customer_requested", label: "Customer requested cancellation" },
  { value: "item_unavailable", label: "Item unavailable" },
  { value: "kitchen_issue", label: "Kitchen issue" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "duplicate_order", label: "Duplicate order" },
  { value: "other", label: "Other" },
];

function CancelOrderDialog({ isOpen, onOpenChange, order, onConfirm, isLoading }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  const handleConfirm = () => {
    if (!selectedReason) {
      toast.error("Please select a reason for cancelling.");
      return;
    }
    if (selectedReason === "other" && !otherReason.trim()) {
      toast.error("Please describe the reason.");
      return;
    }
    onConfirm(selectedReason === "other" ? otherReason.trim() : selectedReason);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-left">Cancel Order {order?.orderNumber}?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-700">
            Stock will be restored. Wallet and online payments are refunded automatically.
            Pay-at-stall orders need a manual refund.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Reason (required)</label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReason === "other" && (
              <input
                type="text"
                value={otherReason}
                onChange={(event) => setOtherReason(event.target.value)}
                maxLength={200}
                placeholder="Describe the reason"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Keep Order
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Cancel Order
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
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [manualRefundReference, setManualRefundReference] = useState("");

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["orders", "admin", orderId, { locationId }],
    queryFn: () => getAdminOrder(orderId, locationId),
    enabled: isOpen && !!orderId,
  });

  const { data: supportRequests = [] } = useQuery({
    queryKey: ["orders", "admin", orderId, "support-requests", { locationId }],
    queryFn: () => getOrderSupportRequests(orderId, locationId),
    enabled: isOpen && !!orderId,
  });

  const resolveSupportMutation = useMutation({
    mutationFn: (requestId) => resolveOrderSupportRequest(orderId, requestId, locationId),
    onSuccess: () => {
      toast.success("Support request marked resolved");
      queryClient.invalidateQueries({ queryKey: ["orders", "admin", orderId, "support-requests"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message || "Could not resolve request");
    },
  });

  const manualRefundMutation = useMutation({
    mutationFn: (reference) => completeManualRefund(orderId, reference, locationId),
    onSuccess: () => {
      toast.success("Refund marked complete");
      setManualRefundReference("");
      queryClient.invalidateQueries({ queryKey: ["orders", "admin", orderId] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message || "Could not complete refund");
    },
  });

  // Use shared hook for payment mutations
  const paymentMutation = useMarkOrderAsPaid(locationId, () => {
    setPaymentDialogOpen(false);
  });

  // Custom mutation for stage/status changes
  const stageMutation = useMutation({
    mutationFn: ({ status, reason }) =>
      updateOrderStatusAdmin(orderId, { status, reason }, locationId),
    onError: (error) => {
      const parsedError = parseApiError(error);

      // Payment-specific error handling
      if (parsedError.code === "PAYMENT_REQUIRED_FOR_HANDOVER") {
        toast.error("Payment is required before hand over. Mark as Paid first.");
        return;
      }

      // Reason required for corrective transitions
      if (parsedError.message?.includes("Reason is required")) {
        toast.error("Please provide a reason for this correction");
        return;
      }

      const message = parsedError.isBusinessError
        ? getBusinessErrorMessage(parsedError.code, parsedError.message)
        : parsedError.message;

      toast.error(message);
    },
    onSuccess: () => {
      toast.success("Order updated successfully");
      setStageControlOpen(false);
      setCancelDialogOpen(false);
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
    stageMutation.mutate({ status: targetStatus, reason });
  };

  const handleCancelConfirm = (reason) => {
    stageMutation.mutate({ status: "CANCELLED", reason });
  };

  const handleMarkAsPaid = () => {
    paymentMutation.mutate(orderId);
  };

  const handleInvoiceDownload = async () => {
    if (invoiceDownloading) return;
    setInvoiceDownloading(true);
    try {
      const blob = await downloadAdminInvoice(orderId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `BroAndBro-Invoice-${order?.orderNumber || orderId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to download the invoice.");
    } finally {
      setInvoiceDownloading(false);
    }
  };

  if (!isOpen) return null;

  const paid = order && isOrderPaid(order);
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
                      {order.refundStatus === "REFUNDED" ? "REFUNDED" : paid ? "PAID" : "UNPAID"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Order Financial Summary</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-gray-50 p-3 text-sm">
                      <span className="text-gray-500">Base Amount</span>
                      <span className="text-right font-medium">₹{Number(order.baseAmount || 0).toFixed(2)}</span>
                      <span className="text-gray-500">Discount</span>
                      <span className="text-right font-medium">₹{Number(order.discountAmount || 0).toFixed(2)}</span>
                      <span className="text-gray-500">Taxable Amount</span>
                      <span className="text-right font-medium">₹{Number(order.taxableAmount || 0).toFixed(2)}</span>
                      <span className="text-gray-500">CGST</span>
                      <span className="text-right font-medium">₹{Number(order.cgstAmount || 0).toFixed(2)}</span>
                      <span className="text-gray-500">SGST</span>
                      <span className="text-right font-medium">₹{Number(order.sgstAmount || 0).toFixed(2)}</span>
                      <span className="text-gray-500">Total GST</span>
                      <span className="text-right font-medium">₹{Number(order.totalTax || 0).toFixed(2)}</span>
                      <span className="font-semibold text-gray-900">Customer Paid</span>
                      <span className="text-right font-bold">₹{Number(order.customerPaid || order.total || 0).toFixed(2)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleInvoiceDownload}
                      disabled={invoiceDownloading}
                      className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {invoiceDownloading ? "Downloading invoice..." : "Download Invoice"}
                    </button>
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
                        disabled={paymentMutation.isPending}
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

                {order.status === "CANCELLED" && (
                  <div className="space-y-1 rounded-lg bg-red-50 p-3 text-sm">
                    <p className="font-semibold text-red-800">
                      Cancelled{order.cancelReason ? `: ${order.cancelReason}` : ""}
                    </p>
                    {order.cancelledBy && (
                      <p className="text-xs text-red-700">
                        By {order.cancelledBy}
                        {order.cancelledAt ? ` at ${new Date(order.cancelledAt).toLocaleString()}` : ""}
                      </p>
                    )}
                    {order.refundStatus === "REFUNDED" && (
                      <p className="text-xs text-emerald-700">
                        Refunded ₹{Number(order.refundAmount || 0).toFixed(2)}
                        {order.refundReference ? ` (ref ${order.refundReference})` : ""}
                      </p>
                    )}
                    {order.refundStatus === "PENDING" && (
                      <p className="text-xs text-amber-700">
                        Refund of ₹{Number(order.refundAmount || order.grandTotal || 0).toFixed(2)} is being processed. Reopen the order to see the latest status.
                      </p>
                    )}
                    {order.refundStatus === "MANUAL_REQUIRED" && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-amber-700">
                          Automatic refund needs attention. Return ₹{Number(order.refundAmount || order.grandTotal || 0).toFixed(2)} to the customer, or verify it on the Razorpay dashboard, then enter the reference below.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={manualRefundReference}
                            onChange={(e) => setManualRefundReference(e.target.value)}
                            placeholder="Refund reference"
                            maxLength={120}
                            className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            disabled={!manualRefundReference.trim() || manualRefundMutation.isPending}
                            onClick={() => manualRefundMutation.mutate(manualRefundReference.trim())}
                            className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {manualRefundMutation.isPending ? "Saving..." : "Mark refunded"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {order.availableTransitions?.includes("CANCELLED") && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900">Cancel Order</h3>
                    <button
                      type="button"
                      onClick={() => setCancelDialogOpen(true)}
                      className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel order and refund
                    </button>
                  </div>
                )}

                {supportRequests.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Support requests</h3>
                    <div className="space-y-2">
                      {supportRequests.map((req) => (
                        <div key={req.id} className="space-y-2 rounded-lg border border-gray-200 p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-semibold",
                                req.status === "RESOLVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              )}
                            >
                              {req.status}
                            </span>
                            {req.createdAt && (
                              <span className="text-xs text-gray-500">
                                {new Date(req.createdAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap text-gray-800">{req.message}</p>
                          {req.status === "OPEN" && (
                            <button
                              type="button"
                              onClick={() => resolveSupportMutation.mutate(req.id)}
                              disabled={resolveSupportMutation.isPending}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Mark resolved
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
        isLoading={stageMutation.isPending}
      />

      <CancelOrderDialog
        isOpen={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        order={order}
        onConfirm={handleCancelConfirm}
        isLoading={stageMutation.isPending}
      />

      <PaymentConfirmationDialog
        isOpen={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        order={order}
        onConfirm={handleMarkAsPaid}
        isLoading={paymentMutation.isPending}
      />
    </>
  );
}
