import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { usePartner } from "@/context/PartnerContext";
import { partnerInsightsEngagementOptions, partnerInsightsMenuOptions, partnerInsightsOverviewOptions } from "@/query/options/partner-insights";
import { InsightError, InsightFilters, InsightKpiGrid, InsightLoading, InsightLocations, InsightMenu, InsightTrend } from "@/components/partner/PartnerInsightsComponents";

export const Route = createFileRoute("/partner/insights")({ component: PartnerInsights });
function businessToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()); }
function shiftDate(date, days) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }
function monthStart(date, offset = 0) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + offset);
  return value.toISOString().slice(0, 10);
}
function monthEnd(date, offset = 0) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + offset + 1);
  value.setUTCDate(0);
  return value.toISOString().slice(0, 10);
}
const presets = [["today", "Today", 0], ["yesterday", "Yesterday", -1], ["last7", "Last 7 days", -6], ["last30", "Last 30 days", -29], ["thisMonth", "This month"], ["lastMonth", "Last month"]];
function PartnerInsights() {
  const { selectedLocationId, locations } = usePartner();
  const today = businessToday();
  const [preset, setPreset] = useState("last7");
  const [custom, setCustom] = useState({ startDate: shiftDate(today, -6), endDate: today });
  const [location, setLocation] = useState(selectedLocationId || "");
  const range = useMemo(() => {
    if (preset === "thisMonth") return { startDate: monthStart(today), endDate: today };
    if (preset === "lastMonth") return { startDate: monthStart(today, -1), endDate: monthEnd(today, -1) };
    const selected = presets.find(([key]) => key === preset);
    if (!selected) return custom;
    const end = preset === "yesterday" ? shiftDate(today, -1) : today;
    return { startDate: shiftDate(end, selected[2]), endDate: end };
  }, [custom, preset, today]);
  const params = { locationId: location || undefined, ...range };
  const overview = useQuery(partnerInsightsOverviewOptions(params));
  const engagement = useQuery(partnerInsightsEngagementOptions(params));
  const menu = useQuery(partnerInsightsMenuOptions(params));
  return <section className="partner-analytics-page"><div className="partner-analytics-heading"><div><p className="partner-eyebrow">Employee insights</p><h1>Engagement, made visible</h1><p>Understand how employees use your accessible workplace locations and menu.</p></div><InsightFilters locations={locations} location={location} setLocation={setLocation} preset={preset} setPreset={setPreset} custom={custom} setCustom={setCustom} today={today} presets={presets} range={range} /></div>{overview.isLoading || engagement.isLoading || menu.isLoading ? <InsightLoading /> : overview.isError || engagement.isError || menu.isError ? <InsightError /> : <><InsightKpiGrid summary={overview.data?.summary} /><div className="partner-analytics-comparison"><span className="partner-comparison is-neutral">{overview.data?.summary?.completedOrders ?? 0} completed orders</span><span className="partner-comparison is-neutral">{overview.data?.summary?.averageFrequency ?? 0} orders per ordering employee</span></div><InsightTrend trend={engagement.data?.trend} /><InsightLocations locations={overview.data?.locations} /><InsightMenu menu={menu.data} /></>}</section>;
}
