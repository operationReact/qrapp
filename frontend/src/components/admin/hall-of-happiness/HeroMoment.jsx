import React from "react";

export function HeroMoment({ submission }) {
  if (!submission) return null;

  const firstPhoto = submission.photos[0];
  const imageUrl = firstPhoto?.imageUrl;

  if (!imageUrl) return null;

  return (
    <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden group cursor-pointer">
      {/* Background Image */}
      <img
        src={imageUrl}
        alt={submission.eventLabel || "Featured Memory"}
        className="h-full w-full object-cover transition group-hover:scale-105"
      />

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Content Overlay - Bottom */}
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <p className="text-xs font-semibold opacity-75 mb-2">FEATURED</p>
        <h2 className="text-2xl font-bold mb-2">
          {submission.eventLabel || submission.customerName || "Featured Memory"}
        </h2>
        <p className="text-sm opacity-90">
          {submission.photos.length} {submission.photos.length === 1 ? "photo" : "photos"}
          {submission.orderId && ` · Order #${submission.orderId}`}
        </p>
      </div>

      {/* Optional: Click to View */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/50">
        <p className="text-white text-sm font-semibold">View Full Memory</p>
      </div>
    </div>
  );
}
