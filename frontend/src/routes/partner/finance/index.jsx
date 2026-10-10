import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Banknote, CheckCircle2, Clock3, FileText, Percent, Scale, TrendingUp, Undo2 } from "lucide-react";
import {
  FinanceEmpty,
  FinanceError,
  FinanceHeading,
  FinanceKpiCard,
  FinanceLoading,
  FinanceTabs,
  PeriodDropdown,
  RefundNotice,
  SettlementsList,
  StatusBadge,
  TaxNotice,
} from "@/components/partner/PartnerFinanceComponents";
import { GenerateSettlementButton } from "@/components/partner/PartnerFinanceActions";
import {
  commissionBasisLabel,
  formatCount,
  formatDate,
  formatInr,
  formatPercent,
  formatPeriod,
  isValidPeriod,
  recentPeriods,
  taxTreatmentLabel,
} from "@/lib/partnerFinance";
import {
  partnerFinanceCurrentAgreementOptions,
  partnerFinancePreviewOptions,
  partnerFinanceSummaryOptions,
  partnerSettlementsOptions,
} from "@/query/options/partner-finance";

export const Route = createFileRoute("/partner/finance/")({
  validateSearch: (search) => ({ period: isValidPeriod(search.period) ? search.period : undefined }),
  component: FinanceOverview,
});

const LOADING = "\u2026";
const UNAVAILABLE = "Unavailable";

