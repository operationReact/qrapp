import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { usePartner } from "@/context/PartnerContext";
import { partnerInsightsFeedbackOptions } from "@/query/options/partner-insights";
import { FeedbackUnavailable, InsightError, InsightFilter, InsightLoading } from "@/components/partner/PartnerInsightsComponents";

export const Route = createFileRoute("/partner/feedback")({ component: PartnerFeedback });
function PartnerFeedback() {
  const { locations } = usePartner();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const [location, setLocation] = useState("");
  const params = { locationId: location || undefined, startDate: `${today.slice(0, 4)}-01-01`, endDate: today };
  const query = useQuery(partnerInsightsFeedbackOptions(params));
  return <section className="partner-analytics-page"><div className="partner-analytics-heading"><div><p className="partner-eyebrow">Feedback & complaints</p><h1>A clear boundary</h1><p>We show the truth about what this workspace can currently track.</p></div><div className="partner-analytics-filters"><InsightFilter icon={MapPin} label="Location" value={location} options={[["", "All accessible locations"], ...locations.map((item) => [String(item.locationId), item.locationName])]} onChange={setLocation} /></div></div>{query.isLoading ? <InsightLoading /> : query.isError ? <InsightError message="Feedback availability could not be checked. Please retry." /> : <FeedbackUnavailable />}</section>;
}
