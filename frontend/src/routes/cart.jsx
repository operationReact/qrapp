import { createFileRoute } from "@tanstack/react-router";
import CartItem from "@/components/shared/CartItem";
import MenuItemCard from "@/components/MenuItemCard";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { formatCurrency } from "@/lib/utils";
import { getCurrentUser } from "@/services/auth-service";
import { walletGetBalance } from "@/services/wallet-service";
import { getRecommendedMenu } from "@/services/menu-service";
import {
  getRecommendedBundle,
  getMealRecommendation,
} from "@/services/recommendation-service";
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
import { useLocation } from "@/context/LocationContext";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ShoppingCartIcon, SparkleIcon } from "@phosphor-icons/react";
import { PromotionDrawer } from "@/components/PromotionDrawer";
import { useCheckoutPromotions } from "@/hooks/useCheckoutPromotions";
import { useByocDiscount } from "@/hooks/useByocDiscount";
import ComboProgressBanner from "@/components/ComboProgressBanner";
import CompleteMealCard from "@/components/CompleteMealCard";
import RecommendedBundleCard from "@/components/RecommendedBundleCard";

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
    byocDiscount,
    applyByocDiscount,
    removeByocDiscount,
  } = useCart();
  const { user } = useAuth();
  const { activeLocationId } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [recommended, setRecommended] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("RAZORPAY");
  const [submitting, setSubmitting] = useState(false);
  const [mealAdded, setMealAdded] = useState(false);
  const [mealAdding, setMealAdding] = useState(false);
  const [bundleAdded, setBundleAdded] = useState(false);
  const [bundleAdding, setBundleAdding] = useState(false);
  // Session gate: once user accepts one recommendation, hide upsell block
  const [upsellSessionDone, setUpsellSessionDone] = useState(false);

  // Fetch payment config via React Query — auto-retries & caches
  const { data: paymentConfig, isLoading: paymentConfigLoading } = useQuery(
    paymentConfigOptions(activeLocationId),
  );
  const enabledPaymentMethods = paymentConfig
    ? [
        paymentConfig.walletEnabled && "WALLET",
        paymentConfig.razorpayEnabled && "RAZORPAY",
        paymentConfig.payAtStallEnabled && "PAY_AT_STALL",
      ].filter(Boolean)
    : [];
  const selectedPaymentMethod = paymentConfig
    ? enabledPaymentMethods.includes(paymentMethod)
      ? paymentMethod
      : enabledPaymentMethods[0] || ""
    : paymentMethod;

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

  // ── BYOC combo discount engine ─────────────────────────────────────────
  const {
    campaigns: byocCampaigns,
    bestDiscountAmount: byocBestAmount,
    bestCampaignId: byocBestId,
    bestCampaignName: byocBestName,
    hasDiscount: byocHasDiscount,
  } = useByocDiscount(cart, true);
  const primaryByocCampaign = byocCampaigns[0] ?? null;

  // Auto-apply BYOC discount when unlocked (if no promo code already applied)
  useEffect(() => {
    if (byocHasDiscount && !appliedPromotion && byocBestId) {
      applyByocDiscount({
        campaignId: byocBestId,
        campaignName: byocBestName,
        discountAmount: byocBestAmount,
      });
    } else if (!byocHasDiscount) {
      removeByocDiscount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byocHasDiscount, byocBestAmount, byocBestId]);

  // Derive the live discount directly — no useMemo so it always reads
  // the freshest eligiblePromotions on every render.
  const liveAppliedPromotion = (() => {
    if (!appliedPromotion) return null;
    return (
      eligiblePromotions.find(
        (p) => p.id === appliedPromotion.id || p.code === appliedPromotion.code,
      ) ?? appliedPromotion // fall back to stored value while re-fetching
    );
  })();

  const promoDiscount = Number(liveAppliedPromotion?.actualDiscount ?? 0);
  const byocDiscountAmt = Number(byocDiscount?.discountAmount ?? 0);
  // Apply only the active one (BYOC is cleared when promo is applied)
  const discount = appliedPromotion ? promoDiscount : byocDiscountAmt;
  const totalAfterDiscount = Math.max(0, total - discount);

  const hasWalletBalance = typeof walletBalance === "number";
  const walletCanCoverOrder =
    hasWalletBalance && walletBalance >= totalAfterDiscount;

  // ── Smart upsell queries (priority-based) ──────────────────────────────
  const cartItemsKey = cart
    .map((i) => `${i.id}:${i.quantity}`)
    .sort()
    .join(",");
  const cartItemIds = cart.map((i) => i.id);

  const {
    data: meal,
    isLoading: mealLoading,
    isError: mealError,
  } = useQuery({
    queryKey: ["complete-meal", activeLocationId, cartItemsKey],
    queryFn: () => getMealRecommendation({ cartItemIds, cartTotal: total, locationId: activeLocationId }),
    enabled: cart.length > 0,
    staleTime: 1000 * 60 * 3,
    retry: false,
  });
  const hasMeal = !mealLoading && !mealError && !!meal?.mealItems?.length;

  const {
    data: bundle,
    isLoading: bundleLoading,
    isError: bundleError,
  } = useQuery({
    queryKey: ["v1-recommended-bundle", activeLocationId, cartItemsKey],
    queryFn: () => getRecommendedBundle({ cartItemIds, cartTotal: total, locationId: activeLocationId }),
    enabled: cart.length > 0 && !mealLoading && !hasMeal,
    staleTime: 1000 * 60 * 3,
    retry: false,
  });
  const hasBundle =
    !bundleLoading && !bundleError && !!bundle?.bundleItems?.length;

  // Reset upsell session when cart is cleared
  useEffect(() => {
    if (cart.length === 0) {
      const t = setTimeout(() => setUpsellSessionDone(false), 0);
      return () => clearTimeout(t);
    }
  }, [cart.length]);

  const handleAddMeal = async () => {
    if (!meal?.mealItems?.length) return;
    setMealAdding(true);
    try {
      const cartIds = new Set(cart.map((i) => i.id));
      meal.mealItems
        .filter((item) => !cartIds.has(item.itemId))
        .forEach((item) =>
          addItem({
            id: item.itemId,
            name: item.itemName,
            imageUrl: item.imageUrl ?? undefined,
            price: Number(item.price),
            // Backend already scopes "Complete Your Meal" candidates to the
            // cart's own location (RecommendationEngineService) — tag the
            // item so CartContext.addItem's location guard still applies.
            locationId: activeLocationId,
          }),
        );
      setMealAdded(true);
      setUpsellSessionDone(true); // stop the loop
    } finally {
      setMealAdding(false);
    }
  };

  const handleAddBundle = async () => {
    if (!bundle) return;
    setBundleAdding(true);
    try {
      const cartIds = new Set(cart.map((i) => i.id));
      bundle.bundleItems
        .filter((item) => !cartIds.has(item.itemId))
        .forEach((item) =>
          addItem({
            id: item.itemId,
            name: item.itemName,
            imageUrl: item.imageUrl ?? undefined,
            price: Number(item.price),
            locationId: activeLocationId,
          }),
        );
      setBundleAdded(true);
      setUpsellSessionDone(true); // stop the loop
    } finally {
      setBundleAdding(false);
    }
  };

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
      (p) => p.id === appliedPromotion.id || p.code === appliedPromotion.code,
    );
    const nowIneligible = ineligiblePromotions.some(
      (p) => p.id === appliedPromotion.id || p.code === appliedPromotion.code,
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
      if (!activeLocationId) {
        setRecommended([]);
        setRecLoading(false);
        return;
      }
      setRecLoading(true);
      try {
        const itemsForLocation = await getRecommendedMenu({
          limit: 12,
          locationId: activeLocationId,
        });
        const idsInCart = new Set(cart.map((i) => i.id));
        const items = (itemsForLocation || [])
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
  }, [activeLocationId, cart]);

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

    // Guard: cart must belong to the currently active location. If the
    // location dropdown was changed and the cart somehow still carries
    // items scoped to a different location, block checkout rather than
    // submit a cross-location order.
    if (!activeLocationId) {
      alert("Please select a location before checkout.");
      return;
    }
    const mismatchedItems = cart.filter(
      (i) => i?.locationId != null && String(i.locationId) !== String(activeLocationId),
    );
    if (mismatchedItems.length > 0) {
      console.warn("[cart] checkout blocked — location mismatch", {
        activeLocationId,
        mismatchedItemIds: mismatchedItems.map((i) => i.id),
      });
      alert(
        "Your cart belongs to a different location. Please switch to the correct location.",
      );
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
        paymentMethod: selectedPaymentMethod,
        promotionCode: appliedPromotion?.code ?? undefined,
        byocCampaignId:
          !appliedPromotion && byocDiscount?.campaignId
            ? byocDiscount.campaignId
            : undefined,
      }, activeLocationId);
      console.log("Order response:", res);
      const responsePaymentMethod = res?.paymentMethod || selectedPaymentMethod;

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

      <main className="container-premium pb-16! py-4 sm:py-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-lg font-semibold sm:text-2xl">Checkout</h1>
            </div>
          </div>

          {cart.length === 0 && (
            // update with the Empty component
            <Empty className="border bg-white">
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

          {/* ── Smart Upsell (priority: meal > bundle, session-gated) ── */}
          {cart.length > 0 &&
            !upsellSessionDone &&
            (mealLoading || hasMeal || bundleLoading || hasBundle) && (
              <section className="rounded-xl bg-card border border-border shadow-xs p-3">
                {mealLoading || (!hasMeal && bundleLoading) ? (
                  <div className="h-36 rounded-2xl bg-zinc-100/70 animate-pulse" />
                ) : hasMeal ? (
                  <CompleteMealCard
                    mainItemName={meal.mainItemName ?? cart[0]?.name}
                    mealItems={meal.mealItems}
                    savings={Number(meal.savings)}
                    onAddMeal={handleAddMeal}
                    isLoading={mealAdding}
                    disabled={mealAdded}
                  />
                ) : hasBundle ? (
                  <RecommendedBundleCard
                    bundleItems={bundle.bundleItems}
                    originalPrice={Number(bundle.originalPrice)}
                    savings={Number(bundle.savings)}
                    finalPrice={Number(bundle.finalPrice)}
                    primaryItemName={cart[0]?.name}
                    onAddBundle={handleAddBundle}
                    isLoading={bundleAdding}
                    disabled={bundleAdded}
                  />
                ) : null}
              </section>
            )}

          {/* ── BYOC Combo Progress ───────────────────────────────────── */}
          {cart.length > 0 && primaryByocCampaign && (
            <section className="rounded-xl bg-card border border-border shadow-xs p-4">
              <ComboProgressBanner campaign={primaryByocCampaign} />
            </section>
          )}

          {/* ── Promotion Section ─────────────────────────────────────── */}
          {cart.length > 0 && cartPayload && (
            <section className="rounded-xl bg-card border border-border shadow-xs p-4">
              <h4 className="text-sm font-medium mb-3 text-secondary-foreground">
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

          {(recLoading || recommended.length > 0) && (
            <section className="rounded-xl bg-card border border-border shadow-xs p-4 mb-12">
              <div className="flex items-center gap-2 mb-3">
                <SparkleIcon weight="fill" className="size-4 text-orange-500" />
                <h4 className="text-base font-semibold">Customers Also Love</h4>
              </div>

              {recLoading && (
                <div className="flex gap-3 overflow-hidden">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-32 shrink-0 rounded-xl bg-zinc-100 animate-pulse h-44"
                    />
                  ))}
                </div>
              )}

              {!recLoading && recommended.length > 0 && (
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
          )}

          {cart.length > 0 ? (
            <div className="fixed z-5 min-h-35 border-t border-border bg-card/95 backdrop-blur-sm inset-x-0 bottom-0">
              <div className="container-premium">
                {/* Savings banner — prominent when a discount is applied */}
                {discount > 0 && (
                  <div className="flex items-center justify-between pt-2 pb-0.5">
                    <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                      🎉 You Save
                    </span>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatCurrency(discount)}
                      {liveAppliedPromotion && (
                        <span className="ml-1 text-[10px] font-normal text-emerald-600">
                          · {liveAppliedPromotion.code ?? "offer"}
                        </span>
                      )}
                      {!liveAppliedPromotion && byocDiscount && (
                        <span className="ml-1 text-[10px] font-normal text-emerald-600">
                          · combo deal
                        </span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl pt-3 pb-2">
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
                  <div className="font-bold text-xl">
                    {formatCurrency(totalAfterDiscount)}
                  </div>
                </div>

                <div className="flex gap-4 box-content h-[72px]! justify-between items-center py-2">
                  <Drawer>
                    <DrawerTrigger
                      className={buttonVariants({
                        variant: "outline",
                        className:
                          "sm:w-1/2 border-border! pr-8 h-full flex-1 max-w-2xs flex flex-col gap-0 justify-center items-start",
                      })}
                    >
                      <div className="text-muted-foreground flex items-center font-medium">
                        Pay using <CaretDown className="size-4" />
                      </div>
                      <div className="font-semibold">
                        {selectedPaymentMethod === "WALLET"
                          ? "Bro Wallet"
                          : selectedPaymentMethod === "PAY_AT_STALL"
                            ? "Pay at Stall"
                            : "Razorpay"}
                      </div>
                    </DrawerTrigger>
                    <DrawerContent className="max-w-md mx-auto">
                      <DrawerHeader>
                        <DrawerTitle className="text-xl font-semibold">
                          Pay Using
                        </DrawerTitle>
                        <DrawerDescription className="sr-only">
                          Select your preferred payment method to place the
                          order.
                        </DrawerDescription>
                      </DrawerHeader>
                      <div className="p-4">
                        <RadioGroup
                          value={selectedPaymentMethod}
                          onValueChange={(value) => setPaymentMethod(value)}
                        >
                          {paymentConfigLoading ? (
                            <p className="py-4 text-sm text-muted-foreground">
                              Loading payment methods...
                            </p>
                          ) : enabledPaymentMethods.length === 0 ? (
                            <p className="py-4 text-sm text-destructive">
                              No payment methods are currently available for this location.
                            </p>
                          ) : (
                            <>
                          {paymentConfig.walletEnabled && <FieldLabel htmlFor="wallet">
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
                          </FieldLabel>}
                          {paymentConfig.razorpayEnabled && <FieldLabel htmlFor="razorpay">
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
                          </FieldLabel>}

                          {paymentConfig.payAtStallEnabled && (
                            <FieldLabel htmlFor="pay-at-stall">
                              <Field orientation="horizontal">
                                <FieldContent className="flex flex-row gap-2 items-start">
                                  <div className="size-11 flex items-center justify-center rounded-lg bg-amber-50 border border-amber-200 shrink-0">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="size-6 text-amber-600"
                                      fill="currentColor"
                                      viewBox="0 0 256 256"
                                    >
                                      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a48,48,0,0,1-40,47.29V184a8,8,0,0,1-16,0v-8.71A48,48,0,0,1,80,128a8,8,0,0,1,16,0,32,32,0,1,0,32-32,48,48,0,0,1,0-96V92.71A32,32,0,0,0,96,124a8,8,0,0,1-16,0A48,48,0,0,1,120,76.71V72a8,8,0,0,1,16,0v4.71A48,48,0,0,1,176,128Z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <FieldTitle>Pay at Stall</FieldTitle>
                                    <FieldDescription>
                                      Pay in cash or card when you collect your
                                      order at the counter.
                                    </FieldDescription>
                                  </div>
                                </FieldContent>
                                <RadioGroupItem
                                  value="PAY_AT_STALL"
                                  id="pay-at-stall"
                                />
                              </Field>
                            </FieldLabel>
                          )}
                            </>
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
                              {selectedPaymentMethod === "WALLET"
                                ? "Wallet"
                                : selectedPaymentMethod === "PAY_AT_STALL"
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
                    disabled={submitting || paymentConfigLoading || !selectedPaymentMethod}
                    className="sm:w-1/2 h-full max-w-2xs font-medium!"
                  >
                    Place Order{" "}
                    {discount > 0
                      ? formatCurrency(totalAfterDiscount)
                      : formatCurrency(total)}
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
