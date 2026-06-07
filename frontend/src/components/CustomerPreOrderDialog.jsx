import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createPreOrder } from "@/services/order-service";
import { walletGetBalance } from "@/services/wallet-service";
import { preOrderItemsOptions } from "@/query/options/orders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarCheckIcon,
  PhoneIcon,
  MinusIcon,
  PlusIcon,
  TruckIcon,
  InfoIcon,
  LeafIcon,
  WalletIcon,
  CreditCardIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ── Razorpay loader ───────────────────────────────────────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ── Next working day ──────────────────────────────────────────────────────────
function getNextWorkingDay() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}

function formatDeliveryDate(d) {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatCurrency(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CustomerPreOrderDialog({
  initialItem,
  open,
  onOpenChange,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: allItems = [], isLoading } = useQuery(preOrderItemsOptions);

  const deliveryDate = useMemo(() => getNextWorkingDay(), []);
  const deliveryLabel = formatDeliveryDate(deliveryDate);
  const scheduledAt = deliveryDate.toISOString().slice(0, 19);

  const [quantities, setQuantities] = useState(() =>
    initialItem ? { [initialItem.id]: 1 } : {},
  );
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("RAZORPAY");
  const [walletBalance, setWalletBalance] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset when different item clicked
  const [lastInitial, setLastInitial] = useState(initialItem?.id);
  if (initialItem?.id !== lastInitial) {
    setLastInitial(initialItem?.id);
    setQuantities(initialItem ? { [initialItem.id]: 1 } : {});
  }

  // Load wallet balance when logged in
  useEffect(() => {
    if (!user?.token) {
      setWalletBalance(null);
      return;
    }
    walletGetBalance()
      .then((r) => setWalletBalance(Number(r?.balance ?? 0)))
      .catch(() => setWalletBalance(null));
  }, [user?.token, open]);

  const setQty = (itemId, delta) => {
    setQuantities((prev) => {
      const next = (prev[itemId] ?? 0) + delta;
      if (next <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const selectedItems = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => {
          const item = allItems.find((i) => String(i.id) === String(id));
          return item ? { item, qty: q } : null;
        })
        .filter(Boolean),
    [quantities, allItems],
  );

  const grandTotal = useMemo(
    () =>
      selectedItems.reduce(
        (s, { item, qty }) => s + (item.price ?? 0) * qty,
        0,
      ),
    [selectedItems],
  );

  const canPayWallet =
    walletBalance !== null && walletBalance >= grandTotal && grandTotal > 0;
  const isValid = phone.trim().length >= 10 && selectedItems.length > 0;

  const handleCheckout = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const res = await createPreOrder({
        phone: phone.trim(),
        scheduledAt,
        paymentMethod,
        customerNote: note.trim() || undefined,
        items: selectedItems.map(({ item, qty }) => ({
          itemId: item.id,
          quantity: qty,
        })),
      });

      if (paymentMethod === "WALLET") {
        onOpenChange(false);
        navigate({
          to: "/success",
          state: {
            paymentMethod: "WALLET",
            orderNumber: res?.orderNumber,
            orderId: res?.orderId,
          },
        });
        return;
      }

      // Razorpay
      const { payment } = res;
      const rzpOrderId =
        payment?.rzpOrderId || payment?.orderId || payment?.order_id;
      if (!rzpOrderId) {
        toast.error("Payment preparation failed. Please try again.");
        return;
      }

      await loadRazorpayScript();
      const rzp = new window.Razorpay({
        key: payment.key,
        order_id: rzpOrderId,
        handler: () => {
          onOpenChange(false);
          navigate({
            to: "/success",
            state: {
              paymentMethod: "RAZORPAY",
              orderNumber: res?.orderNumber,
              orderId: res?.orderId,
            },
          });
        },
      });
      rzp.on("payment.failed", (e) => {
        toast.error(
          "Payment failed: " + (e?.error?.description ?? "Unknown error"),
        );
      });
      rzp.open();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to place pre-order";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs sm:max-w-sm mx-auto max-h-[70vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarCheckIcon className="size-5 text-primary" weight="fill" />
            Place Pre-Order
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Delivery banner */}
          <div className="rounded-lg bg-primary/3 border border-primary/5 px-4 py-3 flex items-start gap-3">
            <TruckIcon
              className="size-5 text-primary shrink-0 mt-0.5"
              weight="fill"
            />
            <div>
              <p className="text-sm font-semibold text-primary">
                Delivery on {deliveryLabel}
              </p>
              <p className="text-xs text-primary mt-0.5">
                Pre-orders are prepared and delivered on the next working day.
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-600">
                Select items
              </span>
              <Badge className="h-4 bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5">
                Pre-order only
              </Badge>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : allItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 py-6 text-center text-sm text-zinc-400">
                No pre-order items available right now.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 overflow-hidden">
                {allItems.map((item) => {
                  const qty = quantities[item.id] ?? 0;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 transition-colors",
                        qty > 0 && "bg-primary/10",
                      )}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="size-11 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-11 rounded-lg bg-zinc-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-sm font-medium text-zinc-800 truncate">
                            {item.name}
                          </span>
                          {item.isVeg && (
                            <LeafIcon
                              className="size-3.5 text-emerald-500 shrink-0"
                              weight="fill"
                            />
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setQty(item.id, -1)}
                          disabled={qty === 0}
                        >
                          <MinusIcon weight="bold" />
                        </Button>
                        <span
                          className={cn(
                            "w-5 text-center text-sm font-bold",
                            qty > 0 ? "text-primary" : "text-zinc-300",
                          )}
                        >
                          {qty || "—"}
                        </span>
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          onClick={() => setQty(item.id, 1)}
                        >
                          <PlusIcon weight="bold" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
              <PhoneIcon className="size-3.5" weight="fill" />
              Your phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="91XXXXXXXXXX"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">
              Special instructions{" "}
              <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Allergies, preferences…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Payment method */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-600">
              Payment method
            </span>
            <div className="grid mt-2 grid-cols-2 gap-2">
              {/* Razorpay */}
              <button
                onClick={() => setPaymentMethod("RAZORPAY")}
                className={cn(
                  "flex items-center gap-2 rounded-sm border px-3 py-2.5 text-sm font-medium transition-colors",
                  paymentMethod === "RAZORPAY"
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50",
                )}
              >
                <CreditCardIcon
                  className={cn(
                    "size-4",
                    paymentMethod === "RAZORPAY"
                      ? "text-primary"
                      : "text-zinc-400",
                  )}
                  weight="fill"
                />
                <span>Pay Online</span>
              </button>
              {/* Wallet */}
              <button
                onClick={() => user?.token && setPaymentMethod("WALLET")}
                disabled={!user?.token || !canPayWallet}
                className={cn(
                  "flex flex-col items-start rounded-sm border px-3 py-2 text-sm font-medium transition-colors",
                  paymentMethod === "WALLET"
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50",
                  (!user?.token || !canPayWallet) &&
                    "opacity-50 cursor-not-allowed",
                )}
              >
                <div className="flex items-center gap-2">
                  <WalletIcon
                    className={cn(
                      "size-4",
                      paymentMethod === "WALLET"
                        ? "text-primary"
                        : "text-zinc-400",
                    )}
                    weight="fill"
                  />
                  <span>Wallet</span>
                </div>
                {walletBalance !== null && (
                  <span className="text-[10px] text-zinc-400 mt-0.5">
                    Bal: {formatCurrency(walletBalance)}
                    {!canPayWallet && grandTotal > 0 && " (insufficient)"}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-zinc-400">
            <InfoIcon className="size-3.5 shrink-0 mt-0.5" weight="fill" />
            <span>
              Our team will confirm your order via phone before delivery.
            </span>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t bg-zinc-50 shrink-0 flex flex-row items-center justify-between gap-3">
          <div className="text-sm">
            {selectedItems.length > 0 ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {selectedItems.reduce((a, { qty }) => a + qty, 0)} items
                </Badge>
                <span className="font-semibold text-zinc-700">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            ) : (
              <span className="text-zinc-400 text-xs">No items selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!isValid || submitting}
              className="bg-primary hover:bg-primary text-white gap-1.5"
              onClick={handleCheckout}
            >
              <CalendarCheckIcon className="size-4" weight="fill" />
              {submitting
                ? "Processing…"
                : paymentMethod === "WALLET"
                  ? "Pay & Pre-Order"
                  : "Pay Online"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
