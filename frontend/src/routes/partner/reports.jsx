import { createFileRoute } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePartner } from "@/context/PartnerContext";
import { InsightLoading } from "@/components/partner/PartnerInsightsComponents";
import { ExecutivePdfButton, ReportCard, ReportFilters, useReportExports } from "@/components/partner/PartnerReportsComponents";
import { businessToday, REPORT_MAX_RANGE_DAYS, reportErrorMessage, reportParams, resolveRange, validateRange } from "@/lib/partnerReports";
import { partnerReportCatalogOptions, partnerReportSummaryOptions } from "@/query/options/partner-reports";

export const Route = createFileRoute("/partner/reports")({ component: PartnerReports });

function PartnerReports() {
  const { selectedLocationId, locations } = usePartner();
  const today = businessToday();
  const [preset, setPreset] = useState("last7");
  const [custom, setCustom] = useState(() => resolveRange("last7", today));
  const [location, setLocation] = useState(selectedLocationId ? String(selectedLocationId) : "");
  const range = useMemo(() => resolveRange(preset, today, custom), [preset, today, custom]);
  const catalog = useQuery(partnerReportCatalogOptions());
  const rangeError = validateRange(range, today, catalog.data?.maxRangeDays || REPORT_MAX_RANGE_DAYS);
  const filters = { locationId: location, ...range };
  const descriptors = useMemo(() => catalog.data?.reports || [], [catalog.data?.reports]);
  const summaries = useQueries({
    queries: descriptors.map((descriptor) => partnerReportSummaryOptions(
      descriptor.type,
      reportParams(filters, descriptor.type),
      { enabled: descriptor.available && !rangeError },
    )),
  });
  const exports = useReportExports(filters);

  return (
    <section className="partner-analytics-page partner-rpt-page">
      <div className="partner-analytics-heading">
        <div><p className="partner-eyebrow">Reports</p><h1>Reports center</h1><p>Preview, export and share business reports for your accessible locations.</p></div>
        <div className="partner-rpt-heading-actions"><ExecutivePdfButton exports={exports} disabled={Boolean(rangeError) || catalog.isLoading || catalog.isError} /></div>
      </div>
      <ReportFilters locations={locations} location={location} setLocation={setLocation} preset={preset} setPreset={setPreset} custom={custom} setCustom={setCustom} today={today} range={range} error={rangeError} />
      {catalog.isLoading ? <InsightLoading /> : catalog.isError ? (
        <div className="partner-inline-error partner-rpt-error" role="alert">
          <p><CircleAlert className="size-4 shrink-0" />{reportErrorMessage(catalog.error, "Reports are temporarily unavailable. Please retry.")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => catalog.refetch()}>Retry</Button>
        </div>
      ) : (
        <div className="partner-rpt-grid">
          {descriptors.map((descriptor, index) => <ReportCard key={descriptor.type} descriptor={descriptor} query={summaries[index]} disabled={Boolean(rangeError)} exports={exports} />)}
        </div>
      )}
    </section>
  );
}
