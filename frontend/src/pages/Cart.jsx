import { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import {
  clearWalletCache,
  createOrder,
  getCurrentUser,
  getRecommendedMenu,
  notifyWalletUpdated,
  walletGetBalance,
} from "../services/api";
import Navbar from "../components/Navbar";
import { useUserAuth } from "../context/UserAuthContext";
import { useNavigate } from "react-router-dom";
import CartItem from "@/components/CartItem";
import MenuItemCard from "@/components/MenuItemCard";
import { Button } from "@/components/ui/button";
import { CaretDown, CaretRight, Receipt } from "@boxicons/react";
import { ChevronRight } from "lucide-react";

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
  const totalPaise = useMemo(() => Math.round(total * 100), [total]);
  const hasWalletBalance = typeof walletBalance === "number";
  const walletCanCoverOrder = hasWalletBalance && walletBalance >= totalPaise;

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
        if (nextBalance >= totalPaise && totalPaise > 0) {
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
  }, [totalPaise, user?.token]);

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
      const responsePaymentMethod = res?.data?.paymentMethod || paymentMethod;

      if (responsePaymentMethod === "WALLET") {
        clearCart?.();
        clearWalletCache();
        notifyWalletUpdated();
        navigate("/success", {
          state: {
            paymentMethod: "WALLET",
            orderId: res?.data?.orderId,
          },
        });
        return;
        CartItem;
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

      <main className="container-premium py-4 sm:py-6">
        <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">Checkout</h2>
              {/* <p className="mt-1 text-md text-muted-foreground">Review your order, choose a payment option, and checkout in just a few taps.</p>*/}
            </div>
            {/* <div className="w-full rounded-3xl border border-amber-100 bg-white px-5 py-4 shadow-sm sm:w-auto">
                            <div className="text-xs uppercase tracking-wide text-gray-400">Items in cart</div>
                            <div className="mt-1 text-2xl font-bold text-gray-900">{cart.length}</div>
                        </div>*/}
          </div>

          {cart.length === 0 && (
            <div className="rounded-2xl border bg-white px-6 py-12 text-center shadow-sm">
              <svg
                className="size-40 mx-auto"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  className="fill-red-500"
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

              {/* <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Checkout summary
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Choose how you want to pay for this order.
                      </div>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-4 py-3 text-left sm:text-right">
                      <div className="text-xs uppercase tracking-wide text-amber-700">
                        Total
                      </div>
                      <div className="mt-1 text-2xl font-bold text-amber-900">
                        ₹{total.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("WALLET")}
                      disabled={!user?.token || walletLoading}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${paymentMethod === "WALLET" ? "border-amber-400 bg-amber-50 shadow-sm" : "border-gray-200 bg-white"} ${!user?.token ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-gray-900">
                            Pay with wallet
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            {walletLoading
                              ? "Checking wallet balance..."
                              : hasWalletBalance
                                ? `Available balance: ₹${(walletBalance / 100).toFixed(2)}`
                                : "Login to use your wallet balance"}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${walletCanCoverOrder ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                        >
                          {walletCanCoverOrder ? "Ready" : "Top up needed"}
                        </span>
                      </div>
                      {!walletCanCoverOrder && user?.token && (
                        <div className="mt-3 text-xs text-amber-700">
                          Your wallet doesn’t have enough balance for this order
                          yet.
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("RAZORPAY")}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${paymentMethod === "RAZORPAY" ? "border-amber-400 bg-amber-50 shadow-sm" : "border-gray-200 bg-white"}`}
                    >
                      <div className="font-semibold text-gray-900">
                        Pay online with Razorpay
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        Use UPI, cards, or net banking at checkout.
                      </div>
                    </button>
                  </div>

                  {!user && (
                    <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                      Login is required to complete checkout and use your
                      wallet.
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={
                      submitting ||
                      (paymentMethod === "WALLET" && !walletCanCoverOrder)
                    }
                    className="mt-5 w-full rounded-2xl bg-amber-500 px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? "Processing..."
                      : paymentMethod === "WALLET"
                        ? "Pay with wallet"
                        : "Pay now"}
                  </button>
                </section>

                <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-gray-900">
                    Need more balance?
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    You can top up instantly from your wallet page and come
                    right back to checkout.
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/wallet")}
                    className="mt-4 rounded-2xl border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                  >
                    Open wallet
                  </button>
                </section>
              </aside>*/}
            </div>
          )}

          <section className="rounded-2xl bg-white shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold">Add Ons</h4>
                {/* <p className="text-sm text-gray-500">
                  Round out your meal with customer favourites.
                </p>*/}
              </div>
            </div>

            {recLoading && (
              <div className="mt-4 text-sm text-gray-500">
                Loading recommendations...
              </div>
            )}

            {!recLoading && recommended && recommended.length > 0 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2 category-scrollbar">
                {recommended.map((it) => (
                  // <MenuItemCard key={it.id} item={it} />
                  <div
                    key={it.id}
                    className="min-w-[200px] rounded-3xl border border-gray-100 bg-gray-50 p-4 shadow-sm sm:min-w-[220px]"
                  >
                    <div className="mb-3 flex h-24 items-center justify-center rounded-2xl bg-white text-3xl">
                      🥗
                    </div>
                    <div className="font-semibold text-gray-900">{it.name}</div>
                    <div className="mt-1 text-sm text-gray-500">
                      ₹{Number(it.price || 0).toFixed(2)}
                    </div>
                    <button
                      onClick={() => addItem(it)}
                      className="touch-button mt-4 w-full rounded-2xl bg-amber-500 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
                    >
                      Add to cart
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {cart.length > 0 ? (
            <div className="fixed z-5 min-h-35 border-t bg-white inset-x-0 bottom-0">
              <div className="container-premium">
                <div className="flex items-center justify-between rounded-xl pt-4 pb-2">
                  <div className="text-muted-foreground flex gap-2 items-center font-medium">
                    <Receipt pack="filled" /> Total
                  </div>
                  <div className="font-bold text-lg">₹{getTotal()}</div>
                </div>

                <div className="flex gap-6 box-content h-[72px]! justify-between items-center py-2">
                  <Button
                    variant="outline"
                    className="sm:w-1/2 pr-8 h-full w-1/2 max-w-2xs flex flex-col gap-0 justify-center items-start"
                  >
                    <div className="text-muted-foreground flex items-center font-medium">
                      Pay using <CaretDown className="size-4" />
                    </div>
                    <div className="font-semibold">
                      {paymentMethod === "WALLET" ? "Bro Wallet" : "Razorpay"}
                    </div>

                    {paymentMethod === "WALLET" && (
                      <span className="text-muted-foreground flex items-center font-medium">
                        Balance: ₹{walletBalance || 0}
                      </span>
                     )}
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleCheckout}
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
