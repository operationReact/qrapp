import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { usePartner } from "@/context/PartnerContext";
import { getPartnerAnalyticsOverview } from "@/services/partner-portal-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PartnerComparisonIndicator,
  PartnerLocationPerformance,
  PartnerOrderStatusChart,
  PartnerPeakHours,
  PartnerSalesKpiGrid,
  PartnerSalesTrendChart,
  PartnerTopItems,
  PartnerVendorPerformance,
} from "@/components/partner/PartnerAnalyticsComponents";

export const Route = createFileRoute("/partner/performance")({ component: PartnerPerformance });

function businessToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
const presets = [
  ["today", "Today", 0],
  ["yesterday", "Yesterday", -1],
  ["last7", "Last 7 days", -6],
  ["last30", "Last 30 days", -29],
];

function PartnerFilterDropdown({ icon, value, options, onChange, label }) {
  const Icon = icon;
  const selectedOption = options.find(([optionValue]) => optionValue === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="partner-analytics-filter" aria-label={label}>
          <Icon className="size-4 shrink-0" />
          <span>{selectedOption?.[1] || label}</span>
          <ChevronDown className="size-3 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1rem))]">
        {options.map(([optionValue, optionLabel]) => (
          <DropdownMenuItem
            key={optionValue}
            onClick={() => onChange(optionValue)}
            className="min-w-0"
          >
            <span className="min-w-0 truncate">{optionLabel}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PartnerPerformance() {
  const { selectedLocationId, locations } = usePartner();
  const today = businessToday();
  const [preset, setPreset] = useState("last7");
  const [custom, setCustom] = useState({ startDate: shiftDate(today, -6), endDate: today });
  const [location, setLocation] = useState(selectedLocationId || "");
  const range = useMemo(() => {
    const selected = presets.find(([key]) => key === preset);
    if (!selected) return custom;
    const end = preset === "yesterday" ? shiftDate(today, -1) : today;
    return { startDate: shiftDate(end, selected[2]), endDate: end };
  }, [custom, preset, today]);
  const query = useQuery({
    queryKey: ["partner-analytics", location || null, range.startDate, range.endDate],
    queryFn: () => getPartnerAnalyticsOverview({ locationId: location || undefined, ...range }),
    retry: false,
  });
  const selectPreset = (value) => {
    setPreset(value);
    if (value === "custom") setCustom(range);
  };
  return <section className="partner-analytics-page">
    <div className="partner-analytics-heading"><div><p className="partner-eyebrow">Performance</p><h1>Sales & business analytics</h1><p>Understand how your accessible locations are performing.</p></div><div className="partner-analytics-filters"><PartnerFilterDropdown icon={MapPin} label="Location" value={location} options={[["", "All accessible locations"], ...locations.map((item) => [String(item.locationId), item.locationName])]} onChange={setLocation} /><PartnerFilterDropdown icon={CalendarDays} label="Date range" value={preset} options={[...presets, ["custom", "Custom range"]]} onChange={selectPreset} />{preset === "custom" && <div className="partner-custom-dates"><input type="date" value={custom.startDate} max={custom.endDate} onChange={(event) => setCustom({ ...custom, startDate: event.target.value })} /><span>to</span><input type="date" value={custom.endDate} min={custom.startDate} max={today} onChange={(event) => setCustom({ ...custom, endDate: event.target.value })} /></div>}</div></div>
    {query.isLoading ? <div className="partner-analytics-loading-grid"><div /><div /><div /><div /></div> : query.isError ? <div className="partner-inline-error">Analytics are temporarily unavailable. Please retry.</div> : <><PartnerSalesKpiGrid summary={query.data?.summary} /><div className="partner-analytics-comparison"><PartnerComparisonIndicator label="sales vs previous period" value={query.data?.comparison?.salesChangePercent} /><PartnerComparisonIndicator label="orders vs previous period" value={query.data?.comparison?.ordersChangePercent} /><PartnerComparisonIndicator label="AOV vs previous period" value={query.data?.comparison?.aovChangePercent} /></div><div className="partner-analytics-main-grid"><PartnerSalesTrendChart trend={query.data?.trend} /><PartnerOrderStatusChart statuses={query.data?.orderStatus} /></div><div className="partner-analytics-main-grid"><PartnerLocationPerformance locations={query.data?.locations} /><PartnerPeakHours hourlyDistribution={query.data?.hourlyDistribution} /></div><div className="partner-analytics-main-grid"><PartnerTopItems items={query.data?.topItems} /><PartnerVendorPerformance vendors={query.data?.vendors} /></div></>}
  </section>;
}
