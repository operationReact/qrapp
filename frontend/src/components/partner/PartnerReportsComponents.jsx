import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChartColumn,
  CircleAlert,
  Download,
  FileText,
  Loader2,
  MapPin,
  MessageSquareOff,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InsightFilter } from "@/components/partner/PartnerInsightsComponents";
import {
  businessToday,
  downloadBlob,
  executiveFilename,
  findTotal,
  formatRangeLabel,
  formatTotal,
  REPORT_META,
  REPORT_PRESETS,
  reportErrorMessage,
  reportFilename,
  reportParams,
  resolveRange,
  responseFilename,
} from "@/lib/partnerReports";
import { partnerReportSummaryOptions } from "@/query/options/partner-reports";
import { getPartnerAnalyticsOverview, downloadPartnerExecutivePdf, downloadPartnerReportCsv } from "@/services/partner-portal-service";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const REPORT_ICONS = { sales: ChartColumn, locations: MapPin, menu: Store, engagement: Users, finance: Wallet, feedback: MessageSquareOff };
const PREVIEW_METRICS = 4;

export function ReportFilters({ locations, location, setLocation, preset, setPreset, custom, setCustom, today, range, error }) {
  const selectPreset = (value) => {
    setPreset(value);
    if (value === "custom") setCustom(range);
  };
  return (
    <div className="partner-rpt-filters">
      <div className="partner-analytics-filters">
        <InsightFilter icon={MapPin} label="Location" value={location} options={[["", "All accessible locations"], ...locations.map((item) => [String(item.locationId), item.locationName])]} onChange={setLocation} />
        <InsightFilter icon={CalendarDays} label="Date range" value={preset} options={REPORT_PRESETS} onChange={selectPreset} />
        {preset === "custom" && (
          <div className="partner-custom-dates">
            <input type="date" aria-label="Start date" value={custom.startDate} max={custom.endDate || today} onChange={(event) => setCustom({ ...custom, startDate: event.target.value })} />
            <span>to</span>
            <input type="date" aria-label="End date" value={custom.endDate} min={custom.startDate} max={today} onChange={(event) => setCustom({ ...custom, endDate: event.target.value })} />
          </div>
        )}
      </div>
      {error
        ? <p className="partner-rpt-range-error" role="alert"><CircleAlert className="size-4 shrink-0" />{error}</p>
        : <p className="partner-rpt-range-note">{formatRangeLabel(range)} · Asia/Kolkata</p>}
    </div>
  );
}

/** Shared download state so only one export runs at a time. */
export function useReportExports(filters) {
  const [busy, setBusy] = useState(null);
  const run = async (key, request, fallbackName, mimeType) => {
    if (busy) return;
    setBusy(key);
    try {
      const response = await request();
      downloadBlob(response.data, responseFilename(response, fallbackName), mimeType);
      toast.success("Download started");
    } catch (error) {
      toast.error(reportErrorMessage(error, "The export could not be downloaded. Please try again."));
    } finally {
      setBusy(null);
    }
  };
  const exportCsv = (type) => {
    const params = reportParams(filters, type);
    return run(`csv:${type}`, () => downloadPartnerReportCsv(type, params), reportFilename(type, params, "csv"), "text/csv");
  };
  const exportPdf = () => {
    const params = reportParams(filters);
    return run("pdf", () => downloadPartnerExecutivePdf(params), executiveFilename(params), "application/pdf");
  };
  return { busy, exportCsv, exportPdf };
}

export function ExecutivePdfButton({ exports, disabled }) {
  const pending = exports.busy === "pdf";
  return (
    <Button type="button" onClick={exports.exportPdf} disabled={disabled || Boolean(exports.busy)} aria-busy={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}Executive PDF
    </Button>
  );
}

export function ReportCard({ descriptor, query, disabled, exports }) {
  const type = descriptor.type;
  const meta = REPORT_META[type] || {};
  const Icon = REPORT_ICONS[type] || BarChart3;
  const summary = query?.data;
  const unavailable = !descriptor.available || summary?.available === false;
  const title = meta.title || descriptor.title;
  const csvBusy = exports.busy === `csv:${type}`;
  return (
    <article className={`partner-rpt-card ${unavailable ? "is-unavailable" : ""}`} aria-busy={query?.isLoading || undefined}>
      <header className="partner-rpt-card-head">
        <span className="partner-rpt-icon"><Icon className="size-[18px]" /></span>
        <div><h2>{title}</h2><p>{descriptor.description}</p></div>
      </header>
      <div className="partner-rpt-card-body">
        {unavailable ? (
          <p className="partner-rpt-unavailable"><MessageSquareOff className="size-4 shrink-0" />{descriptor.unavailableReason || summary?.message || "This report is not available yet."}</p>
        ) : disabled ? (
          <p className="partner-rpt-muted">Choose a valid date range to preview this report.</p>
        ) : query?.isLoading ? (
          <div className="partner-rpt-skeleton"><div /><div /><div /><div /></div>
        ) : query?.isError ? (
          <div className="partner-rpt-error" role="alert">
            <p><CircleAlert className="size-4 shrink-0" />{reportErrorMessage(query.error)}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>Retry</Button>
          </div>
        ) : summary ? (
          <>
            <dl className="partner-rpt-metrics">
              {summary.totals.slice(0, PREVIEW_METRICS).map((total) => <div key={total.key}><dt>{total.label}</dt><dd>{formatTotal(total)}</dd></div>)}
            </dl>
            {summary.totals.length > PREVIEW_METRICS && <p className="partner-rpt-muted">+{summary.totals.length - PREVIEW_METRICS} more in the export</p>}
            {summary.message && <p className="partner-rpt-note">{summary.message}</p>}
            {summary.tables?.length > 0 && <p className="partner-rpt-muted">Export includes {summary.tables.map((table) => `${table.title} (${table.rowCount})`).join(", ")}</p>}
          </>
        ) : null}
      </div>
      {!unavailable && (
        <footer className="partner-rpt-card-actions">
          <Button type="button" variant="outline" size="sm" onClick={() => exports.exportCsv(type)} disabled={disabled || !summary?.csvExportable || Boolean(exports.busy)} aria-busy={csvBusy}>
            {csvBusy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}Export CSV
          </Button>
          {meta.detail && <Link to={meta.detail.to} className="partner-rpt-link">{meta.detail.label}<ArrowUpRight className="size-3.5" /></Link>}
        </footer>
      )}
    </article>
  );
}

