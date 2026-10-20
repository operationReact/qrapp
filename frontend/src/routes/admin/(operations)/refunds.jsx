import { createFileRoute, Navigate, useLocation, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowCounterClockwiseIcon,
  ArrowsClockwiseIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  DownloadSimpleIcon,
  MagnifyingGlassIcon,
  ReceiptIcon,
  WarningCircleIcon,
  XCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { LocationSelector } from "@/components/LocationSelector";
import { SectionLocationSelector } from "@/components/SectionLocationSelector";
import { getOrdersAdmin, getAdminOrder, completeManualRefund, retryEscalatedRefund } from "@/services/order-service";
import { useAuth } from "@/context/AuthContext";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { canUseRootLocationSelector } from "@/lib/sectionLocation";
import "../../../styles/refunds-admin.css";

export const Route = createFileRoute("/admin/(operations)/refunds")({
  component: RefundsPage,
});

const PAGE_SIZE = 10;

const DATE_PRESETS = [
  { value: "", label: "All dates" },
  { value: "today", label: "Today", days: 0 },
  { value: "yesterday", label: "Yesterday", days: 1, endDays: 1 },
  { value: "last7", label: "Last week", days: 6 },
  { value: "last15", label: "Last 15 days", days: 14 },
  { value: "last30", label: "Last month", months: 1 },
  { value: "last3m", label: "Last 3 months", months: 3 },
  { value: "last6m", label: "Last 6 months", months: 6 },
  { value: "last1y", label: "Last year", months: 12 },
];

function toDateInput(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function presetRange(preset) {
  const option = DATE_PRESETS.find((item) => item.value === preset);
  if (!option || option.value === "") return { from: "", to: "" };
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  if (option.months) start.setMonth(start.getMonth() - option.months);
  else start.setDate(start.getDate() - (option.days ?? 0));
  if (option.endDays) end.setDate(end.getDate() - option.endDays);
  return { from: toDateInput(start), to: toDateInput(end) };
}
const RUPEE = "\u20B9";
const DASH = "\u2014";
const DOT = "\u00B7";

const VIEWS = [
  { value: "refunds", label: "Refund Tracking" },
  { value: "cancelled", label: "Cancelled Orders" },
];

const STATUS_FILTERS = [
  { value: "", label: "All", tone: "all" },
  { value: "PENDING", label: "Pending", tone: "pending" },
  { value: "REFUNDED", label: "Refunded", tone: "refunded" },
  { value: "MANUAL_REQUIRED", label: "Manual Action", tone: "manual" },
  { value: "NOT_REQUIRED", label: "Not Required", tone: "none" },
];

const REFUND_META = {
  PENDING: { label: "Pending", tone: "pending" },
  REFUNDED: { label: "Refunded", tone: "refunded" },
  MANUAL_REQUIRED: { label: "Manual action", tone: "manual" },
  NOT_REQUIRED: { label: "Not required", tone: "none" },
};

const PAYMENT_LABELS = { RAZORPAY: "Razorpay", WALLET: "Wallet", PAY_AT_STALL: "Pay at stall" };

function countKey(refundStatus) {
  return refundStatus || "ALL";
}

function formatMoney(value) {
  return `${RUPEE}${Number(value || 0).toFixed(2)}`;
}

function formatEnum(value) {
  if (!value) return DASH;
  const text = String(value).replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatActor(value) {
  if (!value) return "System";
  return value.toUpperCase().startsWith("CUSTOMER") ? "Customer" : formatEnum(value);
}

function formatDate(value) {
  if (!value) return DASH;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDay(value) {
  if (!value) return DASH;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function initials(name) {
  return (name || "G").trim().charAt(0).toUpperCase();
}

function RefundBadge({ status }) {
  const meta = REFUND_META[status] || { label: status || "Not started", tone: "none" };
  return (
    <span className={cn("rf-badge", `rf-badge--${meta.tone}`)}>
      <i className="rf-badge-dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function PresetDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = DATE_PRESETS.find((option) => option.value === value) || DATE_PRESETS[0];

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="rf-preset" ref={rootRef}>
      <button
        type="button"
        className={cn("rf-preset-trigger", open && "rf-preset-trigger--open")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Date range"
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarBlankIcon size={16} />
        <span>{current.label}</span>
        <CaretDownIcon size={14} className="rf-preset-caret" />
      </button>
      {open && (
        <ul className="rf-preset-menu" role="listbox" aria-label="Date range">
          {DATE_PRESETS.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value || "all"} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn("rf-preset-option", active && "rf-preset-option--active")}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                  {active && <CheckIcon size={14} weight="bold" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function RefundsPage() {
  const { user, isAdmin, isSuperUser } = useAuth();
  const { activeLocationId } = useActiveLocation();
  const showRootLocationSelector = canUseRootLocationSelector(user);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [view, setView] = useState("refunds");
  const [refundStatus, setRefundStatus] = useState("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preset, setPreset] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [manualReferences, setManualReferences] = useState({});
  const [pageLocation, setPageLocation] = useState(activeLocationId);
  if (pageLocation !== activeLocationId) {
    setPageLocation(activeLocationId);
    setPage(0);
  }

  const canView = isAdmin || isSuperUser;
  const scope = useMemo(() => ({
    status: "CANCELLED",
    query: appliedQuery || undefined,
    from: from || undefined,
    to: to || undefined,
    locationId: activeLocationId,
  }), [appliedQuery, from, to, activeLocationId]);

  const params = useMemo(() => ({
    ...scope,
    page,
    size: PAGE_SIZE,
    refundStatus: view === "refunds" ? refundStatus || undefined : undefined,
  }), [scope, page, view, refundStatus]);

  const ordersQuery = useQuery({
    queryKey: ["admin", "refunds", params],
    queryFn: () => getOrdersAdmin(params),
    enabled: canView && activeLocationId !== undefined,
    staleTime: 1000 * 15,
    refetchInterval: 30000,
  });

  const countQueries = useQueries({
    queries: STATUS_FILTERS.map((option) => ({
      queryKey: ["admin", "refunds", "count", countKey(option.value), scope],
      queryFn: () => getOrdersAdmin({ ...scope, page: 0, size: 1, refundStatus: option.value || undefined }),
      enabled: canView && activeLocationId !== undefined,
      staleTime: 1000 * 15,
      refetchInterval: 30000,
    })),
  });
  const counts = Object.fromEntries(
    STATUS_FILTERS.map((option, index) => [countKey(option.value), countQueries[index].data?.totalElements ?? 0]),
  );

  const listedOrders = ordersQuery.data?.content || [];
  const activeId = ordersQuery.isSuccess && selectedId != null && !listedOrders.some((order) => order.id === selectedId)
    ? null
    : selectedId;

  const detailQuery = useQuery({
    queryKey: ["admin", "refunds", "detail", activeId, activeLocationId],
    queryFn: () => getAdminOrder(activeId, activeLocationId),
    enabled: canView && activeId != null,
  });

  const manualRefundMutation = useMutation({
    mutationFn: ({ orderId, reference }) => completeManualRefund(orderId, reference, activeLocationId),
    onSuccess: (_data, { orderId }) => {
      toast.success("Refund marked as completed");
      setManualReferences((current) => ({ ...current, [orderId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Could not complete the refund");
    },
  });

  const retryRefundMutation = useMutation({
    mutationFn: (orderId) => retryEscalatedRefund(orderId, activeLocationId),
    onSuccess: () => {
      toast.success("Retry started. The refund will be attempted again shortly.");
      queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Could not retry the refund");
    },
  });

  if (!canView) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (ordersQuery.error?.response?.status === 401 || ordersQuery.error?.response?.status === 403) {
    navigate({ to: "/login", replace: true, state: { from: location.pathname } });
    return null;
  }

  const data = ordersQuery.data || { content: [], totalElements: 0, totalPages: 0, number: 0 };
  const orders = data.content || [];
  const selectedRow = listedOrders.find((order) => order.id === activeId) || null;
  const selectedOrder = detailQuery.data || selectedRow;
  const firstItem = data.number * PAGE_SIZE + 1;
  const lastItem = data.number * PAGE_SIZE + orders.length;

  const applySearch = (event) => {
    event.preventDefault();
    setPage(0);
    setAppliedQuery(query.trim());
  };

  const resetFilters = () => {
    setQuery("");
    setAppliedQuery("");
    setFrom("");
    setTo("");
    setPreset("");
    setRefundStatus("");
    setPage(0);
  };

  const changePreset = (value) => {
    const range = presetRange(value);
    setPreset(value);
    setFrom(range.from);
    setTo(range.to);
    setPage(0);
  };

  const changeView = (nextView) => {
    setView(nextView);
    setPage(0);
    if (nextView === "cancelled") setRefundStatus("");
  };

  const changeRefundStatus = (value) => {
    setRefundStatus(value);
    setPage(0);
  };

  const changeDate = (setter) => (event) => {
    setter(event.target.value);
    setPreset("");
    setPage(0);
  };

  const openOrder = (orderId) => {
    setSelectedId(orderId);
    setDetailTab("overview");
  };

  const submitManualRefund = (orderId) => {
    const reference = (manualReferences[orderId] || "").trim();
    if (!reference) {
      toast.error("Enter the Razorpay or bank refund reference first");
      return;
    }
    manualRefundMutation.mutate({ orderId, reference });
  };

  const exportCsv = () => {
    const header = ["Order", "Customer", "Phone", "Amount", "Payment", "Refund status", "Refund amount", "Refund reference", "Cancelled at", "Cancel reason"];
    const rows = orders.map((order) => [
      order.orderNumber || order.id,
      order.userName || "",
      order.phone || "",
      order.total,
      PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod || "",
      order.refundStatus || "",
      order.refundAmount ?? "",
      order.refundReference || "",
      order.cancelledAt || "",
      order.cancelReason || "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `refunds-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="rf-page">
      <header className="rf-header">
        <div>
          <h1 className="rf-title">Refunds & Cancellations</h1>
          <p className="rf-subtitle">Track cancelled orders, refund progress, and refunds that need manual action.</p>
        </div>
        <div className="rf-header-actions">
          <div className="rf-location">
            {showRootLocationSelector
              ? <LocationSelector allowAllLocations />
              : <SectionLocationSelector />}
          </div>
          <button
            type="button"
            className="rf-btn rf-btn--icon"
            onClick={() => ordersQuery.refetch()}
            disabled={ordersQuery.isFetching}
            aria-label="Refresh"
          >
            <ArrowsClockwiseIcon size={18} className={ordersQuery.isFetching ? "rf-spin" : undefined} />
          </button>
        </div>
      </header>

      <section className="rf-kpis" aria-label="Refund summary">
        <KpiTile label="Cancelled orders" value={counts.ALL} tone="neutral" icon={<XCircleIcon weight="bold" />} />
        <KpiTile label="Refunded" value={counts.REFUNDED} tone="green" icon={<CheckCircleIcon weight="bold" />} />
        <KpiTile label="Pending refunds" value={counts.PENDING} tone="amber" icon={<ClockIcon weight="bold" />} />
        <KpiTile label="Manual action" value={counts.MANUAL_REQUIRED} tone="red" icon={<WarningCircleIcon weight="bold" />} />
      </section>

      <div className="rf-tabs" role="tablist">
        {VIEWS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={view === tab.value}
            className="rf-tab"
            onClick={() => changeView(tab.value)}
          >
            {tab.value === "refunds" ? <ArrowCounterClockwiseIcon size={16} /> : <XCircleIcon size={16} />}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rf-body">
        <section className="rf-card rf-list-card">
          <div className="rf-filters">
            <form className="rf-filter-row" onSubmit={applySearch}>
              <label className="rf-search">
                <MagnifyingGlassIcon size={16} />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by order ID or phone number"
                />
                {appliedQuery && (
                  <button type="button" className="rf-clear" aria-label="Clear search" onClick={() => { setQuery(""); setAppliedQuery(""); setPage(0); }}>
                    <XIcon size={14} />
                  </button>
                )}
              </label>
              <button type="submit" className="rf-btn rf-btn--primary">
                <MagnifyingGlassIcon size={16} weight="bold" />
                Search
              </button>
            </form>

            <div className="rf-filter-row rf-filter-row--dates">
              <PresetDropdown value={preset} onChange={changePreset} />
              <label className="rf-date">
                <span>From</span>
                <input type="date" value={from} onChange={changeDate(setFrom)} />
              </label>
              <label className="rf-date">
                <span>To</span>
                <input type="date" value={to} onChange={changeDate(setTo)} />
              </label>
              <button type="button" className="rf-btn" onClick={resetFilters}>
                <ArrowCounterClockwiseIcon size={16} />
                Reset
              </button>
              <button type="button" className="rf-btn" onClick={exportCsv} disabled={orders.length === 0}>
                <DownloadSimpleIcon size={16} />
                Export
              </button>
            </div>

            {view === "refunds" && (
              <div className="rf-chips" role="group" aria-label="Refund status">
                {STATUS_FILTERS.map((option) => (
                  <button
                    key={option.value || "all"}
                    type="button"
                    aria-pressed={refundStatus === option.value}
                    className={cn("rf-chip", `rf-chip--${option.tone}`)}
                    onClick={() => changeRefundStatus(option.value)}
                  >
                    <i className="rf-chip-dot" aria-hidden="true" />
                    {option.label}
                    <span className="rf-chip-count">{counts[countKey(option.value)]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rf-table-scroll">
          {orders.length > 0 && !ordersQuery.isLoading && !ordersQuery.isError && (
            <div className="rf-table-head" aria-hidden="true">
              <span>Order ID</span>
              <span>Customer</span>
              <span>Amount</span>
              <span>Refund</span>
              <span>Cancelled on</span>
              <span>Action</span>
            </div>
          )}

          {ordersQuery.isLoading ? (
            <div className="rf-state">Loading cancellation records{"\u2026"}</div>
          ) : ordersQuery.isError ? (
            <div className="rf-state rf-state--error">Could not load cancellation records.</div>
          ) : orders.length === 0 ? (
            <div className="rf-state">
              <ReceiptIcon className="rf-state-icon" />
              <p>No cancelled orders match these filters.</p>
            </div>
          ) : (
            <ul className="rf-list">
              {orders.map((order) => {
                const needsAction = order.refundStatus === "MANUAL_REQUIRED";
                return (
                  <li key={order.id} className={cn("rf-row", selectedId === order.id && "rf-row--active")}>
                    <div className="rf-col-order">
                      <button type="button" className="rf-link" onClick={() => openOrder(order.id)}>
                        #{order.orderNumber || order.id}
                      </button>
                      <span className="rf-cell-sub rf-cell-cancelled">
                        <XCircleIcon size={13} weight="fill" />
                        Cancelled by {formatActor(order.cancelledBy)}
                      </span>
                    </div>
                    <div className="rf-col-customer">
                      <span className="rf-avatar" aria-hidden="true">{initials(order.userName)}</span>
                      <span className="rf-customer-text">
                        <span className="rf-cell-title">{order.userName || "Guest"}</span>
                        <span className="rf-cell-sub">{order.phone || "No phone"}</span>
                      </span>
                    </div>
                    <div className="rf-col-amount">
                      <span className="rf-amount">{formatMoney(order.total)}</span>
                      <span className="rf-pay">{PAYMENT_LABELS[order.paymentMethod] || DASH}</span>
                    </div>
                    <div className="rf-col-refund">
                      <RefundBadge status={order.refundStatus} />
                      {order.refundReference && <span className="rf-cell-sub rf-mono">{order.refundReference}</span>}
                    </div>
                    <div className="rf-col-date">
                      <span className="rf-cell-title">{formatDay(order.cancelledAt || order.createdAt)}</span>
                      <span className="rf-cell-sub">{formatTime(order.cancelledAt || order.createdAt)}</span>
                    </div>
                    <div className="rf-col-action">
                      <button
                        type="button"
                        className={cn("rf-btn rf-btn--sm", needsAction && "rf-btn--primary")}
                        onClick={() => openOrder(order.id)}
                      >
                        {needsAction ? "Process" : "View"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          </div>

          <div className="rf-footer">
            <span>
              {orders.length === 0
                ? "Showing 0 results"
                : `Showing ${firstItem} to ${lastItem} of ${data.totalElements} results`}
            </span>
            {data.totalPages > 1 && (
              <div className="rf-pager">
                <button type="button" className="rf-btn rf-btn--sm" disabled={data.number === 0} onClick={() => setPage((current) => current - 1)}>Previous</button>
                <button type="button" className="rf-page-num" aria-current="page">{data.number + 1}</button>
                <span>of {data.totalPages}</span>
                <button type="button" className="rf-btn rf-btn--sm" disabled={data.number + 1 >= data.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
              </div>
            )}
          </div>
        </section>

        <OrderDetailPanel
          order={selectedOrder}
          loading={detailQuery.isFetching && !detailQuery.data}
          isOpen={activeId != null}
          tab={detailTab}
          onTab={setDetailTab}
          onClose={() => setSelectedId(null)}
          reference={manualReferences[selectedOrder?.id] || ""}
          onReferenceChange={(value) => setManualReferences((current) => ({ ...current, [selectedOrder?.id]: value }))}
          onProcess={() => submitManualRefund(selectedOrder.id)}
          submitting={manualRefundMutation.isPending}
          onRetry={() => retryRefundMutation.mutate(selectedOrder.id)}
          retrying={retryRefundMutation.isPending}
        />
      </div>
    </main>
  );
}

function KpiTile({ label, value, tone, icon }) {
  return (
    <div className="rf-kpi">
      <span className={cn("rf-kpi-icon", `rf-tone--${tone}`)}>{icon}</span>
      <div className="min-w-0">
        <p className="rf-kpi-label">{label}</p>
        <p className="rf-kpi-value">{value}</p>
      </div>
    </div>
  );
}

const DETAIL_TABS = [
  { value: "overview", label: "Overview" },
  { value: "timeline", label: "Timeline" },
  { value: "items", label: "Items" },
];

function OrderDetailPanel({ order, loading, isOpen, tab, onTab, onClose, reference, onReferenceChange, onProcess, submitting, onRetry, retrying }) {
  if (!order) {
    return (
      <aside className={cn("rf-detail", isOpen && "rf-detail--open")} aria-label="Order refund details">
        <div className="rf-empty-detail">Select an order to view its refund details.</div>
      </aside>
    );
  }

  const needsAction = order.refundStatus === "MANUAL_REQUIRED";
  const history = order.history || [];
  const items = order.items || [];

  return (
    <aside className={cn("rf-detail", isOpen && "rf-detail--open")} aria-label="Order refund details">
      <div className="rf-detail-head">
        <h2>Order #{order.orderNumber || order.id}</h2>
        <button type="button" className="rf-icon-btn" onClick={onClose} aria-label="Close details">
          <XIcon size={18} />
        </button>
      </div>

      <div className="rf-tabs rf-detail-tabs" role="tablist">
        {DETAIL_TABS.map((item) => (
          <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} className="rf-tab" onClick={() => onTab(item.value)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="rf-detail-body">
        {loading && <p className="rf-note">Loading details{"\u2026"}</p>}

        {tab === "overview" && (
          <>
            <div className="rf-hero">
              <div>
                <span className="rf-hero-label">Order total</span>
                <span className="rf-hero-amount">{formatMoney(order.total)}</span>
              </div>
              <RefundBadge status={order.refundStatus} />
            </div>
          <dl className="rf-kv">
            <KvRow label="Refund amount">{order.refundAmount != null ? formatMoney(order.refundAmount) : DASH}</KvRow>
            <KvRow label="Payment method">{PAYMENT_LABELS[order.paymentMethod] || DASH}</KvRow>
            <KvRow label="Payment status">{formatEnum(order.paymentStatus)}</KvRow>
            <KvRow label="Customer">{order.userName || "Guest"}</KvRow>
            <KvRow label="Phone">{order.phone || DASH}</KvRow>
            <KvRow label="Cancelled on">{formatDate(order.cancelledAt)}</KvRow>
            <KvRow label="Cancelled by">{formatActor(order.cancelledBy)}</KvRow>
            <KvRow label="Refund reference">{order.refundReference || DASH}</KvRow>
            <KvRow label="Reason">{order.cancelReason || "No reason given"}</KvRow>
            <KvRow label="Admin note">{order.adminNote || DASH}</KvRow>
          </dl>
          </>
        )}

        {tab === "timeline" && (
          history.length === 0 ? (
            <p className="rf-note">No status history recorded.</p>
          ) : (
            <ol className="rf-timeline">
              {history.map((entry, index) => (
                <li key={`${entry.changedAt}-${index}`} className="rf-timeline-item">
                  <span className="rf-timeline-dot" aria-hidden="true" />
                  <div className="rf-timeline-card">
                    <div className="rf-timeline-top">
                      <strong>{formatEnum(entry.newStatus || entry.actionType) || "Update"}</strong>
                      <span className="rf-timeline-time">{formatDate(entry.changedAt)}</span>
                    </div>
                    {(entry.reason || entry.note || entry.changedBy) && (
                      <span className="rf-cell-sub">{entry.reason || entry.note || formatActor(entry.changedBy)}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )
        )}

        {tab === "items" && (
          items.length === 0 ? (
            <p className="rf-note">No items on this order.</p>
          ) : (
            <>
              <ul className="rf-items">
                {items.map((item, index) => (
                  <li key={`${item.itemId}-${index}`} className="rf-item">
                    <span className="rf-item-qty">{item.quantity}{"\u00D7"}</span>
                    <span className="rf-item-name">{item.name}</span>
                    <span className="rf-amount">{formatMoney(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="rf-items-total">
                <span>Items subtotal</span>
                <span className="rf-amount">{formatMoney(items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0))}</span>
              </div>
            </>
          )
        )}
      </div>

      <div className="rf-detail-actions">
        {needsAction ? (
          <>
            <input
              className="rf-input"
              value={reference}
              onChange={(event) => onReferenceChange(event.target.value)}
              placeholder="Refund reference (Razorpay or bank)"
            />
            <button type="button" className="rf-btn rf-btn--primary" onClick={onProcess} disabled={submitting || retrying}>
              Process refund
            </button>
            {order.paymentMethod === "RAZORPAY" && (
              <button type="button" className="rf-btn" onClick={onRetry} disabled={submitting || retrying}>
                {retrying ? "Retrying..." : "Retry refund"}
              </button>
            )}
          </>
        ) : (
          <p className="rf-note">No refund action needed.</p>
        )}
      </div>
    </aside>
  );
}

function KvRow({ label, children }) {
  return (
    <div className="rf-kv-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
