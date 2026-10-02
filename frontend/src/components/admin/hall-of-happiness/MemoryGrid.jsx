import React from "react";
import { MemoryCard } from "./MemoryCard";
import { Skeleton } from "@/components/ui/skeleton";

export function MemoryGrid({ submissions, isLoading, onSelectSubmission }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <div className="col-span-full rounded-2xl border border-dashed border-[var(--cc-border)] p-8 md:p-12 text-center">
        <div className="text-4xl mb-3">📸</div>
        <p className="font-semibold text-[var(--cc-text)] mb-1">No memories yet</p>
        <p className="text-sm text-[var(--cc-secondary-text)]">
          Memories will appear here as customers and admins share their Bro & Bro moments.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {submissions.map((submission) => (
        <MemoryCard
          key={submission.key}
          submission={submission}
          onClick={() => onSelectSubmission(submission)}
        />
      ))}
    </div>
  );
}
