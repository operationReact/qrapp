import { AlertTriangle, BarChart3, ChevronDown, RefreshCw } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function PartnerSalesKpiGrid({ summary }) {
  const metrics = [
    ["Gross sales", formatCurrency(summary?.grossSales), "Completed order value"],
    ["Orders", summary?.orders ?? "--", "Completed orders"],
    ["Average order value", formatCurrency(summary?.averageOrderValue), "Eligible order revenue"],
    ["Active locations", summary?.activeLocations ?? "--", "Accessible locations"],
  ];
  return <div className="partner-analytics-kpi-grid">{metrics.map(([label, value, detail]) => <article className="partner-analytics-kpi" key={label}><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>)}</div>;
}

export function PartnerComparisonIndicator({ label, value }) {
  if (value == null) return <span className="partner-comparison is-neutral">{label} · No prior data</span>;
  return <span className={`partner-comparison ${value > 0 ? "is-positive" : value < 0 ? "is-negative" : "is-neutral"}`}>{value > 0 ? "+" : ""}{value}% {label}</span>;
}

export function PartnerSalesTrendChart({ trend, loading, error, onRetry }) {
  if (loading) return <AnalyticsSkeleton title="Sales trend" />;
  if (error) return <AnalyticsError title="Sales trend unavailable" onRetry={onRetry} />;
  if (!trend?.length) return <AnalyticsEmpty title="Sales trend" description="No sales data for this period." />;
  const data = trend.map((point) => ({ ...point, label: point.date.slice(5), sales: Number(point.sales || 0) }));
  return <section className="partner-analytics-chart-card"><div className="partner-analytics-card-head"><div><p className="partner-eyebrow">Sales trend</p><h2>Gross sales by day</h2></div><span className="partner-chart-legend"><i />Sales</span></div><div className="partner-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}><defs><linearGradient id="partnerSalesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b85b4f" stopOpacity={0.24} /><stop offset="100%" stopColor="#b85b4f" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#f0e9e4" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9a8981" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "#9a8981" }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} /><Tooltip formatter={(value) => [formatCurrency(value), "Sales"]} contentStyle={{ borderRadius: 10, borderColor: "#eaded7", fontSize: 12 }} /><Area type="monotone" dataKey="sales" stroke="#ad5146" strokeWidth={2.5} fill="url(#partnerSalesFill)" /></AreaChart></ResponsiveContainer></div></section>;
}

export function PartnerOrderStatusChart({ statuses }) {
  if (!statuses?.length) return <AnalyticsEmpty title="Order overview" description="No order status data for this period." />;
  return <section className="partner-analytics-chart-card"><div className="partner-analytics-card-head"><div><p className="partner-eyebrow">Operations</p><h2>Order overview</h2></div></div><div className="partner-status-list">{statuses.map((status) => <div className="partner-status-row" key={status.status}><div><span className="partner-status-dot" /><strong>{status.status.replaceAll("_", " ")}</strong></div><b>{status.orders}</b></div>)}</div></section>;
}

export function PartnerLocationPerformance({ locations }) {
  if (!locations?.length) return <AnalyticsEmpty title="Location performance" description="No location sales data for this period." />;
  return <section className="partner-analytics-wide-card"><div className="partner-analytics-card-head"><div><p className="partner-eyebrow">Locations</p><h2>Location performance</h2></div></div><div className="partner-location-performance-list">{locations.map((location) => <div className="partner-location-performance-row" key={location.locationId}><div><strong>{location.locationName}</strong><span>{location.locationCode} · {location.relationshipType} · {location.status}</span></div><b>{formatCurrency(location.sales)}</b><span>{location.orders} orders · {formatCurrency(location.averageOrderValue)} AOV</span><PartnerComparisonIndicator label="growth" value={location.growthPercent} /></div>)}</div></section>;
}

export function PartnerTopItems({ items }) {
  if (!items?.length) return <AnalyticsEmpty title="Top-selling items" description="No item sales data for this period." />;
  return <section className="partner-analytics-wide-card"><div className="partner-analytics-card-head"><div><p className="partner-eyebrow">Menu performance</p><h2>Top-selling items</h2></div></div><div className="partner-ranking-list">{items.map((item) => <div className="partner-ranking-row" key={`${item.rank}-${item.item}`}><strong>{item.rank}</strong><div><b>{item.item}</b><span>{item.vendor}</span></div><span>{item.unitsSold} units</span><b>{formatCurrency(item.revenue)}</b></div>)}</div></section>;
}

export function PartnerVendorPerformance({ vendors }) {
  if (!vendors?.length) return <AnalyticsEmpty title="Vendor performance" description="No vendor performance data for this period." />;
  return <section className="partner-analytics-wide-card"><div className="partner-analytics-card-head"><div><p className="partner-eyebrow">Supply performance</p><h2>Vendors</h2></div></div><div className="partner-vendor-list">{vendors.map((vendor) => <div className="partner-vendor-row" key={`${vendor.vendorId}-${vendor.vendor}`}><b>{vendor.vendor}</b><span>{vendor.orders} orders</span><strong>{formatCurrency(vendor.sales)}</strong><span>{formatCurrency(vendor.averageOrderValue)} AOV</span></div>)}</div></section>;
}

export function PartnerPeakHours({ hourlyDistribution }) {
  if (!hourlyDistribution?.length) return <AnalyticsEmpty title="Peak ordering period" description="Hourly insights will appear once enough order data is available." />;
  return <section className="partner-analytics-chart-card"><div className="partner-analytics-card-head"><div><p className="partner-eyebrow">Ordering rhythm</p><h2>Peak ordering period</h2></div></div><div className="partner-chart partner-chart-short"><ResponsiveContainer width="100%" height="100%"><BarChart data={hourlyDistribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="#f0e9e4" vertical={false} /><XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9a8981" }} tickFormatter={(hour) => `${hour}:00`} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip formatter={(value) => [value, "Orders"]} /><Bar dataKey="orders" fill="#d18a68" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>;
}

export function AnalyticsSkeleton({ title }) {
  return <section className="partner-analytics-chart-card"><p className="partner-eyebrow">{title}</p><div className="partner-analytics-skeleton" /></section>;
}
export function AnalyticsEmpty({ title, description }) {
  return <section className="partner-analytics-chart-card partner-analytics-empty"><BarChart3 className="size-5" /><h2>{title}</h2><p>{description}</p></section>;
}
export function AnalyticsError({ title, onRetry }) {
  return <section className="partner-analytics-chart-card partner-analytics-empty"><AlertTriangle className="size-5" /><h2>{title}</h2><p>Try again without affecting the rest of the dashboard.</p><button type="button" onClick={onRetry}><RefreshCw className="size-3" />Retry</button></section>;
}
export function formatCurrency(value) {
  if (value == null) return "--";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value));
}
