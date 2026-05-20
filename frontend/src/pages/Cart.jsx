import CartItem from "@/components/CartItem";
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
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CaretDown, Plus, Receipt } from "@boxicons/react";
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { useUserAuth } from "../context/UserAuthContext";
import {
  clearWalletCache,
  createOrder,
  getCurrentUser,
  getRecommendedMenu,
  notifyWalletUpdated,
  walletGetBalance,
} from "../services/api";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import MobileMenu from "@/components/MobileMenu";

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

export default function Cart() {
  const {
    cart,
    removeItem,
    getTotal,
    addItem,
    decreaseItem,
    closeDrawer,
    clearCart,
  } = useCart();
  const { user } = useUserAuth();
  const navigate = useNavigate();
  const [recommended, setRecommended] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("RAZORPAY");
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(() => Number(getTotal() || 0), [getTotal]);
  const hasWalletBalance = typeof walletBalance === "number";
  const walletCanCoverOrder = hasWalletBalance && walletBalance >= total;

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
        const nextBalance = Number(resp?.data?.balance ?? 0);
        setWalletBalance(nextBalance);
        if (nextBalance >= total && total > 0) {
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
  }, [total, user?.token]);

  const handleCheckout = async () => {
    if (!user || !user.token) {
      navigate("/login", { state: { from: "/cart" } });
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
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
        phone = me?.data?.phone;
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

      const res = await createOrder({ items, phone, paymentMethod });
      console.log("Order response:", res?.data);
      const responsePaymentMethod = res?.data?.paymentMethod || paymentMethod;

      if (responsePaymentMethod === "WALLET") {
        clearCart?.();
        clearWalletCache();
        notifyWalletUpdated();
        navigate("/success", {
          state: {
            paymentMethod: "WALLET",
            orderNumber: res?.data?.orderNumber,
            orderId: res?.data?.orderId,
          },
        });
        return;
      }

      const { payment } = res.data;
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
          navigate("/success", {
            state: {
              paymentMethod: "RAZORPAY",
              orderNumber: res?.data?.orderNumber,
              orderId: res?.data?.orderId,
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
      {/* <MobileMenu/> */}

      <main className="container-premium py-4 sm:py-6">
        <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Checkout</h1>
              {/* <p className="mt-1 text-md text-muted-foreground">Review your order, choose a payment option, and checkout in just a few taps.</p>*/}
            </div>
          </div>

          {cart.length === 0 && (
            <div className="rounded-2xl border bg-white px-6 py-12 text-center shadow-sm">
              <svg
                className="size-30 mx-auto"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  className="fill-primary"
                  d="m11.73 5.32-1.41 1.41 1.77 1.77-1.77 1.77 1.41 1.41 1.77-1.77 1.77 1.77 1.41-1.41-1.77-1.77 1.77-1.77-1.41-1.41-1.77 1.77z"
                ></path>
                <path d="M17.31 14H9.72L5.95 2.68A1 1 0 0 0 5 2H2v2h2.28l3.54 10.63A2 2 0 0 0 9.72 16h7.59a2 2 0 0 0 1.87-1.3l2.76-7.35-1.87-.7zM10 18a2 2 0 1 0 0 4 2 2 0 1 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 1 0 0-4"></path>
              </svg>
              <h3 className="mt-8 text-xl font-semibold">Your Cart is empty</h3>
              <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
                Add your favourite dishes and come back here to place your
                order.
              </p>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/")}
                className="font-medium! mt-8 min-w-60 w-1/2 h-12"
              >
                Browse Menu
              </Button>
            </div>
          )}

          {cart.length > 0 && (
            <div className="grid gap-5 xl:grid-cols-[1.55fr,0.95fr] xl:gap-6">
              <section className="space-y-0 rounded-2xl bg-white shadow-sm py-2 px-4">
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

          <section className="rounded-2xl bg-white shadow-sm p-4 mb-12">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold">Add Ons</h4>
              </div>
            </div>

            {recLoading && (
              <div className="mt-4 text-sm text-gray-500">
                Loading recommendations...
              </div>
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
            <div className="fixed z-5 min-h-35 border-t bg-white inset-x-0 bottom-0">
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
                  <div className="font-bold text-lg">
                    ₹{getTotal().toFixed(2)}
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
                            : "Razorpay"}
                        </div>

                        {/* {paymentMethod === "WALLET" && (
                          <span className="text-muted-foreground text-xs flex items-center font-medium">
                            Balance: ₹{((walletBalance || 0) / 100).toFixed(2)}
                          </span>
                        )}*/}
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent
                      aria-describedby="change-payment-title"
                      className="max-w-md mx-auto"
                    >
                      <DrawerHeader>
                        <DrawerTitle className="text-xl font-semibold">
                          Pay Using
                        </DrawerTitle>
                      </DrawerHeader>
                      <div className="p-4">
                        <RadioGroup
                          defaultValue={paymentMethod}
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
                                        ? `Available balance: ₹${(walletBalance).toFixed(2)}`
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
                    Place Order <ChevronRight className="size-5" />
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
