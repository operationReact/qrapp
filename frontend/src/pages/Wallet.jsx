import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  BanknotesIcon,
  ClockIcon,
  CreditCardIcon,
  FunnelIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Navbar from "../components/Navbar";
import { useUserAuth } from "../context/UserAuthContext";
import {
  clearWalletCache,
  walletCreateOrder,
  walletGetOverview,
  walletGetTransactions,
  walletVerifyPayment,
} from "../services/api";
import { Activity } from "lucide-react";
import {
  Clock,
  CreditCard,
  CreditCardAlt,
  CurrencyNote,
  MenuFilter,
  RefreshCcw,
  SparklesAlt,
  WalletAlt,
} from "@boxicons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

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

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000];
const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "CREDIT", label: "Credits" },
  { key: "DEBIT", label: "Debits" },
  { key: "PENDING", label: "Pending" },
];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatCurrencyFromPaise(value, compact = false) {
  const amount = Number(value || 0) / 100;
  return compact
    ? compactCurrencyFormatter.format(amount)
    : currencyFormatter.format(amount);
}

function formatTransactionTitle(tx) {
  if (tx.description) return tx.description;
  if (tx.type === "CREDIT") return "Wallet top-up";
  if (tx.orderId) return `Order #${tx.orderId} payment`;
  return "Wallet payment";
}

