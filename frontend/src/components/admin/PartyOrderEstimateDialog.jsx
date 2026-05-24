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
import { submitPartyOrderEstimate } from "@/services/api";
import { toast } from "sonner";

export default function PartyOrderEstimateDialog({
  open,
  onOpenChange,
  orderId,
  onSubmitted,
}) {
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!estimatedAmount || Number(estimatedAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      await submitPartyOrderEstimate(orderId, {
        estimatedAmount: Number(estimatedAmount),
        currency: "INR",
      });
      toast.success("Estimate submitted successfully");
      setEstimatedAmount("");
      onSubmitted?.();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to submit estimate. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
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
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Estimate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
