import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, MapPin } from "lucide-react";
import { usePartner } from "@/context/PartnerContext";
import {
  AdjustmentsPanel,
  AuditPanel,
  FinanceEmpty,
  FinanceError,
  FinanceFilterDropdown,
  FinanceLoading,
  FinancePagination,
  LineItemsPanel,
  RefundNotice,
  SettlementSummary,
  SettlementTimeline,
  StatusBadge,
  TaxNotice,
} from "@/components/partner/PartnerFinanceComponents";
import { AddAdjustmentButton, SettlementActions, StatementButton } from "@/components/partner/PartnerFinanceActions";
import { financeErrorMessage, formatDate, formatPeriod } from "@/lib/partnerFinance";
import {
  partnerSettlementAuditOptions,
  partnerSettlementLineItemsOptions,
  partnerSettlementOptions,
} from "@/query/options/partner-finance";

const LINE_PAGE_SIZE = 20;
const TABS = [["items", "Line items"], ["audit", "Audit trail"]];

export const Route = createFileRoute("/partner/finance/settlements/$settlementId")({
  validateSearch: (search) => {
    const page = Number.parseInt(search.page, 10);
    const location = Number.parseInt(search.location, 10);
    return {
      tab: search.tab === "audit" ? "audit" : undefined,
      page: Number.isInteger(page) && page > 1 ? page : undefined,
      location: Number.isInteger(location) && location > 0 ? String(location) : undefined,
    };
  },
  component: SettlementDetailPage,
});

function SettlementDetailPage() {
  const { settlementId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const detail = useQuery(partnerSettlementOptions(settlementId));
  const tab = search.tab || "items";
  const setSearch = (next) => navigate({ search: (previous) => ({ ...previous, ...next }) });

  if (detail.isLoading) return <section className="partner-fin-page"><BackLink /><FinanceLoading /></section>;
  if (detail.isError || !detail.data?.settlement) {
    return <section className="partner-fin-page"><BackLink /><FinanceError message={financeErrorMessage(detail.error, "This settlement is temporarily unavailable.")} onRetry={() => detail.refetch()} /></section>;
  }
  const { settlement, adjustments } = detail.data;

  return (
    <section className="partner-fin-page">
      <BackLink />
      <header className="partner-fin-detail-head">
        <div>
          <p className="partner-eyebrow">Settlement #{settlement.id}</p>
          <h1>{formatPeriod(settlement.period)}</h1>
          <p className="partner-fin-heading-copy">
            <StatusBadge status={settlement.status} />
            <span className="partner-fin-truncate" title={settlement.partnerName}>{settlement.partnerName}</span>
            <span>{formatDate(settlement.periodStart)} – {formatDate(settlement.periodEnd)}</span>
          </p>
        </div>
        <div className="partner-fin-heading-actions">
          <StatementButton settlement={settlement} />
          <SettlementActions settlement={settlement} />
        </div>
      </header>

      <div className="partner-fin-notices">
        <RefundNotice available={settlement.refundDataAvailable} />
        <TaxNotice note={settlement.taxNote} treatment={settlement.taxTreatment} />
      </div>

      <div className="partner-fin-detail-grid">
        <SettlementSummary settlement={settlement} />
        <SettlementTimeline settlement={settlement} />
      </div>

      <AdjustmentsPanel adjustments={adjustments} action={<AddAdjustmentButton settlement={settlement} />} />

      <section className="partner-section-card partner-fin-tabs-card">
        <div className="partner-fin-subtabs" role="tablist" aria-label="Settlement details">
          {TABS.map(([value, label]) => (
            <button key={value} type="button" role="tab" id={`fin-tab-${value}`} aria-selected={tab === value} aria-controls={`fin-panel-${value}`} className={tab === value ? "is-active" : ""} onClick={() => setSearch({ tab: value === "items" ? undefined : value })}>{label}</button>
          ))}
        </div>
        <div role="tabpanel" id={`fin-panel-${tab}`} aria-labelledby={`fin-tab-${tab}`}>
          {tab === "items"
            ? <LineItemsSection settlementId={settlementId} page={(search.page || 1) - 1} locationId={search.location} onSearch={setSearch} />
            : <AuditSection settlementId={settlementId} />}
        </div>
      </section>
    </section>
  );
}

function BackLink() {
  return <Link to="/partner/finance/settlements" className="partner-fin-back"><ArrowLeft className="size-4" />All settlements</Link>;
}

function LineItemsSection({ settlementId, page, locationId, onSearch }) {
  const { locations } = usePartner();
  const query = useQuery(partnerSettlementLineItemsOptions(settlementId, { page, size: LINE_PAGE_SIZE, locationId }));
  const items = query.data?.content || [];
  const options = [["", "All locations"], ...locations.map((location) => [String(location.locationId), location.locationName])];
  return (
    <div className="partner-fin-tab-body">
      <div className="partner-fin-toolbar">
        <p className="partner-fin-muted">Orders included in this settlement.</p>
        <FinanceFilterDropdown icon={MapPin} label="Location" value={locationId || ""} options={options} onChange={(value) => onSearch({ location: value || undefined, page: undefined })} />
      </div>
      {query.isLoading ? <FinanceLoading />
        : query.isError ? <FinanceError message="Line items are temporarily unavailable." onRetry={() => query.refetch()} />
          : items.length ? (
            <>
              <LineItemsPanel items={items} />
              <FinancePagination page={page} data={query.data} noun="line items" onPage={(next) => onSearch({ page: next > 0 ? next + 1 : undefined })} />
            </>
          ) : <FinanceEmpty icon={FileText} title="No line items" description={locationId ? "No orders for this location in the settlement." : "This settlement has no calculated orders yet. Calculate it to populate line items."} />}
    </div>
  );
}

function AuditSection({ settlementId }) {
  const query = useQuery(partnerSettlementAuditOptions(settlementId));
  if (query.isLoading) return <FinanceLoading />;
  if (query.isError) return <FinanceError message="The audit trail is temporarily unavailable." onRetry={() => query.refetch()} />;
  return <div className="partner-fin-tab-body"><AuditPanel entries={query.data} /></div>;
}
