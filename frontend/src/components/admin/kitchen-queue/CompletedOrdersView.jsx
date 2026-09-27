import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import {
  Filter,
  RefreshCw,
  CircleAlert,
  CheckCircle2,
  Search,
  X,
  Clock3,
} from "lucide-react";
import { adminOrdersOptions } from "@/query/options/orders";
import { useAuth } from "@/context/AuthContext";
import { canAccessAdmin } from "@/lib/roles";
import { cn, isOrderPaid } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { KitchenQueueOrderDetailPanel } from "@/components/admin/kitchen-queue/OrderDetailPanel";

const PAYMENT_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "PAID", label: "Paid" },
  { key: "UNPAID", label: "Unpaid" },
];

const DATE_FILTERS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "all", label: "All time" },
];

function getDateRange(filter) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last7 = new Date(today);
  last7.setDate(last7.getDate() - 7);

  switch (filter) {
    case "today":
      return { from: today.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
    case "yesterday":
      return { from: yesterday.toISOString().split('T')[0], to: yesterday.toISOString().split('T')[0] };
    case "last7":
      return { from: last7.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
    case "all":
      return { from: null, to: null };
    default:
      return { from: today.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
  }
}

function formatCompletedTime(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function CompletedOrderCard({ order, onExpand }) {
  const paid = isOrderPaid(order);
  const completedTime = formatCompletedTime(order.completedAt);

  return (
    <article
      className="border-l-4 border-l-[#10B981] rounded-[14px] border border-[#E8E2DD] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow cursor-pointer"
      onClick={() => onExpand(order.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onExpand(order.id);
        }
      }}
    >
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="shrink-0 text-base font-extrabold leading-tight text-[#171717]">
            {String(order.orderNumber ?? order.id).startsWith("#")
              ? order.orderNumber ?? order.id
              : `#${order.orderNumber ?? order.id}`}
          </h2>
          <div className="flex items-center gap-1 text-xs font-bold text-[#10B981]">
            <div className="size-1.5 rounded-full bg-[#10B981]" aria-hidden="true" />
            Completed
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#6B6B6B] truncate">
            {order.userName || order.phone || "Guest"}
          </p>
          <p className="text-xs text-[#6B6B6B]">
            {order.totalItems || 0} item{order.totalItems !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-[#EEE9E5]">
            <span className="text-sm font-bold tabular-nums text-[#171717]">
              ₹{order.total?.toFixed(0) || 0}
            </span>
            <span className={cn("text-[10px] font-bold uppercase tracking-wide", paid ? "text-[#16A34A]" : "text-[#D97706]")}>
              {paid ? "Paid" : "Unpaid"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#6B6B6B] pt-1">
            <Clock3 size={12} aria-hidden="true" />
            Completed {completedTime}
          </div>
        </div>
      </div>
    </article>
  );
}

function CompletedOrdersSkeleton() {
  return (
    <div className="rounded-[14px] border border-[#E8E2DD] bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" aria-hidden="true">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="h-5 w-20 animate-pulse rounded-md bg-[#F0ECE8]" />
        <div className="h-3 w-16 animate-pulse rounded-md bg-[#F0ECE8]" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-[#F0ECE8]" />
        <div className="h-3 w-16 animate-pulse rounded bg-[#F0ECE8]" />
      </div>
    </div>
  );
}

export function CompletedOrdersView({
  activeLocationId,
  expandedOrderId,
  onExpandOrder,
}) {
  const { user, isAdmin, isSuperUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftPaymentFilter, setDraftPaymentFilter] = useState("ALL");
  const [page, setPage] = useState(0);

  // Debounce search
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const dateRange = getDateRange(dateFilter);

  // Fetch completed orders
  const { data: ordersData = {}, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminOrdersOptions({
      page,
      size: 20,
      status: "COMPLETED",
      paymentStatus: paymentFilter === "ALL" ? undefined : paymentFilter,
      query: debouncedSearch || undefined,
      locationId: activeLocationId,
    }),
    enabled: !!activeLocationId,
  });

  const orders = ordersData?.content || [];

  const handleDateChange = (newDate) => {
    setDateFilter(newDate);
    setPage(0);
  };

  const handlePaymentFilterChange = (newFilter) => {
    setPaymentFilter(newFilter);
    setFilterOpen(false);
    setPage(0);
  };

  const handleClearFilters = () => {
    setDateFilter("today");
    setPaymentFilter("ALL");
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(0);
    setFilterOpen(false);
  };

  const activeFilterCount = [
    dateFilter !== "today" ? 1 : 0,
    paymentFilter !== "ALL" ? 1 : 0,
    debouncedSearch ? 1 : 0,
  ].filter(Boolean).length;

  if (!canAccessAdmin(user) && !isAdmin && !isSuperUser) {
    return null;
  }

  return (
    <>
      {/* Filters Bar */}
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 bg-white/95 backdrop-blur px-4 py-3 sm:px-6 border-b border-[#E8E2DD]">
        {/* Search Bar */}
        <div className="mb-2 relative">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by order #, name, or phone…"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-10 pl-9 pr-8 rounded-lg border border-[#E8E2DD] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2438]/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#F0ECE8] rounded"
              >
                <X size={14} className="text-[#6B6B6B]" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-1 shrink-0">
            {DATE_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => handleDateChange(filter.key)}
                className={cn(
                  "h-8 px-3 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors",
                  dateFilter === filter.key
                    ? "bg-[#171717] text-white"
                    : "bg-[#F5F3FF] text-[#7C3AED] border border-[#E9D5FF]"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setDraftPaymentFilter(paymentFilter);
              setFilterOpen(true);
            }}
            className={cn(
              "h-8 px-3 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ml-auto shrink-0",
              paymentFilter !== "ALL" || activeFilterCount > 0
                ? "bg-[#171717] text-white"
                : "bg-white border border-[#E8E2DD] text-[#6B6B6B] hover:bg-[#F8F6F3]"
            )}
            aria-label="Filter completed orders"
          >
            <Filter size={14} className="inline mr-1" />
            Payment {paymentFilter !== "ALL" && `• ${paymentFilter === "PAID" ? "Paid" : "Unpaid"}`}
          </button>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-[#6B6B6B]">
              {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} applied
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-[#FF2438] hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-red-800" role="alert">
          <CircleAlert size={18} className="mt-0.5 shrink-0 text-red-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Unable to load completed orders</p>
            <p className="mt-0.5 text-xs text-red-700/80">Try again to retrieve completed orders.</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="min-h-9 shrink-0 rounded-lg px-2 text-xs font-bold text-red-700 underline underline-offset-2 hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <CompletedOrdersSkeleton key={index} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#E8E2DD] bg-white/60 px-6 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-green-50 text-green-600">
            <CheckCircle2 size={24} />
          </span>
          <h2 className="mt-4 text-base font-bold text-zinc-800">No completed orders</h2>
          <p className="mt-1 max-w-xs text-sm leading-relaxed text-zinc-500">
            {debouncedSearch || dateFilter !== "today" || paymentFilter !== "ALL"
              ? "No completed orders match your filters."
              : "Completed orders will appear here once orders are finished."}
          </p>
          {(debouncedSearch || dateFilter !== "today" || paymentFilter !== "ALL") && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-3 text-xs font-semibold text-[#FF2438] hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 items-start gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {orders.map((order) => (
              <CompletedOrderCard
                key={order.id}
                order={order}
                onExpand={onExpandOrder}
              />
            ))}
          </div>

          {/* Pagination */}
          {ordersData?.totalPages && ordersData.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-2 text-sm font-semibold rounded-lg border border-[#E8E2DD] hover:bg-[#F8F6F3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-[#6B6B6B]">
                Page {page + 1} of {ordersData.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(ordersData.totalPages - 1, page + 1))}
                disabled={page === ordersData.totalPages - 1}
                className="px-3 py-2 text-sm font-semibold rounded-lg border border-[#E8E2DD] hover:bg-[#F8F6F3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Expanded Order Detail Panel */}
      <KitchenQueueOrderDetailPanel
        orderId={expandedOrderId}
        isOpen={!!expandedOrderId}
        onOpenChange={(open) => {
          if (!open) {
            onExpandOrder(null);
          }
        }}
        locationId={activeLocationId}
      />

      {/* Filter Drawer */}
      <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
        <DrawerContent className="rounded-t-[20px] px-5 pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-lg font-bold text-[#171717]">Filter Orders</DrawerTitle>
            <DrawerDescription>Choose which payment statuses to show.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8A8580]">Payment Status</p>
            {PAYMENT_FILTERS.map((filter) => (
              <label key={filter.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#E8E2DD] px-3 text-sm font-semibold text-[#171717]">
                <input
                  type="radio"
                  name="payment-filter"
                  value={filter.key}
                  checked={draftPaymentFilter === filter.key}
                  onChange={() => setDraftPaymentFilter(filter.key)}
                  className="size-4 accent-[#FF2438]"
                />
                {filter.label}
              </label>
            ))}
          </div>
          <DrawerFooter className="grid grid-cols-2 gap-2 px-0">
            <DrawerClose asChild>
              <button
                type="button"
                onClick={() => {
                  setDraftPaymentFilter("ALL");
                  handlePaymentFilterChange("ALL");
                }}
                className="min-h-11 rounded-xl border border-[#E8E2DD] bg-white text-sm font-bold text-[#6B6B6B] hover:bg-[#F8F6F3] transition-colors"
              >
                Clear
              </button>
            </DrawerClose>
            <button
              type="button"
              onClick={() => handlePaymentFilterChange(draftPaymentFilter)}
              className="min-h-11 rounded-xl bg-[#171717] text-sm font-bold text-white hover:bg-[#2A2A2A] transition-colors"
            >
              Apply
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
