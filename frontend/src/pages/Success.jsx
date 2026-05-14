import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArchiveIcon, CreditCardIcon, WalletIcon } from "@phosphor-icons/react";

export default function Success() {
  const location = useLocation();
  const paymentMethod = location.state?.paymentMethod || "RAZORPAY";
  const orderNumber = location.state?.orderNumber;
  const orderId = location.state?.orderId;
  const isWallet = paymentMethod === "WALLET";

  return (
    <div className="page-shell flex w-full min-h-screen justify-center py-6 sm:px-4">
      <div className="w-full max-w-md grid place-items-center sm:block">
        <div className="rounded-2xl p-4 sm:p-6 sm:shadow-lg sm:shadow-red-300/10 h-fit sm:bg-white/20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold">
              Order placed successfully
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Thanks for ordering — we're preparing your food and will keep your
              order status updated.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-green-500/10 p-1.5">
                  {isWallet ? (
                    <WalletIcon
                      weight="fill"
                      className="size-4 text-green-600"
                    />
                  ) : (
                    <CreditCardIcon
                      weight="fill"
                      className="size-4 text-green-600"
                    />
                  )}
                </span>
                <span className="text-xs font-medium text-green-700">
                  Paid via
                </span>
              </div>
              <div className="mt-2 text-lg font-semibold text-green-800">
                {isWallet ? "Wallet" : "Razorpay"}
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                {isWallet ? (
                  <WalletIcon className="size-16" />
                ) : (
                  <img src="/razorpay.svg" alt="" className="size-16" />
                )}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-500/10 p-1.5">
                  <ArchiveIcon weight="fill" className="size-4 text-amber-600" />
                </span>
                <span className="text-xs font-medium text-amber-700">
                  Order Number
                </span>
              </div>
              <div className="mt-2 truncate text-lg font-semibold text-amber-800">
                {orderNumber || orderId || "Generated"}
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <ArchiveIcon className="size-16" />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Button size="lg">
              <Link to="/orders">Track my order</Link>
            </Button>
            <Button size="lg" variant="outline">
              <Link to="/">Back to menu</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
