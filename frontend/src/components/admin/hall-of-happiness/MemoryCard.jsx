import React, { useState } from "react";
import { SparkleIcon, CameraIcon } from "@phosphor-icons/react";

export function MemoryCard({ submission, onClick }) {
  const [imageFailed, setImageFailed] = useState(false);
  const firstPhoto = submission.photos[0];
  const curated = submission.sourceType === "ADMIN_CURATED";

  const statusColor = {
    PENDING_REVIEW: "bg-[var(--cc-warning-bg)] text-[var(--cc-warning)]",
    APPROVED: "bg-[var(--cc-success-bg)] text-[var(--cc-success)]",
    PUBLISHED: "bg-[var(--cc-info-bg)] text-[var(--cc-info)]",
    REJECTED: "bg-[var(--cc-error-bg)] text-[var(--cc-error)]",
    PENDING: "bg-[var(--cc-warning-bg)] text-[var(--cc-warning)]",
  };

  const status = submission.photos[0]?.status || "UNKNOWN";
  const imageUrl = firstPhoto?.thumbnailUrl || firstPhoto?.imageUrl;

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-[var(--cc-page)] transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--cc-primary)] focus:ring-offset-2 text-left w-full"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] bg-[var(--cc-page)] overflow-hidden">
        {imageFailed ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Image unavailable
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={submission.eventLabel || "Memory"}
            className="h-full w-full object-cover transition group-hover:scale-105"
            onError={() => setImageFailed(true)}
            loading="lazy"
          />
        )}

        {/* Source Badge - Top Left */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 text-white text-xs font-semibold backdrop-blur-sm">
          {curated ? (
            <>
              <SparkleIcon size={12} weight="fill" />
              ADMIN
            </>
          ) : (
            <>
              <CameraIcon size={12} weight="fill" />
              CUSTOMER
            </>
          )}
        </div>

        {/* Status Badge - Top Right */}
        <div
          className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${statusColor[status]}`}
        >
          {statusLabel(status)}
        </div>

        {/* Dark Gradient Overlay - Bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Title Overlay - Bottom */}
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <p className="text-sm font-semibold line-clamp-2">
            {submission.eventLabel || submission.customerName || "Memory"}
          </p>
          {!curated && submission.orderId && (
            <p className="text-xs opacity-75 mt-1">Order #{submission.orderId}</p>
          )}
        </div>

        {/* Photo Count Badge - Bottom Left */}
        {submission.photos.length > 1 && (
          <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 text-white text-xs font-semibold">
            +{submission.photos.length - 1} more
          </div>
        )}
      </div>
    </button>
  );
}

function statusLabel(value) {
  return {
    PENDING_REVIEW: "Pending",
    PENDING: "Pending",
    APPROVED: "Approved",
    PUBLISHED: "Live",
    REJECTED: "Rejected",
    WITHDRAWN: "Withdrawn",
    REMOVED: "Removed",
  }[value] || "Unknown";
}
