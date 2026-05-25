import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitPartyOrderEstimate } from "@/services/party-order-service";
import { toast } from "sonner";

export default function PartyOrderEstimateDialog({
  open,
  onOpenChange,
  orderId,
  onSubmitted,
}) {
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: (data) => submitPartyOrderEstimate(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party-orders'] });
      setEstimatedAmount("");
      onSubmitted?.();
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!estimatedAmount || Number(estimatedAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      await submitMutation.mutateAsync({
        estimatedAmount: Number(estimatedAmount),
        currency: "INR",
      });
      toast.success("Estimate submitted successfully");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to submit estimate. Please try again.";
      toast.error(message);
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setEstimatedAmount("");
      setError("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Estimate</DialogTitle>
          <DialogDescription>
            Enter the estimated amount for this party order.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Field>
            <FieldLabel>Estimated Amount (INR)</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 15000"
                value={estimatedAmount}
                onChange={(e) => setEstimatedAmount(e.target.value)}
                aria-invalid={!!error}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </FieldContent>
          </Field>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : "Submit Estimate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
