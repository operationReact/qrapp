/**
 * Control Center 3D Icon Component
 * 
 * Renders optimized 3D icon assets with graceful fallback to Lucide SVG icons.
 * Supports WebP with PNG fallback for broad browser compatibility.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getControlCenterIcon } from "@/lib/controlCenterIcons";

export function ControlCenterIcon({ theme, className = "" }) {
  const [useFallback, setUseFallback] = useState(false);
  const iconConfig = getControlCenterIcon(theme);
  const FallbackIcon = iconConfig.fallback;

  // Check if browser supports WebP
  const supportsWebP = (() => {
    if (typeof document === "undefined") return false;
    const testWebP = document.createElement("canvas");
    testWebP.width = testWebP.height = 1;
    try {
      return testWebP.toDataURL("image/webp").indexOf("image/webp") === 5;
    } catch {
      return false;
    }
  })();

  const imageUrl = supportsWebP ? iconConfig.webp : iconConfig.png;

  // Render 3D image if available and not using fallback
  if (!useFallback) {
    return (
      <img
        src={imageUrl}
        alt={iconConfig.alt}
        width={36}
        height={36}
        loading="lazy"
        decoding="async"
        className={cn(
          "shrink-0",
          "object-contain",
          className
        )}
        onError={() => setUseFallback(true)}
      />
    );
  }

  // Fallback to Lucide SVG icon
  return (
    <FallbackIcon
      className={cn("shrink-0 size-[18px]", className)}
      strokeWidth={1.9}
      aria-hidden="true"
    />
  );
}