export default function Wallet() {
  const navigate = useNavigate();
  const mounted = useRef(true);
  const { user, setUser } = useUserAuth();
  const toast = useToast();

  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [addAmount, setAddAmount] = useState("500");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchWallet = useCallback(async (nextPage = 0, append = false) => {
    const [overviewResp, transactionResp] = await Promise.all([
      walletGetOverview(),
      walletGetTransactions({ page: nextPage, size: 10 }),
    ]);

    if (!mounted.current) return;

    const nextOverview = overviewResp?.data || null;
    const transactionPage = transactionResp?.data || {};
    const content = Array.isArray(transactionPage?.content)
      ? transactionPage.content
      : [];

    setOverview(nextOverview);
    setTransactions((current) => (append ? [...current, ...content] : content));
    setPage(transactionPage?.number ?? nextPage);
    setHasMore(
      Boolean(transactionPage && !transactionPage.last && content.length > 0),
    );
  }, []);

  const loadInitialWallet = useCallback(async () => {
    // if (!user?.token) {
    //     navigate('/login', { state: { from: '/wallet' } });
    //     return;
    // }

    setLoading(true);
    setError("");
    try {
      clearWalletCache();
      await fetchWallet(0, false);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        setUser?.(null);
        navigate("/login", { state: { from: "/wallet" } });
        return;
      }
      setError(
        typeof err?.response?.data === "string"
          ? err.response.data
          : "Failed to load wallet details.",
      );
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [fetchWallet, navigate, setUser, user?.token]);

  useEffect(() => {
    mounted.current = true;
    loadInitialWallet();
    return () => {
      mounted.current = false;
    };
  }, [loadInitialWallet]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");
    try {
      clearWalletCache();
      await fetchWallet(0, false);
      toast.show("Wallet refreshed");
    } catch (err) {
      setError(
        typeof err?.response?.data === "string"
          ? err.response.data
          : "Unable to refresh wallet right now.",
      );
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchWallet(page + 1, true);
    } catch (err) {
      toast.show(
        typeof err?.response?.data === "string"
          ? err.response.data
          : "Could not load more transactions",
      );
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (filter === "ALL") return transactions;
    if (filter === "PENDING")
      return transactions.filter((tx) => tx.status === "PENDING");
    return transactions.filter((tx) => tx.type === filter);
  }, [filter, transactions]);

  const balance = Number(overview?.balance ?? 0);
  const totalCredited = Number(overview?.totalCredited ?? 0);
  const totalDebited = Number(overview?.totalDebited ?? 0);
  const pendingAmount = Number(overview?.pendingAmount ?? 0);

  async function handleAddMoney() {
    const amountRupees = Number(addAmount);
    if (!Number.isFinite(amountRupees) || amountRupees < 1) {
      toast.show("Enter at least ₹1 to add money");
      return;
    }

    setAdding(true);
    setError("");
    try {
      const amountPaise = Math.round(amountRupees * 100);
      const response = await walletCreateOrder({ amount: amountPaise });
      const order = response?.data || {};
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
            await walletVerifyPayment({
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
            });
            await fetchWallet(0, false);
            toast.show("Wallet credited successfully");
          } catch (verifyError) {
            console.error("wallet verify failed", verifyError);
            const message =
              typeof verifyError?.response?.data === "string"
                ? verifyError.response.data
                : verifyError?.message || "Payment verification failed";
            setError(message);
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
      if (mounted.current) setAdding(false);
    }
  }

  return (
    <div className="page-shell bg-gradient-wallet">
      <Navbar />

      <main className="container-premium py-4 sm:py-6">
        <div className="mx-auto space-y-6">
          <section className="overflow-hidden rounded-[2rem]">
            <div className="grid place-items-center gap-6">
              {/* <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white/90">
                  <SparklesIcon className="h-4 w-4" />
                  Smart wallet for faster checkout
                </div>*/}
              <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
                <span className="sr-only">Bro Wallet</span>
                <img
                  src="/bro-wallet.svg"
                  alt="Bro Wallet"
                  className="h-[31px] mx-auto"
                />
              </h1>
              {/* <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
                  Add money, monitor recent activity, and use your wallet for
                  one-tap checkout on mobile.
                </p>*/}

              <div className="mt-6 mb-4 flex items-center flex-col gap-4 sm:flex-row rounded-4xl sm:items-start w-full">
                <img src="/coin.png" alt="Coin" className="mx-auto" />
                <div className="w-full">
                  <div className="text-sm rounded-full font-semibold text-muted-foreground text-center sm:text-start">
                    Available Balance
                  </div>
                  <div className="mt-2 text-5xl font-bold text-center sm:text-start">
                    {loading ? "..." : formatCurrencyFromPaise(balance)}
                  </div>
                  {overview?.lastTransactionAt ? (
                    <div className="rounded-xl bg-amber-100/70 border border-amber-100 mx-auto sm:mx-0 w-fit text-center text-muted-foreground max-w-75 px-4 py-3 text-sm mt-4">
                      <Activity className="inline-block size-4 mr-1" /> Last
                      Activity on{" "}
                      <span className="mt-1 font-medium">
                        {new Date(overview.lastTransactionAt).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-neutral-100/70 border mx-auto w-fit sm:mx-0 text-center sm:text-start text-muted-foreground max-w-75 px-4 py-3 text-sm mt-4">
                      <Activity className="inline-block size-4 mr-2" />
                      Activity Record Not Available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-5 flex gap-4">
              <img
                src="/coin-plus.svg"
                alt="Plus"
                className="size-11 shrink-0"
              />
              <div>
                <h3 className="text-sm sm:text-base font-bold">Add Money</h3>
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
                value={addAmount}
                onChange={(event) => setAddAmount(event.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base outline-none transition focus:border-[#F3CE4D]"
                placeholder="Amount (₹)"
              />
              <div className="mt-0 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setAddAmount(String(amount))}
                    className="whitespace-nowrap rounded-lg border text-muted-foreground px-4 py-2 text-sm font-medium! hover:bg-amber-50 hover:border-amber-200 hover:text-black"
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddMoney}
                disabled={adding}
                className="touch-button rounded-xl bg-[#F3CE4D] px-5 py-3 text-sm font-semibold! text-black shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
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
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm shadow-gray-200/50">
              <div className="flex items-center gap-3">
                <CurrencyNote
                  pack="filled"
                  className="size-12 text-green-600"
                />
                <div>
                  <div className="text-xs sm:text-sm capitalize text-muted-foreground font-medium">
                    Total Added
                  </div>
                  <div className="mt-0 text-2xl font-bold">
                    {loading
                      ? "..."
                      : formatCurrencyFromPaise(totalCredited, true)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm shadow-gray-200/50">
              <div className="flex items-center gap-3">
                <CreditCardAlt pack="filled" className="size-12 text-red-500" />
                <div>
                  <div className="text-sm capitalize text-muted-foreground font-medium">
                    Total spent
                  </div>
                  <div className="mt-0 text-2xl font-bold">
                    {loading
                      ? "..."
                      : formatCurrencyFromPaise(totalDebited, true)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm shadow-gray-200/50">
              <div className="flex items-center gap-3">
                <Clock pack="filled" className="size-12 text-yellow-600" />
                <div>
                  <div className="text-sm capitalize text-muted-foreground font-medium">
                    Pending
                  </div>
                  <div className="mt-0 text-2xl font-bold">
                    {loading
                      ? "..."
                      : formatCurrencyFromPaise(pendingAmount, true)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm shadow-gray-200/50">
              <div className="flex items-center gap-3">
                <SparklesAlt pack="filled" className="size-12 text-amber-600" />
                <div>
                  <div className="text-sm capitalize text-muted-foreground font-medium">
                    Transactions
                  </div>
                  <div className="mt-0 text-2xl font-bold">
                    {loading
                      ? "..."
                      : Number(overview?.successfulDebitsCount ?? 0)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white shadow-sm p-4">
            <div className="space-y-4 md:space-y-0 md:flex justify-between items-center gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Track top-ups and wallet payments in one place.
                </p>
              </div>
              <Carousel>
                <CarouselContent>
                  <CarouselItem className="basis-auto">
                    <Button
                      type="button"
                      variant="outline"
                      data-icon="inline-start"
                      size="sm"
                      className="pointer-events-none pl-1"
                    >
                      <MenuFilter className="size-4" />
                      Filter
                    </Button>
                  </CarouselItem>

                  {FILTERS.map((item) => (
                    <CarouselItem key={item.key} className="basis-auto pl-1">
                      <Button
                        size="sm"
                        variant={filter === item.key ? "default" : "outline"}
                        className={`rounded-md ${filter === item.key && "font-medium!"}`}
                        type="button"
                        onClick={() => setFilter(item.key)}
                      >
                        {item.label}
                      </Button>
                    </CarouselItem>
                  ))}

                  <CarouselItem className="basis-auto pl-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-icon="inline-start"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="rounded-md!"
                    >
                      <RefreshCcw
                        className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </Button>
                  </CarouselItem>
                </CarouselContent>
              </Carousel>
            </div>

            {loading ? (
              <div className="mt-6 rounded-3xl bg-gray-50 px-6 py-14 text-center text-gray-500">
                Loading wallet activity...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-14 text-center">
                <WalletAlt pack="filled" className="size-24 mx-auto" />
                <div className="mt-4 text-lg font-semibold ">
                  No Transactions Yet!
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Top up your wallet to see credits and wallet checkout activity
                  here.
                </div>
              </div>
            ) : (
              <div className="mt-6">
                {filteredTransactions.map((tx) => {
                  const isCredit = tx.type === "CREDIT";
                  const statusClass =
                    tx.status === "SUCCESS"
                      ? "bg-green-100 text-green-700"
                      : tx.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700";
                  return (
                    <article
                      key={tx.id}
                      className="border-b last:border-b-0 space-y-3 py-2"
                    >
                      <div className="flex gap-4 items-start justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-col gap-1">
                            <h3 className="text-sm capitalize font-semibold sm:text-base">
                              {formatTransactionTitle(tx)}
                            </h3>
                            <div>
                              <span
                                className={`rounded-md px-3 py-1 text-sm font-semibold ${statusClass}`}
                              >
                                {tx.status}
                              </span>
                              {tx.orderId && (
                                <span className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium">
                                  Order #{tx.orderId}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* {(tx.referenceId || tx.providerOrderId) && (
                            <div className="mt-2 truncate text-xs text-gray-400">
                              Ref: {tx.referenceId || tx.providerOrderId}
                            </div>
                          )}*/}
                        </div>

                        <div className="text-right">
                          <div
                            className={`text-lg font-bold ${isCredit ? "text-green-600" : "text-red-500"}`}
                          >
                            {isCredit ? "+" : "-"}
                            {formatCurrencyFromPaise(tx.amount)}
                          </div>
                          {typeof tx.balanceAfter === "number" && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Balance after:{" "}
                              {formatCurrencyFromPaise(tx.balanceAfter)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground sm:text-sm">
                        {tx.createdAt
                          ? new Date(tx.createdAt).toLocaleString()
                          : "Timestamp unavailable"}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {hasMore && filter === "ALL" && (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-70"
                >
                  {loadingMore ? "Loading more..." : "Load more"}
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {toast.message && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          {toast.message}
        </div>
      )}
    </div>
  );
}
