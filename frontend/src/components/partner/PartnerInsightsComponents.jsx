import { BarChart3, CalendarDays, ChevronDown, CircleAlert, MapPin, MessageSquareOff } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function InsightFilter({ icon, value, options, onChange, label }) {
  const Icon = icon;
  const selected = options.find(([key]) => key === value);
  return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="partner-analytics-filter" aria-label={label}><Icon className="size-4 shrink-0" /><span>{selected?.[1] || label}</span><ChevronDown className="size-3 shrink-0" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1rem))]">{options.map(([key, text]) => <DropdownMenuItem key={key} onClick={() => onChange(key)}><span className="min-w-0 truncate">{text}</span></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}

export function InsightFilters({ locations, location, setLocation, preset, setPreset, custom, setCustom, today, presets, range }) {
  const selectPreset = (value) => { setPreset(value); if (value === "custom") setCustom(range); };
  return <div className="partner-analytics-filters"><InsightFilter icon={MapPin} label="Location" value={location} options={[["", "All accessible locations"], ...locations.map((item) => [String(item.locationId), item.locationName])]} onChange={setLocation} /><InsightFilter icon={CalendarDays} label="Date range" value={preset} options={[...presets, ["custom", "Custom range"]]} onChange={selectPreset} />{preset === "custom" && <div className="partner-custom-dates"><input type="date" value={custom.startDate} max={custom.endDate} onChange={(event) => setCustom({ ...custom, startDate: event.target.value })} /><span>to</span><input type="date" value={custom.endDate} min={custom.startDate} max={today} onChange={(event) => setCustom({ ...custom, endDate: event.target.value })} /></div>}</div>;
}

export function InsightKpiGrid({ summary }) {
  const metrics = [
    ["Active employees", summary?.activeEmployees, "Active customers with location access"],
    ["Ordering employees", summary?.orderingEmployees, `${summary?.orderingRate ?? 0}% ordering rate`],
    ["Ordering rate", `${summary?.orderingRate ?? 0}%`, "Employees with a completed order"],
    ["Repeat employees", summary?.repeatEmployees, `${summary?.repeatRate ?? 0}% of ordering employees`],
    ["Orders per active employee", summary?.ordersPerActiveEmployee, "Completed orders per active employee"],
    ["Average spend", money(summary?.averageSpendPerOrderingEmployee), "Per ordering employee"],
  ];
  return <div className="partner-analytics-kpi-grid">{metrics.map(([label, value, detail]) => <article className="partner-analytics-kpi" key={label}><p>{label}</p><strong>{value ?? "--"}</strong><span>{detail}</span></article>)}</div>;
}

export function InsightTrend({ trend }) {
  if (!trend?.length) return <InsightEmpty title="Engagement trend" description="Completed employee orders will appear here once available." />;
  const max = Math.max(...trend.map((point) => point.activeEmployees || 0), 1);
  return <section className="partner-analytics-wide-card"><div className="partner-analytics-card-head"><div><p className="partner-eyebrow">Engagement rhythm</p><h2>Daily active ordering employees</h2></div></div><div className="partner-insight-trend">{trend.map((point) => <div className="partner-insight-trend-day" key={point.date} title={`${point.date}: ${point.activeEmployees} active employees`}><div style={{ height: `${Math.max((point.activeEmployees / max) * 100, 4)}%` }} /><span>{point.date.slice(5)}</span></div>)}</div></section>;
}

export function InsightLocations({ locations }) {
  if (!locations?.length) return <InsightEmpty title="Location engagement" description="No accessible locations have completed employee orders for this period." />;
  return <section className="partner-analytics-wide-card"><div className="partner-analytics-card-head"><div><p className="partner-eyebrow">Locations</p><h2>Engagement by location</h2></div></div><div className="partner-location-performance-list">{locations.map((location) => <div className="partner-location-performance-row" key={location.locationId}><div><strong>{location.locationName}</strong><span>{location.locationCode}</span></div><b>{location.orderingEmployees} ordering</b><span>{location.orders} orders · {money(location.spend)}</span><span>{location.orderingRate}% rate · {location.repeatRate}% repeat</span><span>{money(location.averageSpend)} average spend</span></div>)}</div></section>;
}

export function InsightMenu({ menu }) {
  if (!menu?.items?.length && !menu?.categories?.length) return <InsightEmpty title="Menu behavior" description="Completed order items will appear here once employees start ordering." />;
  return <div className="partner-insights-menu-grid"><section className="partner-analytics-wide-card"><div className="partner-analytics-card-head"><div><p className="partner-eyebrow">Menu behavior</p><h2>Top ordered items</h2></div></div><div className="partner-ranking-list">{menu.items.map((item, index) => <div className="partner-ranking-row" key={item.itemId || item.itemName}><strong>{index + 1}</strong><div><b>{item.itemName}</b><span>{item.categoryName}</span></div><span>{item.units} units</span><b>{money(item.revenue)}</b></div>)}</div></section><section className="partner-analytics-wide-card"><div className="partner-analytics-card-head"><div><p className="partner-eyebrow">Categories</p><h2>Share of menu revenue</h2></div></div><div className="partner-ranking-list">{menu.categories.map((item) => <div className="partner-ranking-row" key={item.categoryId || item.categoryName}><div><b>{item.categoryName}</b><span>{item.units} units</span></div><span>{item.sharePercent}%</span><b>{money(item.revenue)}</b></div>)}</div></section></div>;
}

export function InsightEmpty({ title, description }) {
  return <section className="partner-analytics-chart-card partner-analytics-empty"><BarChart3 className="size-5" /><h2>{title}</h2><p>{description}</p></section>;
}

export function InsightLoading() { return <div className="partner-analytics-loading-grid"><div /><div /><div /><div /></div>; }
export function InsightError({ message = "Insights are temporarily unavailable. Please retry." }) { return <div className="partner-inline-error"><CircleAlert className="size-4" />{message}</div>; }

export function FeedbackUnavailable({ compact = false }) {
  return <section className={`partner-feedback-boundary ${compact ? "is-compact" : ""}`}><MessageSquareOff className="size-6" /><div><p className="partner-eyebrow">Feedback boundary</p><h2>Feedback and complaints are not available yet</h2><p>No feedback source exists in the current platform, so there is nothing to display or track. This view is ready for a future feedback integration.</p></div></section>;
}

export function money(value) {
  if (value == null) return "--";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value));
}
