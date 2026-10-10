import { Link, useLocation } from "@tanstack/react-router";
import { AlertTriangle, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, FileText, Info, ReceiptText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  adjustmentMeta,
  commissionBasisLabel,
  agreementStatusLabel,
  formatCount,
  formatDate,
  formatDateTime,
  formatInr,
  formatPercent,
  formatPeriod,
  statusMeta,
  taxTreatmentLabel,
} from "@/lib/partnerFinance";

const EMPTY = "\u2014";

export function FinanceHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="partner-fin-heading">
      <div>
        <p className="partner-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="partner-fin-heading-copy">{description}</p>}
      </div>
      {actions && <div className="partner-fin-heading-actions">{actions}</div>}
    </div>
  );
}

const financeTabs = [
  { to: "/partner/finance", label: "Overview", match: (path) => path === "/partner/finance" },
  { to: "/partner/finance/settlements", label: "Settlements", match: (path) => path.startsWith("/partner/finance/settlements") },
  { to: "/partner/finance/agreements", label: "Agreements", match: (path) => path.startsWith("/partner/finance/agreements") },
];

export function FinanceTabs() {
  const pathname = useLocation({ select: (location) => location.pathname.replace(/\/+$/, "") });
  return (
    <nav className="partner-fin-tabs" aria-label="Finance sections">
      {financeTabs.map((tab) => {
        const active = tab.match(pathname);
        return <Link key={tab.to} to={tab.to} className={`partner-fin-tab ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>{tab.label}</Link>;
      })}
    </nav>
  );
}

export function FinanceKpiCard({ label, value, detail, icon, tone = "red", badge }) {
  const Icon = icon;
  return (
    <article className={`partner-fin-kpi tone-${tone}`}>
      <div className="partner-metric-icon"><Icon className="size-[17px]" /></div>
      <div className="partner-fin-kpi-copy">
        <p>{label}{badge && <em>{badge}</em>}</p>
        <strong title={value}>{value}</strong>
        {detail && <span>{detail}</span>}
      </div>
    </article>
  );
}

export function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return <span className={`partner-fin-status is-${meta.tone}`} title={meta.hint}>{meta.label}</span>;
}

export function TaxNotice({ note, treatment }) {
  return (
    <aside className="partner-fin-notice" role="note">
      <Info className="size-4" />
      <div>
        <strong>Tax and TDS are deferred</strong>
        <p>{note || "Tax and TDS are not computed; treatment is deferred."}{treatment ? ` Tax treatment on this agreement: ${taxTreatmentLabel(treatment)}.` : " Tax treatment is configured on your commission agreement."}</p>
      </div>
    </aside>
  );
}

export function RefundNotice({ available, compact = false }) {
  if (available) return null;
  return (
    <aside className={`partner-fin-notice is-warning ${compact ? "is-compact" : ""}`} role="note">
      <AlertTriangle className="size-4" />
      <div>
        <strong>Refund source unavailable</strong>
        <p>Refund data is not available yet, so refunds are reported as {formatInr("0")} and are not deducted. Record known refunds as a refund adjustment.</p>
      </div>
    </aside>
  );
}

export function FinanceFilterDropdown({ icon, label, value, options, onChange }) {
  const Icon = icon;
  const selected = options.find(([optionValue]) => optionValue === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="partner-analytics-filter partner-fin-filter" aria-label={`${label}: ${selected?.[1] || "none"}`}>
          <Icon className="size-4 shrink-0" />
          <span>{selected?.[1] || label}</span>
          <ChevronDown className="size-3 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1rem))]">
        {options.map(([optionValue, optionLabel]) => (
          <DropdownMenuItem key={optionValue} onClick={() => onChange(optionValue)} className="min-w-0">
            <span className="min-w-0 truncate">{optionLabel}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PeriodDropdown({ periods, value, onChange, label = "Period" }) {
  return <FinanceFilterDropdown icon={CalendarDays} label={label} value={value} options={periods.map((period) => [period, formatPeriod(period)])} onChange={onChange} />;
}

export function FinancePagination({ page, data, onPage, noun = "items" }) {
  const totalPages = data?.totalPages || 0;
  if (!data || totalPages <= 1) {
    return data?.totalElements ? <p className="partner-fin-pagination-note">{formatCount(data.totalElements)} {noun}</p> : null;
  }
  return (
    <nav className="partner-fin-pagination" aria-label={`${noun} pagination`}>
      <span>Page {page + 1} of {totalPages} · {formatCount(data.totalElements)} {noun}</span>
      <div>
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 0} aria-label="Previous page"><ChevronLeft className="size-4" />Prev</button>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages - 1} aria-label="Next page">Next<ChevronRight className="size-4" /></button>
      </div>
    </nav>
  );
}

export function FinanceLoading() {
  return <div className="partner-page-skeleton" aria-busy="true" aria-label="Loading finance data"><div /><div /><div /></div>;
}

export function FinanceError({ message, onRetry }) {
  return (
    <div className="partner-inline-error partner-fin-error" role="alert">
      <span>{message}</span>
      {onRetry && <button type="button" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function FinanceEmpty({ icon, title, description, children }) {
  const Icon = icon || FileText;
  return (
    <div className="partner-fin-empty">
      <div className="partner-empty-icon"><Icon className="size-5" /></div>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}

export function SettlementsList({ rows }) {
  return (
    <div className="partner-fin-listwrap">
      <table className="partner-data-table partner-fin-table">
        <thead>
          <tr>
            <th>Period</th><th>Status</th><th className="is-num">Orders</th><th className="is-num">Gross sales</th>
            <th className="is-num">Eligible sales</th><th className="is-num">Commission</th><th className="is-num">Adjustments</th>
            <th className="is-num">Net payable</th><th><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><SettlementLink row={row} className="partner-data-link">{formatPeriod(row.period)}</SettlementLink><small>#{row.id}</small></td>
              <td><StatusBadge status={row.status} /></td>
              <td className="is-num">{formatCount(row.orderCount)}<small>{formatCount(row.eligibleOrderCount)} eligible</small></td>
              <td className="is-num">{formatInr(row.grossSales)}</td>
              <td className="is-num">{formatInr(row.eligibleSales)}</td>
              <td className="is-num">{formatInr(row.commissionAmount)}</td>
              <td className="is-num">{formatInr(row.adjustmentTotal)}</td>
              <td className="is-num"><strong>{formatInr(row.netPayable)}</strong></td>
              <td><SettlementLink row={row} className="partner-view-link">View</SettlementLink></td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="partner-fin-cards" aria-label="Settlements">
        {rows.map((row) => (
          <li key={row.id}>
            <SettlementLink row={row} className="partner-fin-card-link">
              <div className="partner-fin-card-top"><strong>{formatPeriod(row.period)}</strong><StatusBadge status={row.status} /></div>
              <p className="partner-fin-card-net"><span>Net payable</span><b>{formatInr(row.netPayable)}</b></p>
              <dl>
                <div><dt>Gross sales</dt><dd>{formatInr(row.grossSales)}</dd></div>
                <div><dt>Eligible sales</dt><dd>{formatInr(row.eligibleSales)}</dd></div>
                <div><dt>Commission</dt><dd>{formatInr(row.commissionAmount)}</dd></div>
                <div><dt>Adjustments</dt><dd>{formatInr(row.adjustmentTotal)}</dd></div>
                <div><dt>Orders</dt><dd>{formatCount(row.orderCount)}</dd></div>
                <div><dt>Settlement</dt><dd>#{row.id}</dd></div>
              </dl>
            </SettlementLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettlementLink({ row, className, children }) {
  return <Link to="/partner/finance/settlements/$settlementId" params={{ settlementId: String(row.id) }} className={className}>{children}</Link>;
}

function Row({ label, value, hint, strong }) {
  return (
    <div className={`partner-fin-row ${strong ? "is-strong" : ""}`}>
      <dt>{label}{hint && <small>{hint}</small>}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function SettlementSummary({ settlement }) {
  const refundHint = settlement.refundDataAvailable ? "Applied to eligible sales" : "Source unavailable, reported as zero";
  return (
    <section className="partner-section-card partner-fin-summary" aria-label="Financial summary">
      <div className="partner-fin-summary-grid">
        <div>
          <h3>Sales</h3>
          <dl>
            <Row label="Orders" value={formatCount(settlement.orderCount)} />
            <Row label="Eligible orders" value={formatCount(settlement.eligibleOrderCount)} />
            <Row label="Gross sales" value={formatInr(settlement.grossSales)} />
            <Row label="Discounts" value={formatInr(settlement.discountTotal)} />
            <Row label="Tax collected" value={formatInr(settlement.taxTotal)} hint="Reported only; not computed" />
            <Row label="Refunds" value={formatInr(settlement.refundTotal)} hint={refundHint} />
            <Row label="Net sales" value={formatInr(settlement.netSales)} />
            <Row label="Eligible sales" value={formatInr(settlement.eligibleSales)} strong />
          </dl>
        </div>
        <div>
          <h3>Settlement</h3>
          <dl>
            <Row label="Commission basis" value={formatInr(settlement.commissionBasisTotal)} />
            <Row label="Commission" value={formatInr(settlement.commissionAmount)} />
            <Row label="Adjustments" value={formatInr(settlement.adjustmentTotal)} />
            <Row label="Tax / TDS" value={taxTreatmentLabel(settlement.taxTreatment)} hint="Not computed" />
          </dl>
          <div className="partner-fin-net">
            <span>Net payable</span>
            <strong title={formatInr(settlement.netPayable)}>{formatInr(settlement.netPayable)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SettlementTimeline({ settlement }) {
  const rows = [
    ["Created", formatDateTime(settlement.createdAt)],
    ["Calculated", settlement.calculatedAt ? formatDateTime(settlement.calculatedAt) : null],
    ["Approved", settlement.approvedAt ? `${formatDateTime(settlement.approvedAt)}${settlement.approvedBy ? ` by ${settlement.approvedBy}` : ""}` : null],
    ["Paid on", settlement.paidOn ? formatDate(settlement.paidOn) : null],
    ["Payment reference", settlement.paymentReference],
    ["Payment note", settlement.paymentNote],
    ["Voided", settlement.voidedAt ? formatDateTime(settlement.voidedAt) : null],
    ["Void reason", settlement.voidReason],
  ].filter(([, value]) => value);
  return (
    <section className="partner-section-card partner-fin-lifecycle" aria-label="Settlement lifecycle">
      <h3>Lifecycle</h3>
      <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>
  );
}

export function AdjustmentsPanel({ adjustments, action }) {
  return (
    <section className="partner-section-card" aria-label="Adjustments">
      <div className="partner-fin-panel-head"><div><p className="partner-eyebrow">Adjustments</p><h2>Manual adjustments</h2></div>{action}</div>
      {adjustments?.length ? (
        <ul className="partner-fin-adjustments">
          {adjustments.map((adjustment) => {
            const meta = adjustmentMeta(adjustment.type);
            return (
              <li key={adjustment.id}>
                <div className="partner-fin-adjustment-top"><span className={`partner-fin-chip ${adjustment.type === "MANUAL_CREDIT" ? "is-credit" : "is-debit"}`}>{meta.label}</span><strong>{formatInr(adjustment.amount)}</strong></div>
                <p>{adjustment.reason}</p>
                <small>{adjustment.createdBy || EMPTY} · {formatDateTime(adjustment.createdAt)} · {meta.effect}</small>
              </li>
            );
          })}
        </ul>
      ) : <p className="partner-fin-muted">No adjustments have been recorded for this settlement.</p>}
    </section>
  );
}

export function LineItemsPanel({ items }) {
  return (
    <div className="partner-fin-listwrap partner-fin-lines">
      <table className="partner-data-table partner-fin-table">
        <thead>
          <tr>
            <th>Order</th><th>Location</th><th className="is-num">Gross</th><th className="is-num">Discount</th><th className="is-num">Tax</th>
            <th className="is-num">Refund</th><th className="is-num">Net</th><th>Eligibility</th><th className="is-num">Commission</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td><span className="partner-fin-truncate" title={item.orderNumber}>{item.orderNumber || `#${item.orderId}`}</span><small>{formatDateTime(item.completedAt)}</small></td>
              <td><span className="partner-fin-truncate" title={item.locationName}>{item.locationName || EMPTY}</span><small>{item.locationCode}</small></td>
              <td className="is-num">{formatInr(item.grossAmount)}</td>
              <td className="is-num">{formatInr(item.discountAmount)}</td>
              <td className="is-num">{formatInr(item.taxAmount)}</td>
              <td className="is-num">{formatInr(item.refundAmount)}</td>
              <td className="is-num">{formatInr(item.netAmount)}</td>
              <td><EligibilityChip item={item} /></td>
              <td className="is-num">{formatInr(item.commissionAmount)}<small>{item.commissionApplied ? `${formatPercent(item.ratePercent)} · ${commissionBasisLabel(item.commissionBasis)}` : "No agreement"}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="partner-fin-cards" aria-label="Line items">
        {items.map((item) => (
          <li key={item.id}>
            <div className="partner-fin-card-link">
              <div className="partner-fin-card-top"><strong className="partner-fin-truncate" title={item.orderNumber}>{item.orderNumber || `#${item.orderId}`}</strong><EligibilityChip item={item} /></div>
              <p className="partner-fin-card-sub"><ReceiptText className="size-3" />{formatDateTime(item.completedAt)} · <span className="partner-fin-truncate" title={item.locationName}>{item.locationName || EMPTY}</span></p>
              <dl>
                <div><dt>Gross</dt><dd>{formatInr(item.grossAmount)}</dd></div>
                <div><dt>Discount</dt><dd>{formatInr(item.discountAmount)}</dd></div>
                <div><dt>Tax</dt><dd>{formatInr(item.taxAmount)}</dd></div>
                <div><dt>Refund</dt><dd>{formatInr(item.refundAmount)}</dd></div>
                <div><dt>Net</dt><dd>{formatInr(item.netAmount)}</dd></div>
                <div><dt>Commission</dt><dd>{formatInr(item.commissionAmount)}</dd></div>
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EligibilityChip({ item }) {
  if (item.eligible) return <span className="partner-fin-chip is-credit">Eligible</span>;
  return <span className="partner-fin-chip is-muted" title={item.exclusionReason || "Excluded"}>{item.exclusionReason ? `Excluded: ${humanize(item.exclusionReason)}` : "Excluded"}</span>;
}

function humanize(value) {
  return String(value).toLowerCase().replace(/_/g, " ");
}

export function AuditPanel({ entries }) {
  if (!entries?.length) return <p className="partner-fin-muted">No audit entries yet.</p>;
  return (
    <ol className="partner-fin-audit">
      {entries.map((entry) => (
        <li key={entry.id}>
          <span className="partner-fin-audit-dot" />
          <div>
            <div className="partner-fin-audit-top"><strong>{humanize(entry.action)}</strong><small>{formatDateTime(entry.createdAt)}</small></div>
            <p>{entry.actorName || "System"}{entry.reason ? ` — ${entry.reason}` : ""}</p>
            {(entry.previousValue || entry.newValue) && (
              <details>
                <summary>View change</summary>
                {entry.previousValue && <p className="partner-fin-audit-value"><b>Before</b> {entry.previousValue}</p>}
                {entry.newValue && <p className="partner-fin-audit-value"><b>After</b> {entry.newValue}</p>}
              </details>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AgreementCard({ agreement }) {
  return (
    <article className={`partner-fin-agreement ${agreement.currentlyEffective ? "is-current" : ""}`}>
      <div className="partner-fin-card-top">
        <strong>{formatPercent(agreement.ratePercent)} commission</strong>
        <span className="partner-fin-agreement-badges">
          {agreement.currentlyEffective && <span className="partner-fin-status is-green">In effect</span>}
          <span className={`partner-fin-status ${agreement.status === "ACTIVE" ? "is-blue" : "is-red"}`}>{agreementStatusLabel(agreement.status)}</span>
        </span>
      </div>
      <dl>
        <div><dt>Commission basis</dt><dd>{commissionBasisLabel(agreement.commissionBasis)}</dd></div>
        <div><dt>Type</dt><dd>{humanize(agreement.commissionType)}</dd></div>
        <div><dt>Effective from</dt><dd>{formatDate(agreement.effectiveFrom)}</dd></div>
        <div><dt>Effective to</dt><dd>{agreement.effectiveTo ? formatDate(agreement.effectiveTo) : "Open-ended"}</dd></div>
        <div><dt>Tax / TDS</dt><dd>{taxTreatmentLabel(agreement.taxTreatment)}</dd></div>
        <div><dt>Reference</dt><dd>#{agreement.id}</dd></div>
      </dl>
    </article>
  );
}
