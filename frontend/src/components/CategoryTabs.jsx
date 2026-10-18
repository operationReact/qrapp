import PropTypes from "prop-types";
import { useState } from "react";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import "../styles/category-tabs.css";
import {
  FALLBACK_ICON_SRC,
  getCategoryDisplayName,
  resolveCategoryIcon,
} from "@/lib/categoryIconResolver";

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

const getCategoryName = (category) => getCategoryDisplayName(category) || "All";

export default function CategoryTabs({ categories, active }) {
  const allCategories = [
    { id: "all", name: "All" },
    ...categories.filter((category) => getCategoryName(category).toLowerCase() !== "all"),
  ];

  return (
    <div className="category-marquee">
      <div className="category-marquee__track">
        {[false, true].map((isCopy) => (
        <div key={isCopy ? "copy" : "main"} className="category-marquee__group" aria-hidden={isCopy || undefined}>
        {allCategories.map((category) => {
          const catName = getCategoryName(category);
          const isActive = active === catName;
          const isAllActive = isActive && catName.toLowerCase() === "all";
          const resolved = resolveCategoryIcon(category);
          const isPhoto = resolved.isPhoto;
          return (
          <a
            href={`/#${catName}`}
            tabIndex={isCopy ? -1 : undefined}
            key={category.id || catName}
            className={buttonVariants({
              size: "sm",
              variant: "ghost",
              className: cn(
                 "group h-auto w-[74px] min-w-[74px] flex-col gap-0.5 rounded-2xl px-0 py-0 text-[13px] font-semibold leading-4 shadow-none touch-manipulation hover:bg-transparent md:h-auto md:w-auto md:min-w-fit md:flex-col md:gap-1 md:rounded-2xl md:px-0 md:py-0 md:text-xs lg:gap-1.5 lg:rounded-2xl",
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
          </a>
          );
        })}
        </div>
        ))}
      </div>
    </div>
  );
}

CategoryTabs.propTypes = {
  categories: PropTypes.array.isRequired,
  active: PropTypes.string,
  onChange: PropTypes.func,
};
