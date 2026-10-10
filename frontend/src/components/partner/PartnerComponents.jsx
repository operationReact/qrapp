import { BarChart3, Lightbulb } from "lucide-react";

export function PartnerBrand({ name, logo, code, status, compact = false }) {
  return (
    <div className={`partner-brand ${compact ? "is-compact" : ""}`}>
      {logo && <img src={logo} alt={`${name} logo`} />}
      <div>
        <strong>{name}</strong>
        {!compact && <span>{code} · Partner Portal</span>}
        {status && <em><i />{status}</em>}
      </div>
    </div>
  );
}

export function PartnerChartCard({ title, description, children }) {
  return <section className="partner-chart-card"><div className="partner-chart-card-head"><BarChart3 className="size-4" /><div><h2>{title}</h2><p>{description}</p></div></div>{children || <p className="partner-chart-placeholder">Analytics will appear here once performance data is available.</p>}</section>;
}

export function PartnerInsightCard({ title, description }) {
  return <article className="partner-insight-card"><Lightbulb className="size-4" /><div><h3>{title}</h3><p>{description}</p></div></article>;
}
