/**
 * Control Center Thumbnail Component
 * 
 * Renders premium 3D miniature illustration thumbnails.
 * Supports SVG, PNG, WebP with graceful error handling.
 */

import { getThumbnailAsset } from "@/lib/controlCenterThumbnails";

export function ControlCenterThumbnail({ theme, className = "" }) {
  const asset = getThumbnailAsset(theme);

  return (
    <img
      src={asset.src}
      alt={asset.alt}
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      className={`object-contain ${className}`}
      onError={(e) => {
        // Fallback on error: show a neutral placeholder
        e.target.style.background = "linear-gradient(135deg, #f0f0f2 0%, #e8e8ea 100%)";
        e.target.style.borderRadius = "12px";
      }}
    />
  );
}
