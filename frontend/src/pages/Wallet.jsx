import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useUserAuth } from "../context/UserAuthContext";
import {
  clearWalletCache,
  walletGetOverview,
  walletGetTransactions,
} from "../services/api";
import { Activity } from "lucide-react";
import {
  Check,
  Clock,
  Copy,
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
import AddMoneyForm from "@/components/wallet/AddMoneyForm";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

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
  const [error, setError] = useState(null);

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
    if (!user?.token) {
      navigate("/login", { state: { from: "/wallet" } });
      return;
    }

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

  return (
    <div className="page-shell bg-gradient-wallet">
      <Navbar />

      <main className="container-premium py-4 sm:py-6">
        <div className="mx-auto space-y-6">
          <section className="overflow-hidden rounded-[2rem]">
            <div className="grid place-items-center gap-6">
              <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
                <span className="sr-only">Bro Wallet</span>
                <img
                  src="/bro-wallet.svg"
                  alt="Bro Wallet"
                  className="h-[31px] mx-auto"
                />
              </h1>

              <div className="mt-6 mb-4 flex items-center flex-col gap-4 sm:flex-row rounded-4xl sm:items-start w-full">
                <img
                  src="/coin.png"
                  alt="Coin"
                  className="mx-auto shrink-0 grow-0 size-[128px]"
                />
                <div className="w-full">
                  <div className="text-sm rounded-full font-semibold text-muted-foreground text-center sm:text-start">
                    Available Balance
                  </div>
                  <div className="mt-2 text-5xl font-bold text-center sm:text-start">
                    {loading ? "..." : formatCurrencyFromPaise(balance)}
                  </div>
                  {overview?.lastTransactionAt && (
                    <div className="rounded-lg bg-amber-100/70 border border-amber-100 mx-auto sm:mx-0 w-fit text-center text-muted-foreground max-w-75 px-4 py-3 text-sm mt-4">
                      <Activity className="inline-block size-4 mr-1" /> Last
                      Activity on{" "}
                      <span className="mt-1 font-medium">
                        {new Date(overview.lastTransactionAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {!loading && error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-4 w-fit">
                      {error}
                    </div>
                  )}

                  {!loading && !overview && !error && (
                    <div className="rounded-lg bg-neutral-100/70 border mx-auto w-fit sm:mx-0 text-center sm:text-start text-muted-foreground max-w-75 px-4 py-3 text-sm mt-4">
                      <Activity className="inline-block size-4 mr-2" />
                      Activity Record Not Available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <AddMoneyForm onSuccess={async () => await fetchWallet(0, false)} />

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

            <div className="rounded-xl border bg-white p-4">
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

          <section className="rounded-lg border bg-white shadow-sm p-4">
            <div className="space-y-4 md:space-y-0 md:flex justify-between items-center gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Track top-ups and wallet payments in one place.
                </p>
              </div>
              <Carousel opts={{ dragFree: true }}>
                <CarouselContent className="-ml-1">
                  <CarouselItem className="basis-auto pl-1">
                    <div
                      className={buttonVariants({
                        variant: "outline",
                        className:
                          "rounded-md! pointer-events-none text-sm! font-medium! pl-1",
                        size: "sm",
                      })}
                    >
                      <MenuFilter />
                      Filter
                    </div>
                  </CarouselItem>

                  {FILTERS.map((item) => (
                    <CarouselItem key={item.key} className="basis-auto pl-1">
                      <Button
                        size="sm"
                        variant={filter === item.key ? "black" : "outline"}
                        type="button"
                        onClick={() => {
                          if ("startViewTransition" in document) {
                            document.startViewTransition(() => {
                              setFilter(item.key);
                            });
                            return;
                          }

                          setFilter(item.key);
                        }}
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
              <div className="mt-6 rounded-xl bg-gray-50 px-6 py-14 text-center text-gray-500">
                Loading wallet activity...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-14 text-center">
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
                      style={{
                        viewTransitionName: `txn-${tx.referenceId || tx.providerOrderId}`,
                      }}
                      className="border-b last:border-b-0 space-y-3 py-2"
                    >
                      <div className="flex gap-4 items-start justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-col gap-1">
                            <h3 className="text-sm capitalize font-semibold sm:text-base">
                              {formatTransactionTitle(tx)}
                            </h3>
                            <div className="space-x-1">
                              <Badge
                                className={`font-medium! ${statusClass} capitalize`}
                              >
                                {tx.status.toLowerCase()}
                              </Badge>
                              {tx.orderId && (
                                <Badge className="bg-gray-100 text-gray-700 font-medium">
                                  Order #{tx.orderId}
                                </Badge>
                              )}
                            </div>
                          </div>
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

                      <div className="mt-2 space-x-2 text-xs text-muted-foreground sm:text-sm">
                        <span>
                          {tx.createdAt
                            ? formatDate(tx.createdAt)
                            : "Timestamp unavailable"}
                        </span>
                        <span>•</span>
                        {(tx.referenceId || tx.providerOrderId) && (
                          <Badge
                            variant="outline"
                            className="font-medium! text-muted-foreground hover:text-secondary-foreground text-xs!"
                            render={
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    tx.referenceId || tx.providerOrderId,
                                  );
                                  toast.show("Transaction Id copied");
                                }}
                                className="group/copy-btn"
                              >
                                <span className="size-3 [&>svg]:size-3! grid grid-cols-1 grid-rows-1">
                                  <Copy
                                    pack="filled"
                                    className="group-active/copy-btn:opacity-0 group-active/copy-btn:scale-75 group-active/copy-btn:blur-[2px] transition-[opacity_300ms,scale_100ms,filter_500ms] ease-out"
                                  />{" "}
                                  <Check className="opacity-0 blur-[2px] text-accent-400 group-active/copy-btn:opacity-100 scale-75 group-active/copy-btn:scale-100 group-active/copy-btn:blur-[0px] transition-[opacity_300ms,scale_200ms,filter_500ms] ease-out" />
                                </span>
                                Copy Reference{" "}
                                <span className="sr-only">
                                  {tx.referenceId || tx.providerOrderId}
                                </span>
                              </button>
                            }
                          />
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {hasMore && filter === "ALL" && (
              <div className="mt-5 text-center">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-sm! font-medium! rounded-lg"
                >
                  {loadingMore ? "Loading more..." : "Load more"}
                </Button>
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
