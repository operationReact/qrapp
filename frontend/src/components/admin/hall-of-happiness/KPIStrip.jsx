import React from "react";

export function KPIStrip({ stats }) {
  const kpis = [
    { label: "Pending", value: stats.pending || 0, color: "warning" },
    { label: "Approved", value: stats.approved || 0, color: "success" },
    { label: "Live", value: stats.published || 0, color: "info" },
    { label: "Rejected", value: stats.rejected || 0, color: "error" },
  ];

  const colorMap = {
    warning: "bg-[var(--cc-warning-bg)] text-[var(--cc-warning)]",
    success: "bg-[var(--cc-success-bg)] text-[var(--cc-success)]",
    info: "bg-[var(--cc-info-bg)] text-[var(--cc-info)]",
    error: "bg-[var(--cc-error-bg)] text-[var(--cc-error)]",
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 md:gap-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`flex-shrink-0 rounded-lg px-3 py-2 text-center ${colorMap[kpi.color]}`}
        >
          <p className="text-xs font-semibold opacity-75">{kpi.label}</p>
          <p className="text-lg font-bold">{kpi.value}</p>
        </div>
      ))}
    </div>
  );
}