const overviewLinks = [
  { to: "/partner/reports", label: "Reports", detail: "Summaries, CSV and executive PDF", icon: FileText },
  { to: "/partner/performance", label: "Performance", detail: "Sales, locations and vendors", icon: BarChart3 },
  { to: "/partner/insights", label: "Employee insights", detail: "Engagement and menu behavior", icon: Users },
  { to: "/partner/finance", label: "Finance", detail: "Settlements and statements", icon: Wallet },
];

/** Compact executive snapshot for the dashboard; full analytics stay on the linked pages. */
export function ExecutiveOverview() {
  const today = businessToday();
  const range = resolveRange("last7", today);
  const query = useQuery(partnerReportSummaryOptions("sales", reportParams(range, "sales")));
  const analytics = useQuery({
    queryKey: ["partner-dashboard-pulse", range.startDate, range.endDate],
    queryFn: () => getPartnerAnalyticsOverview(range),
  });
  const metrics = [["gross_sales", "Gross sales"], ["orders", "Orders"], ["average_order_value", "Avg. order value"], ["sales_change_percent", "Vs previous period"]];
  const trend = (analytics.data?.trend || []).map((point) => ({
    ...point,
    label: point.date?.slice(5) || "",
    sales: Number(point.sales || 0),
    orders: Number(point.orders || 0),
  }));
  const peak = (analytics.data?.hourlyDistribution || []).reduce(
    (best, point) => Number(point.orders || 0) > Number(best?.orders || 0) ? point : best,
    null,
  );
  return (
    <section className="partner-section-card partner-exec-overview">
      <div className="partner-section-header">
        <div><p className="partner-eyebrow">Executive overview</p><h2>Last 7 days</h2></div>
        <Link to="/partner/reports" className="partner-section-action">Reports<ArrowUpRight className="size-3" /></Link>
      </div>
      {query.isLoading ? (
        <div className="partner-rpt-skeleton"><div /><div /><div /><div /></div>
      ) : query.isError || !query.data ? (
        <p className="partner-rpt-muted">Sales figures are temporarily unavailable. Open Reports to try again.</p>
      ) : (
        <>
          <dl className="partner-rpt-metrics">
            {metrics.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{formatTotal(findTotal(query.data, key))}</dd></div>)}
          </dl>
          <p className="partner-rpt-muted">{formatRangeLabel(range)} · All accessible locations</p>
        </>
      )}
      <div className="partner-exec-visuals">
        <section className="partner-exec-chart-card">
          <div className="partner-analytics-card-head">
            <div><p className="partner-eyebrow">Sales pulse</p><h3>Daily gross sales</h3></div>
            <span className="partner-chart-legend"><i />Sales</span>
          </div>
          <div className="partner-exec-chart">
            {analytics.isLoading ? <div className="partner-exec-chart-loading" /> : trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="partnerDashboardSalesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b85b4f" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#b85b4f" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f0e9e4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9a8981" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => [formatCurrency(value), "Sales"]} contentStyle={{ borderRadius: 10, borderColor: "#eaded7", fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" stroke="#ad5146" strokeWidth={2.5} fill="url(#partnerDashboardSalesFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="partner-exec-chart-empty">Sales activity will appear here.</p>}
          </div>
        </section>
        <section className="partner-exec-chart-card">
          <div className="partner-analytics-card-head">
            <div><p className="partner-eyebrow">Order rhythm</p><h3>Orders by day</h3></div>
            {peak && <span className="partner-exec-peak">Peak {peak.hour}:00</span>}
          </div>
          <div className="partner-exec-chart">
            {analytics.isLoading ? <div className="partner-exec-chart-loading" /> : trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#f0e9e4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9a8981" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => [value, "Orders"]} contentStyle={{ borderRadius: 10, borderColor: "#eaded7", fontSize: 11 }} />
                  <Bar dataKey="orders" fill="#d18a68" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="partner-exec-chart-empty">Order activity will appear here.</p>}
          </div>
        </section>
      </div>
      <div className="partner-exec-links">
        {overviewLinks.map(({ to, label, detail, icon }) => {
          const Icon = icon;
          return <Link key={to} to={to} className="partner-exec-link"><Icon className="size-4 shrink-0" /><span><strong>{label}</strong><em>{detail}</em></span><ArrowUpRight className="size-3.5 shrink-0" /></Link>;
        })}
      </div>
    </section>
  );
}
