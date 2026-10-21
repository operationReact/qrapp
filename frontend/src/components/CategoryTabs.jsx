import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import {
  FALLBACK_ICON_SRC,
  getCategoryDisplayName,
  resolveCategoryIcon,
} from "@/lib/categoryIconResolver";
import "../styles/category-tabs.css";

const AUTO_SCROLL_PX_PER_SEC = 36;
const RESUME_DELAY_MS = 2500;
const STEP_RATIO = 0.6;

function CategoryTile({ resolved, failed, onError }) {
  const usePhoto = resolved.isPhoto && !failed;
  return (
    <img
      src={usePhoto ? resolved.src : failed ? resolved.fallbackSrc || FALLBACK_ICON_SRC : resolved.src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={onError}
      className={usePhoto ? "category-tile__img" : "category-tile__icon"}
    />
  );
}

function CategoryTileImage({ resolved }) {
  const [failed, setFailed] = useState(false);
  return (
    <CategoryTile
      resolved={resolved}
      failed={failed}
      onError={() => setFailed(true)}
    />
  );
}

// Auto-scrolls to the end, rests, then returns to the start. Manual scrolling is native and stops at both ends.
function useStripMotion(wrapperRef, scrollerRef, enabled, controlRef) {
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const el = scrollerRef.current;
    if (!enabled || !wrapper || !el) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const maxScroll = () => Math.max(0, el.scrollWidth - el.clientWidth);
    let pos = el.scrollLeft;
    let written = pos;
    let atEnd = false;
    let hovering = false;
    let resumeAt = 0;
    let last = performance.now();
    let frame = 0;

    const pauseFor = () => {
      resumeAt = performance.now() + RESUME_DELAY_MS;
    };
    const tick = (now) => {
      const dt = Math.min(now - last, 64);
      last = now;
      if (Math.abs(el.scrollLeft - written) >= 1) {
        // The user moved the strip themselves.
        pos = el.scrollLeft;
        atEnd = false;
        pauseFor();
      }
      if (atEnd) {
        if (now >= resumeAt) {
          atEnd = false;
          pos = 0;
          el.scrollLeft = pos;
        }
      } else if (!reduceMotion && !hovering && now >= resumeAt && maxScroll() > 0) {
        pos = Math.min(pos + (AUTO_SCROLL_PX_PER_SEC * dt) / 1000, maxScroll());
        el.scrollLeft = pos;
        if (pos >= maxScroll()) {
          atEnd = true;
          resumeAt = now + RESUME_DELAY_MS;
        }
      }
      written = el.scrollLeft;
      frame = requestAnimationFrame(tick);
    };

    const enter = () => { hovering = true; };
    const leave = () => { hovering = false; pauseFor(); };
    const interact = () => pauseFor();
    wrapper.addEventListener("pointerenter", enter);
    wrapper.addEventListener("pointerleave", leave);
    wrapper.addEventListener("focusin", enter);
    wrapper.addEventListener("focusout", leave);
    wrapper.addEventListener("pointerdown", interact, { passive: true });
    wrapper.addEventListener("wheel", interact, { passive: true });
    wrapper.addEventListener("touchstart", interact, { passive: true });

    controlRef.current = {
      step(direction) {
        pauseFor();
        el.scrollBy({ left: el.clientWidth * STEP_RATIO * direction, behavior: "smooth" });
      },
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      wrapper.removeEventListener("pointerenter", enter);
      wrapper.removeEventListener("pointerleave", leave);
      wrapper.removeEventListener("focusin", enter);
      wrapper.removeEventListener("focusout", leave);
      wrapper.removeEventListener("pointerdown", interact);
      wrapper.removeEventListener("wheel", interact);
      wrapper.removeEventListener("touchstart", interact);
      controlRef.current = null;
    };
  }, [wrapperRef, scrollerRef, controlRef, enabled]);
}

const getCategoryName = (category) => getCategoryDisplayName(category) || "All";

export default function CategoryTabs({ categories, active }) {
  const wrapperRef = useRef(null);
  const scrollerRef = useRef(null);
  const controlRef = useRef(null);
  const allCategories = [
    { id: "all", name: "All" },
    ...categories.filter((category) => getCategoryName(category).toLowerCase() !== "all"),
  ];
  const [allTile, ...rollingCategories] = allCategories;
  const loops = rollingCategories.length > 0;

  useStripMotion(wrapperRef, scrollerRef, loops, controlRef);

  const renderTile = (category, isCopy) => {
    const catName = getCategoryName(category);
    const isActive = active === catName;
    const isAllActive = isActive && catName.toLowerCase() === "all";
    const resolved = resolveCategoryIcon(category);
    const isPhoto = resolved.isPhoto;
    return (
      <Link
        to="/"
        hash={encodeURIComponent(catName)}
        tabIndex={isCopy ? -1 : undefined}
        key={category.id || catName}
        className={buttonVariants({
          size: "sm",
          variant: "ghost",
          className: cn(
            "category-strip__item group h-auto w-[74px] min-w-[74px] flex-col gap-0.5 rounded-2xl px-0 py-0 text-[13px] font-semibold leading-4 shadow-none touch-manipulation hover:bg-transparent md:h-auto md:w-auto md:min-w-fit md:flex-col md:gap-1 md:rounded-2xl md:px-0 md:py-0 md:text-xs lg:gap-1.5 lg:rounded-2xl",
            isActive ? "text-primary" : "text-foreground",
          ),
        })}
      >
        <span className={cn(
          "category-tile",
          isPhoto ? "category-tile--photo" : "category-tile--icon",
          isActive && "is-active",
          isAllActive && "is-all",
        )}>
          <CategoryTileImage resolved={resolved} />
        </span>
        <span className="h-7 max-w-[72px] overflow-hidden text-center text-[12px] leading-[14px] whitespace-normal md:max-w-[80px] lg:max-w-[90px] md:text-[12px] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {catName}
        </span>
      </Link>
    );
  };

  return (
    <div ref={wrapperRef} className="category-strip">
      {renderTile(allTile, false)}
      {loops && (
        <button type="button" className="category-strip__nav" aria-label="Scroll categories left" onClick={() => controlRef.current?.step(-1)}>
          <ChevronLeft size={16} />
        </button>
      )}
      <div ref={scrollerRef} className="category-marquee">
        <div className="category-marquee__track">
          <div className="category-marquee__group">
            {rollingCategories.map((category) => renderTile(category, false))}
          </div>
        </div>
      </div>
      {loops && (
        <button type="button" className="category-strip__nav" aria-label="Scroll categories right" onClick={() => controlRef.current?.step(1)}>
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

CategoryTabs.propTypes = {
  categories: PropTypes.array.isRequired,
  active: PropTypes.string,
  onChange: PropTypes.func,
};