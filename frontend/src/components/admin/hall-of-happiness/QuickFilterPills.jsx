import React from "react";

export function QuickFilterPills({ activeStatus, onStatusChange }) {
  const statuses = [
    { value: "", label: "All" },
    { value: "PENDING_REVIEW", label: "Pending" },
    { value: "APPROVED", label: "Approved" },
    { value: "PUBLISHED", label: "Published" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {statuses.map((status) => (
        <button
          key={status.value}
          onClick={() => onStatusChange(activeStatus === status.value ? "" : status.value)}
          className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition ${
            activeStatus === status.value
              ? "bg-[var(--cc-primary)] text-white"
              : "bg-[var(--cc-page)] text-[var(--cc-text)] border border-[var(--cc-border)] hover:bg-[var(--cc-border)]"
          }`}
        >
          {status.label}
        </button>
      ))}
    </div>
  );
}
