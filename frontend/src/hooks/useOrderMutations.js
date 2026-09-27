import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateOrderStatusAdmin } from "@/services/order-service";
import { parseApiError, getBusinessErrorMessage } from "@/lib/api-error-parser";

/**
 * Shared hook for marking orders as paid.
 * Used by both collapsed card and expanded panel.
 */
export function useMarkOrderAsPaid(locationId, onSuccess) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId) =>
      updateOrderStatusAdmin(orderId, { paymentStatus: "PAID" }, locationId),
    onError: (error) => {
      const parsedError = parseApiError(error);
      const message = parsedError.isBusinessError
        ? getBusinessErrorMessage(parsedError.code, parsedError.message)
        : parsedError.message;

      toast.error(message);
    },
    onSuccess: () => {
      toast.success("Payment marked successfully");
      // Invalidate all relevant order queries
      queryClient.invalidateQueries({ queryKey: ["orders", "admin", "live"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
  });
}

/**
 * Shared hook for updating order status (hand over, change stage, etc).
 * Handles both payment and stage-related errors correctly.
 */
export function useUpdateOrderStatus(orderId, locationId, onSuccess) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ status, reason, paymentStatus }) =>
      updateOrderStatusAdmin(orderId, { status, reason, paymentStatus }, locationId),
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
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["orders", "admin", "live"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "admin", orderId] });

      if (onSuccess) {
        onSuccess();
      }
    },
  });
}
