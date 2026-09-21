import { useEffect, useRef, useState } from "react";

/**
 * Tracks scroll direction and returns whether scroll-reactive UI (bottom nav,
 * floating cart) should currently be visible.
 *
 * - Scrolling down past `topOffset` hides the UI.
 * - Scrolling up (or being near the top of the page) shows it again.
 * - Movements smaller than `threshold` px are ignored so tiny/jittery scrolls
 *   (e.g. rubber-banding on iOS/Android) don't cause flicker.
 */
export function useScrollVisibility({ threshold = 10, topOffset = 32 } = {}) {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(typeof window !== "undefined" ? window.scrollY : 0);
  const ticking = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(() => {
        const currentY = Math.max(0, window.scrollY);
        const delta = currentY - lastY.current;

        if (currentY <= topOffset) {
          setVisible(true);
          lastY.current = currentY;
        } else if (Math.abs(delta) > threshold) {
          setVisible(delta < 0);
          lastY.current = currentY;
        }

        ticking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold, topOffset]);

  return visible;
}