function FinanceOverview() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const periods = recentPeriods(12);
  const period = periods.includes(search.period) ? search.period : periods[0];
  const summary = useQuery(partnerFinanceSummaryOptions());
  const agreement = useQuery(partnerFinanceCurrentAgreementOptions());
  const preview = useQuery(partnerFinancePreviewOptions(period));
  const recent = useQuery(partnerSettlementsOptions({ page: 0, size: 12 }));

  const rows = recent.data?.content || [];
  const periodSettlement = rows.find((row) => row.period === period && row.status !== "VOID") || rows.find((row) => row.period === period);
  const previewData = preview.data;
  const previewValue = (field) => previewData ? formatInr(previewData[field]) : preview.isError ? UNAVAILABLE : LOADING;
  const summaryValue = (field) => summary.data ? formatInr(summary.data[field]) : summary.isError ? UNAVAILABLE : LOADING;
  const approved = summary.data?.byStatus?.find((item) => item.status === "APPROVED");
  const paid = summary.data?.byStatus?.find((item) => item.status === "PAID");
  const agreementMissing = agreement.isError && agreement.error?.response?.status === 404;

  return (
    <section className="partner-fin-page">
      <FinanceHeading
        eyebrow="Finance"
        title="Revenue & commission"
        description="Track sales, commission and monthly settlements for your partner account. All amounts are in INR."
        actions={<GenerateSettlementButton defaultPeriod={period} />}
      />
      <FinanceTabs />

      <AgreementBanner agreement={agreement.data} loading={agreement.isLoading} missing={agreementMissing} error={agreement.isError && !agreementMissing} />

      <div className="partner-fin-toolbar">
        <div>
          <p className="partner-eyebrow">{previewData?.periodClosed === false ? "Month-to-date preview" : "Period overview"}</p>
          <h2 className="partner-fin-h2">{formatPeriod(period)}</h2>
        </div>
        <PeriodDropdown periods={periods} value={period} onChange={(value) => navigate({ search: { period: value === periods[0] ? undefined : value }, replace: true })} />
      </div>

      {preview.isError && <FinanceError message="The preview for this period is unavailable." onRetry={() => preview.refetch()} />}
      {previewData && !previewData.agreementCoverage && (
        <p className="partner-fin-muted partner-fin-warning-line">No commission agreement covers this period, so commission cannot be calculated for it.</p>
      )}

      <section className="partner-fin-kpi-grid" aria-label="Finance metrics">
        <FinanceKpiCard label="Gross Sales" value={previewValue("grossSales")} detail={previewData ? `${formatCount(previewData.orderCount)} orders` : "Before discounts"} icon={TrendingUp} tone="red" />
        <FinanceKpiCard label="Eligible Sales" value={previewValue("eligibleSales")} detail={previewData ? `${formatCount(previewData.eligibleOrderCount)} eligible orders` : "Commissionable sales"} icon={Banknote} tone="blue" />
        <FinanceKpiCard
          label="Refunds"
          value={previewValue("refundTotal")}
          detail={previewData && !previewData.refundDataAvailable ? "Refund source unavailable" : "Deducted from eligible sales"}
          badge={previewData && !previewData.refundDataAvailable ? "Zero" : undefined}
          icon={Undo2}
          tone="gold"
        />
        <FinanceKpiCard label="Commission" value={previewValue("commissionAmount")} detail={previewData ? `On ${formatInr(previewData.commissionBasisTotal)} basis` : "Per agreement"} icon={Percent} tone="red" />
        <FinanceKpiCard
          label="Net Settlement"
          value={periodSettlement ? formatInr(periodSettlement.netPayable) : recent.isLoading ? LOADING : "\u2014"}
          detail={periodSettlement ? `Settlement #${periodSettlement.id} · ${periodSettlement.status.toLowerCase()}` : "Not generated for this period"}
          icon={Scale}
          tone="green"
        />
        <FinanceKpiCard label="Pending" value={summaryValue("outstandingPayable")} detail={approved ? `${formatCount(approved.count)} approved, awaiting payment` : "Approved, awaiting payment"} icon={Clock3} tone="gold" />
        <FinanceKpiCard label="Paid" value={summaryValue("totalPaid")} detail={paid ? `${formatCount(paid.count)} paid settlements` : "All-time payouts"} icon={CheckCircle2} tone="green" />
      </section>

      <div className="partner-fin-notices">
        <TaxNotice note={summary.data?.taxNote || previewData?.taxNote} treatment={agreement.data?.taxTreatment} />
        {previewData && <RefundNotice available={previewData.refundDataAvailable} />}
      </div>

      {summary.data?.byStatus?.length > 0 && (
        <section className="partner-section-card" aria-label="Settlements by status">
          <div className="partner-section-header"><div><p className="partner-eyebrow">Pipeline</p><h2>Settlements by status</h2></div></div>
          <ul className="partner-fin-status-list">
            {summary.data.byStatus.map((item) => (
              <li key={item.status}><StatusBadge status={item.status} /><span>{formatCount(item.count)} {item.count === 1 ? "settlement" : "settlements"}</span><strong>{formatInr(item.netPayable)}</strong></li>
            ))}
          </ul>
        </section>
      )}

      <section className="partner-fin-block" aria-label="Recent settlements">
        <div className="partner-section-header">
          <div><p className="partner-eyebrow">Settlements</p><h2>Recent settlements</h2></div>
          <Link to="/partner/finance/settlements" className="partner-section-action">View all<ArrowRight className="size-3" /></Link>
        </div>
        {recent.isLoading ? <FinanceLoading />
          : recent.isError ? <FinanceError message="Settlements are temporarily unavailable." onRetry={() => recent.refetch()} />
            : rows.length ? <SettlementsList rows={rows.slice(0, 5)} />
              : <FinanceEmpty icon={FileText} title="No settlements yet" description="Settlements are generated monthly from completed orders once a commission agreement is in effect." />}
      </section>
    </section>
  );
}

function AgreementBanner({ agreement, loading, missing, error }) {
  if (loading) return null;
  return (
    <section className="partner-fin-agreement-strip" aria-label="Current commission agreement">
      <div>
        <p className="partner-eyebrow">Current agreement</p>
        {agreement ? (
          <p><strong>{formatPercent(agreement.ratePercent)}</strong> of {commissionBasisLabel(agreement.commissionBasis).toLowerCase()} · from {formatDate(agreement.effectiveFrom)}{agreement.effectiveTo ? ` to ${formatDate(agreement.effectiveTo)}` : ""} · Tax/TDS {taxTreatmentLabel(agreement.taxTreatment).toLowerCase()}</p>
        ) : missing ? <p>No commission agreement is currently in effect.</p>
          : error ? <p>The current agreement could not be loaded.</p> : null}
      </div>
      <Link to="/partner/finance/agreements" className="partner-section-action">View agreements<ArrowRight className="size-3" /></Link>
    </section>
  );
}
