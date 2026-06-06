import { createFileRoute } from "@tanstack/react-router";
import CartItem from "@/components/shared/CartItem";
import MenuItemCard from "@/components/MenuItemCard";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CaretDown, Plus } from "@boxicons/react";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import Navbar from "@/components/shared/Navbar";
import { useCart } from "@/context/CartContext";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { createOrder } from "@/services/order-service";
import { paymentConfigOptions } from "@/query/options/orders";
import { getCurrentUser } from "@/services/auth-service";
import { walletGetBalance } from "@/services/wallet-service";
import { getRecommendedMenu } from "@/services/menu-service";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ListStarIcon, ShoppingCartIcon } from "@phosphor-icons/react";
import { PromotionDrawer } from "@/components/PromotionDrawer";
import { useCheckoutPromotions } from "@/hooks/useCheckoutPromotions";

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

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const {
    cart,
    removeItem,
    addItem,
    decreaseItem,
    closeDrawer,
    clearCart,
    appliedPromotion,
    applyPromotion,
    removePromotion,
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [recommended, setRecommended] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("RAZORPAY");
  const [submitting, setSubmitting] = useState(false);

  // Fetch payment config via React Query — auto-retries & caches
  const { data: paymentConfig } = useQuery(paymentConfigOptions);
  const payAtStallEnabled = !!paymentConfig?.payAtStallEnabled;

  // Compute directly from cart so it updates on every cart state change
  const total = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  // ── Promotion engine ────────────────────────────────────────────────────
  const {
    eligiblePromotions,
    ineligiblePromotions,
    recommendedPromotion,
    cartPayload,
    isLoading: promotionsLoading,
  } = useCheckoutPromotions(cart, !!user?.token);

  // Derive the live discount directly — no useMemo so it always reads
  // the freshest eligiblePromotions on every render.
  const liveAppliedPromotion = (() => {
    if (!appliedPromotion) return null;
    return (
      eligiblePromotions.find(
        (p) => p.id === appliedPromotion.id || p.code === appliedPromotion.code
      ) ?? appliedPromotion // fall back to stored value while re-fetching
    );
  })();

  const discount = Number(liveAppliedPromotion?.actualDiscount ?? 0);
  const totalAfterDiscount = Math.max(0, total - discount);

  const hasWalletBalance = typeof walletBalance === "number";
  const walletCanCoverOrder = hasWalletBalance && walletBalance >= totalAfterDiscount;

  // Auto-apply the recommended promotion on first load
  useEffect(() => {
    if (recommendedPromotion && !appliedPromotion) {
      applyPromotion({ ...recommendedPromotion, isAutoApplied: true });
    }
    // Only auto-apply once on first recommendation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendedPromotion]);

  // Remove applied promotion if it becomes ineligible after cart changes
  useEffect(() => {
    if (!appliedPromotion || promotionsLoading) return;
    const stillEligible = eligiblePromotions.some(
      (p) => p.id === appliedPromotion.id || p.code === appliedPromotion.code
    );
    const nowIneligible = ineligiblePromotions.some(
      (p) => p.id === appliedPromotion.id || p.code === appliedPromotion.code
    );
    if (!stillEligible && nowIneligible) {
      removePromotion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligiblePromotions, ineligiblePromotions, promotionsLoading]);

  useEffect(() => {
    if (closeDrawer) closeDrawer();
  }, [closeDrawer]);


  useEffect(() => {
    let mounted = true;
    async function fetchRecommended() {
      setRecLoading(true);
      try {
        const res = await getRecommendedMenu({ limit: 12 });
        const idsInCart = new Set(cart.map((i) => i.id));
        const items = (res.data || [])
          .filter((i) => !idsInCart.has(i.id))
          .slice(0, 6);
        if (mounted) setRecommended(items);
      } catch (e) {
        console.debug("Failed to fetch recommended", e);
        if (mounted) setRecommended([]);
      } finally {
        if (mounted) setRecLoading(false);
      }
    }
    fetchRecommended();
    return () => {
      mounted = false;
    };
  }, [cart]);

  useEffect(() => {
    let mounted = true;
    async function fetchWalletBalance() {
      if (!user?.token) {
        setWalletBalance(null);
        setPaymentMethod("RAZORPAY");
        return;
      }
      setWalletLoading(true);
      try {
        const resp = await walletGetBalance();
        if (!mounted) return;
        const nextBalance = Number(resp?.balance ?? 0);
        setWalletBalance(nextBalance);
        if (nextBalance >= totalAfterDiscount && totalAfterDiscount > 0) {
          setPaymentMethod((current) =>
            current === "RAZORPAY" ? "WALLET" : current,
          );
        }
      } catch (e) {
        console.debug("Failed to fetch wallet balance", e);
        if (mounted) setWalletBalance(null);
      } finally {
        if (mounted) setWalletLoading(false);
      }
    }
    fetchWalletBalance();
    return () => {
      mounted = false;
    };
  }, [totalAfterDiscount, user?.token]);

  const handleCheckout = async () => {
    if (!user || !user.token) {
      navigate({ to: "/login", state: { from: "/cart" } });
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    // Guard: PreOrderOnly items cannot go through regular checkout
    const preOrderItems = cart.filter((i) => i?.tag?.name === "PreOrderOnly");
    if (preOrderItems.length > 0) {
      const names = preOrderItems.map((i) => i.name).join(", ");
      alert(
        `"${names}" can only be placed as a pre-order.\n\nPlease remove it from the cart and use the "Pre-Order" button on the item card to schedule it.`,
      );
      return;
    }

    const items = cart.map((i) => ({
      itemId: i.id,
      quantity: i.quantity,
    }));

    setSubmitting(true);
    try {
      let phone;
      try {
        const me = await getCurrentUser();
        phone = me?.phone;
      } catch (e) {
        console.debug("getCurrentUser failed", e);
      }

      if (!phone) {
        phone = window.prompt(
          "Please enter your phone number to proceed with payment",
        );
        if (!phone) {
          alert("Phone is required to place an order");
          return;
        }
      }

      const res = await createOrder({
        items,
        phone,
        paymentMethod,
        promotionCode: appliedPromotion?.code ?? undefined,
      });
      console.log("Order response:", res);
      const responsePaymentMethod = res?.paymentMethod || paymentMethod;

      if (responsePaymentMethod === "WALLET") {
        clearCart?.();
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        window.dispatchEvent(new Event("wallet:updated"));
        navigate({
          to: "/success",
          state: {
            paymentMethod: "WALLET",
            orderNumber: res?.orderNumber,
            orderId: res?.orderId,
            awardedCoupons: res?.awardedCoupons ?? [],
          },
        });
        return;
      }

      if (responsePaymentMethod === "PAY_AT_STALL") {
        clearCart?.();
        navigate({
          to: "/success",
          state: {
            paymentMethod: "PAY_AT_STALL",
            orderNumber: res?.orderNumber,
            orderId: res?.orderId,
            awardedCoupons: res?.awardedCoupons ?? [],
          },
        });
        return;
      }

      const { payment } = res;
      const orderIdForRzp =
        payment?.rzpOrderId || payment?.orderId || payment?.order_id;

      if (!orderIdForRzp) {
        console.error("No Razorpay order id returned from backend", payment);
        alert("Payment preparation failed: missing order id from server");
        return;
      }

      if (
        typeof orderIdForRzp === "string" &&
        orderIdForRzp.startsWith("mock_rzp_")
      ) {
        alert(
          "Payments are not configured on the server yet. Please use wallet payment or configure Razorpay keys.",
        );
        return;
      }

      await loadRazorpayScript();

      const rzp = new window.Razorpay({
        key: payment.key,
        order_id: orderIdForRzp,
        handler: () => {
          clearCart?.();
          navigate({
            to: "/success",
            state: {
              paymentMethod: "RAZORPAY",
              orderNumber: res?.orderNumber,
              orderId: res?.orderId,
              awardedCoupons: res?.awardedCoupons ?? [],
            },
          });
        },
      });

      rzp.on("payment.failed", function (response) {
        console.error("Razorpay payment failed", response);
        alert(
          "Payment Failed: " +
            (response.error && response.error.description
              ? response.error.description
              : JSON.stringify(response)),
        );
      });

      rzp.open();
    } catch (err) {
      console.error("Checkout failed", err);
      const message =
        typeof err?.response?.data === "string"
          ? err.response.data
          : err?.response?.data?.message || err?.message || "Payment Failed";
      alert("Oops! Something went wrong.\n" + message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell bg-page">
      <Navbar />

      <main className="container-premium py-4 sm:py-6">
        <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-lg font-semibold sm:text-2xl">Checkout</h1>
            </div>
          </div>

          {cart.length === 0 && (
            // update with the Empty component
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShoppingCartIcon weight="duotone" />
                </EmptyMedia>
                <EmptyTitle>Your Cart is empty</EmptyTitle>
                <EmptyDescription>
                  {" "}
                  Add your favourite dishes and come back here to place your
                  order.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate({ to: "/" })}
                  className="w-full max-w-3xs"
                >
                  Browse Menu
                </Button>
              </EmptyContent>
            </Empty>
          )}

          {cart.length > 0 && (
            <div className="grid gap-5 xl:grid-cols-[1.55fr,0.95fr] xl:gap-6">
              <section className="space-y-0 rounded-xl bg-card border border-border shadow-xs py-2 px-4">
                {cart.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    removeItem={removeItem}
                    addItem={addItem}
                    decreaseItem={decreaseItem}
                  />
                ))}
              </section>
            </div>
          )}

          {/* ── Promotion Section ─────────────────────────────────────── */}
          {cart.length > 0 && cartPayload && (
            <section className="rounded-xl bg-card border border-border shadow-xs p-4">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                Offers & Coupons
              </h4>
              <PromotionDrawer
                cartPayload={cartPayload}
                eligiblePromotions={eligiblePromotions}
                ineligiblePromotions={ineligiblePromotions}
                appliedPromotion={liveAppliedPromotion}
                onApply={(promo) => {
                  if (promo === null) removePromotion();
                  else applyPromotion(promo);
                }}
                isLoading={promotionsLoading}
              />
            </section>
          )}

          <section className="rounded-xl bg-card border border-border shadow-xs p-4 mb-12">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold mb-2">Add Ons</h4>
              </div>
            </div>

            {recLoading && (
              <div className="mt-4 text-sm text-gray-500">
                Loading recommendations...
              </div>
            )}

            {!recLoading && recommended && recommended.length === 0 && (
              <Empty className="border">
                <EmptyHeader className="px-2">
                  <EmptyMedia variant="icon">
                    <ListStarIcon weight="duotone" />
                  </EmptyMedia>
                  <EmptyTitle>Build your perfect meal</EmptyTitle>
                  <EmptyDescription className="text-pretty">
                    Add your dishes to the cart and we'll suggest the best
                    sides, drinks, and extras to go with them.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {!recLoading && recommended && recommended.length > 0 && (
              <Carousel opts={{ dragFree: true }} className="mt-2">
                <CarouselContent>
                  {recommended.map((it) => (
                    <CarouselItem
                      key={it.id}
                      className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                    >
                      <MenuItemCard item={it} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            )}
          </section>

          {cart.length > 0 ? (
            <div className="fixed z-5 min-h-35 border-t border-border bg-card/95 backdrop-blur-sm inset-x-0 bottom-0">
              <div className="container-premium">
                <div className="flex items-center justify-between rounded-xl pt-4 pb-2">
                  <div className="text-muted-foreground flex gap-2 items-center font-medium">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21 11h-3V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v13c0 1.65 1.35 3 3 3h14c1.65 0 3-1.35 3-3v-6c0-.55-.45-1-1-1m-7 6h-3v-2h3zm0-4H6v-2h8zm0-4H6V7h8zm6 9c0 .55-.45 1-1 1s-1-.45-1-1v-5h2z"></path>
                    </svg>{" "}
                    Total
                  </div>
                  <div className="flex flex-col items-end">
                    {discount > 0 && (
                      <span className="text-xs text-muted-foreground line-through">
                        ₹{total.toFixed(2)}
                      </span>
                    )}
                    <div className="font-bold text-lg">
                      ₹{totalAfterDiscount.toFixed(2)}
                    </div>
                    {discount > 0 && liveAppliedPromotion && (
                      <span className="text-xs text-green-700 font-medium">
                        -₹{discount.toFixed(2)} with {liveAppliedPromotion.code ?? "offer"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-6 box-content h-[72px]! justify-between items-center py-2">
                  <Drawer>
                    <DrawerTrigger asChild>
                      <Button
                        variant="outline"
                        className="sm:w-1/2 pr-8 h-full w-1/2 max-w-2xs flex flex-col gap-0 justify-center items-start"
                      >
                        <div className="text-muted-foreground flex items-center font-medium">
                          Pay using <CaretDown className="size-4" />
                        </div>
                        <div className="font-semibold">
                          {paymentMethod === "WALLET"
                            ? "Bro Wallet"
                            : paymentMethod === "PAY_AT_STALL"
                            ? "Pay at Stall"
                            : "Razorpay"}
                        </div>
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent className="max-w-md mx-auto">
                      <DrawerHeader>
                        <DrawerTitle className="text-xl font-semibold">
                          Pay Using
                        </DrawerTitle>
                        <DrawerDescription className="sr-only">
                          Select your preferred payment method to place the order.
                        </DrawerDescription>
                      </DrawerHeader>
                      <div className="p-4">
                        <RadioGroup
                          value={paymentMethod}
                          onValueChange={(value) => setPaymentMethod(value)}
                        >
                          <FieldLabel htmlFor="wallet">
                            <Field
                              orientation="horizontal"
                              data-disabled={
                                !user?.token ||
                                walletLoading ||
                                !walletCanCoverOrder
                              }
                            >
                              <FieldContent className="flex flex-row gap-2 items-start">
                                <img
                                  src="/coin.png"
                                  alt="wallet"
                                  className="size-11"
                                />
                                <div className="flex flex-col gap-0.5">
                                  <FieldTitle>Bro Wallet</FieldTitle>
                                  <FieldDescription>
                                    {walletLoading
                                      ? "Checking wallet balance..."
                                      : hasWalletBalance
                                        ? `Available balance: ₹${walletBalance.toFixed(2)}`
                                        : "Login to use your wallet balance"}
                                    {!walletCanCoverOrder && user?.token && (
                                      <span className="mt-1 block mb-1.5 text-xs text-red-700">
                                        Your wallet doesn't have enough balance
                                        for this order yet.
                                      </span>
                                    )}
                                    <span className={`w-fit block`}>
                                      {walletCanCoverOrder ? (
                                        ""
                                      ) : (
                                        <Badge
                                          variant="secondary"
                                          className="ml-auto"
                                          render={
                                            <Link to="/wallet">
                                              <Plus data-icon="inline-start" />{" "}
                                              Top up instantly
                                            </Link>
                                          }
                                        ></Badge>
                                      )}
                                    </span>
                                  </FieldDescription>
                                </div>
                              </FieldContent>
                              <RadioGroupItem
                                value="WALLET"
                                id="wallet"
                                disabled={
                                  !user?.token ||
                                  walletLoading ||
                                  !walletCanCoverOrder
                                }
                              />
                            </Field>
                          </FieldLabel>
                          <FieldLabel htmlFor="razorpay">
                            <Field orientation="horizontal">
                              <FieldContent className="flex flex-row gap-2">
                                <img
                                  src="/razorpay.svg"
                                  alt="razorpay"
                                  className="size-11"
                                />
                                <div>
                                  <FieldTitle>Razorpay</FieldTitle>
                                  <FieldDescription>
                                    Use UPI, cards, or net banking at checkout.
                                  </FieldDescription>
                                </div>
                              </FieldContent>
                              <RadioGroupItem value="RAZORPAY" id="razorpay" />
                            </Field>
                          </FieldLabel>

                          {payAtStallEnabled && (
                            <FieldLabel htmlFor="pay-at-stall">
                              <Field orientation="horizontal">
                                <FieldContent className="flex flex-row gap-2 items-start">
                                  <div className="size-11 flex items-center justify-center rounded-lg bg-amber-50 border border-amber-200 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="size-6 text-amber-600" fill="currentColor" viewBox="0 0 256 256">
                                      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a48,48,0,0,1-40,47.29V184a8,8,0,0,1-16,0v-8.71A48,48,0,0,1,80,128a8,8,0,0,1,16,0,32,32,0,1,0,32-32,48,48,0,0,1,0-96V92.71A32,32,0,0,0,96,124a8,8,0,0,1-16,0A48,48,0,0,1,120,76.71V72a8,8,0,0,1,16,0v4.71A48,48,0,0,1,176,128Z"/>
                                    </svg>
                                  </div>
                                  <div>
                                    <FieldTitle>Pay at Stall</FieldTitle>
                                    <FieldDescription>
                                      Pay in cash or card when you collect your order at the counter.
                                    </FieldDescription>
                                  </div>
                                </FieldContent>
                                <RadioGroupItem value="PAY_AT_STALL" id="pay-at-stall" />
                              </Field>
                            </FieldLabel>
                          )}
                        </RadioGroup>
                      </div>

                      <DrawerFooter>
                        <DrawerClose asChild>
                          <Button
                            size="lg"
                            className="w-full h-12 font-medium!"
                          >
                            Pay Using{" "}
                            <span className="font-semibold">
                              {paymentMethod === "WALLET"
                                ? "Wallet"
                                : paymentMethod === "PAY_AT_STALL"
                                ? "Pay at Stall"
                                : "Razorpay"}
                            </span>
                          </Button>
                        </DrawerClose>
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>
                  <Button
                    size="lg"
                    onClick={handleCheckout}
                    disabled={submitting}
                    className="sm:w-1/2 h-full max-w-2xs font-medium!"
                  >
                    Place Order{" "}
                    {discount > 0
                      ? `₹${totalAfterDiscount.toFixed(2)}`
                      : `₹${total.toFixed(2)}`}
                    <ChevronRight className="size-5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
