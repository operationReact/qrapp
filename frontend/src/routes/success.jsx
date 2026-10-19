import { createFileRoute } from "@tanstack/react-router";
import { Link, useLocation } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { ArchiveIcon, ClockCountdownIcon, CreditCardIcon, WalletIcon, GiftIcon } from "@phosphor-icons/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/success")({
  component: SuccessPage,
});

function SuccessPage() {
  const location = useLocation();
  const paymentMethod = location.state?.paymentMethod || "RAZORPAY";
  const orderNumber = location.state?.orderNumber;
  const orderId = location.state?.orderId;
  const awardedCoupons = location.state?.awardedCoupons ?? [];
  const isWallet = paymentMethod === "WALLET";
  const isPayAtStall = paymentMethod === "PAY_AT_STALL";
  const paymentLabel = isWallet
    ? "Wallet"
    : isPayAtStall
      ? "Pay at stall"
      : "Razorpay";

  return (
    <div className="page-shell bg-background flex w-full min-h-screen justify-center py-6 sm:px-4">
      <div className="w-full max-w-md px-4 grid place-items-center sm:block">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="font-semibold">
              Order placed successfully
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              Thanks for ordering — we're preparing your food and will keep your
              order status updated.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-3 mt-2">
            <div
              role="status"
              className="relative overflow-hidden rounded-xl border border-amber-200/80 bg-linear-to-br from-amber-50 via-white to-amber-100/60 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-700 ring-1 ring-amber-300/60">
                  <ClockCountdownIcon weight="duotone" className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                    Cancellation window
                  </p>
                  <h3 className="mt-0.5 text-sm font-semibold text-stone-900">
                    Need to cancel? You have time.
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-stone-600">
                    Cancel from the Orders page until the kitchen starts preparing your food.
                  </p>
                </div>
              </div>

              <ol className="relative mt-4 grid grid-cols-3 text-center text-[11px] font-medium text-stone-600">
                <li className="relative flex flex-col items-center gap-1.5">
                  <span className="absolute left-1/2 top-[5px] h-px w-full bg-green-400" aria-hidden="true" />
                  <span className="relative z-10 grid size-3 place-items-center rounded-full bg-green-500 ring-4 ring-amber-50" />
                  <span className="text-green-700">Placed</span>
                </li>
                <li className="relative flex flex-col items-center gap-1.5">
                  <span className="absolute left-1/2 top-[5px] h-px w-full bg-stone-300" aria-hidden="true" />
                  <span className="relative z-10 grid size-3 place-items-center rounded-full bg-amber-500 ring-4 ring-amber-50 animate-pulse" />
                  <span className="font-semibold text-amber-700">Cancel cutoff</span>
                </li>
                <li className="relative flex flex-col items-center gap-1.5">
                  <span className="relative z-10 grid size-3 place-items-center rounded-full bg-stone-300 ring-4 ring-amber-50" />
                  <span className="text-stone-400">Ready</span>
                </li>
              </ol>
              <p className="mt-3 rounded-md bg-white/70 px-2.5 py-1.5 text-center text-[11px] text-stone-600 ring-1 ring-amber-200/70">
                Cancellation closes the moment the kitchen starts preparing.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-md bg-linear-to-br from-green-50 to-green-100/50 p-2">
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
                  {isPayAtStall ? "Payment method" : "Paid via"}
                </span>
              </div>
              <div className="mt-2 text-base font-semibold text-green-800">
                {paymentLabel}
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                {isWallet ? (
                  <WalletIcon className="size-16" />
                ) : isPayAtStall ? (
                  <CreditCardIcon className="size-16" />
                ) : (
                  <img src="/razorpay.svg" alt="" className="size-16" />
                )}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-md bg-linear-to-br from-amber-50 to-amber-100/50 p-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-500/10 p-1.5">
                  <ArchiveIcon
                    weight="fill"
                    className="size-4 text-amber-600"
                  />
                </span>
                <span className="text-xs font-medium text-amber-700">
                  Order Number
                </span>
              </div>
              <div className="mt-2 truncate text-base font-semibold text-amber-800">
                {orderNumber || orderId || "Generated"}
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <ArchiveIcon className="size-16" />
              </div>
            </div>

            {awardedCoupons.length > 0 && (
              <div className="relative overflow-hidden rounded-md bg-linear-to-br from-purple-50 to-purple-100/50 p-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-purple-500/10 p-1.5">
                    <GiftIcon weight="fill" className="size-4 text-purple-600" />
                  </span>
                  <span className="text-xs font-medium text-purple-700">
                    🎉 Milestone {awardedCoupons.length === 1 ? "Reward" : "Rewards"} Unlocked!
                  </span>
                </div>
                <div className="mt-2 grid gap-1">
                  {awardedCoupons.map((code) => (
                    <div
                      key={code}
                      className="flex items-center justify-between rounded bg-purple-100/70 px-2 py-1"
                    >
                      <span className="font-mono text-sm font-semibold tracking-wider text-purple-800">
                        {code}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-purple-600">
                  Use {awardedCoupons.length === 1 ? "this promo code" : "these promo codes"} on your next order for a discount!
                </p>
                <div className="absolute -right-2 -bottom-2 opacity-10">
                  <GiftIcon className="size-16" />
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="grid gap-3">
            <Link
              to="/orders"
              className={buttonVariants({
                size: "lg",
              })}
            >
              Track my order
            </Link>
            <Link
              to="/"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                class: "border-border!",
              })}
            >
              Back to menu
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
