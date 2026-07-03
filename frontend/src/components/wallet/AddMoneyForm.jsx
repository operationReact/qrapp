import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { walletCreateOrder, walletVerifyPayment } from "@/services/wallet-service";
import { cn } from "@/lib/utils";

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000];

function useToast() {
  const [message, setMessage] = useState(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3200);
    return () => clearTimeout(t);
  }, [message]);
  return {
    message,
    show: useCallback((value) => setMessage(value), []),
  };
}

function loadRazorpayScript(
  src = "https://checkout.razorpay.com/v1/checkout.js",
) {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Razorpay SDK failed to load"));
    document.body.appendChild(script);
  });
}

export default function AddMoneyForm({ className, onSuccess, onError }) {
  const [amount, setAmount] = useState("500");
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const createOrder = useMutation({
    mutationFn: walletCreateOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  const verifyPayment = useMutation({
    mutationFn: walletVerifyPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  async function handleAddMoney() {
    const amountRupees = Number(amount);
    if (!Number.isFinite(amountRupees) || amountRupees < 1) {
      toast.show("Enter at least ₹1 to add money");
      return;
    }

    setAdding(true);
    setError("");
    try {
      const order = await createOrder.mutateAsync({ amount: amountRupees });
      const orderId = order.razorpayOrderId;

      if (!orderId) {
        throw new Error("Missing wallet order id from server");
      }

      if (!order.keyId) {
        throw new Error("Missing Razorpay key from server");
      }

      await loadRazorpayScript();

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: orderId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Bro & Bro",
        description: "Add money to wallet",
        handler: async (paymentResponse) => {
          try {
            await verifyPayment.mutateAsync({
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
            });
            await onSuccess?.();
            toast.show("Wallet credited successfully");
          } catch (verifyError) {
            console.error("wallet verify failed", verifyError);
            const message =
              typeof verifyError?.response?.data === "string"
                ? verifyError.response.data
                : verifyError?.message || "Payment verification failed";
            setError(message);
            onError(message);
            toast.show(message);
          }
        },
      });

      rzp.on("payment.failed", (paymentError) => {
        console.error("wallet payment failed", paymentError);
        const message =
          paymentError?.error?.description ||
          "Payment failed. Please try again.";
        setError(message);
        toast.show(message);
      });

      rzp.open();
    } catch (err) {
      console.error("wallet top-up failed", err);
      setError(
        typeof err?.response?.data === "string"
          ? err.response.data
          : err?.message || "Unable to add money right now.",
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <div
        className={cn("rounded-lg border bg-white p-5", className)}
      >
        <div className="mb-5 flex gap-4">
          <img src="/coin-plus.svg" alt="Plus" className="size-11 shrink-0" />
          <div>
            <h3 className="font-semibold">Add Money</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Top up securely and use your wallet at checkout.
            </p>
          </div>
        </div>
        <label className="sr-only mt-5 block text-sm font-medium text-gray-700">
          Amount (₹)
        </label>
        <div className="mt-2 flex flex-col gap-3">
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-base outline-none transition focus:border-[#F3CE4D]"
            placeholder="Amount (₹)"
          />
          <div className="mt-0 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setAmount(String(amount))}
                className="whitespace-nowrap rounded-sm border text-muted-foreground px-2 py-1 text-sm font-medium! hover:bg-amber-50 hover:border-amber-200 hover:text-black"
              >
                ₹{amount}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddMoney}
            disabled={adding}
            className="touch-button rounded-md bg-[#F3CE4D] px-5 py-3 text-sm font-semibold! text-black shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {adding ? "Processing..." : "Add Money"}
          </button>
        </div>

        <div className="mt-4 text-center px-4 py-3 text-sm text-muted-foreground">
          Payments secured by{" "}
          <img
            src="/razorpay-icon.svg"
            alt="Razorpay"
            className="inline-block h-4"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {toast.message && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          {toast.message}
        </div>
      )}
    </>
  );
}
