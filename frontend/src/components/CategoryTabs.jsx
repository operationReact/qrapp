import PropTypes from "prop-types";
import { useState } from "react";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import {
  FALLBACK_ICON_SRC,
  getCategoryDisplayName,
  resolveCategoryIcon,
} from "@/lib/categoryIconResolver";

function CategoryImage({ category }) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveCategoryIcon(category);
  return (
    <img
      src={failed ? resolved.fallbackSrc || FALLBACK_ICON_SRC : resolved.src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="size-[30px]"
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
    <div className="no-scrollbar overflow-x-auto">
      <div className="flex min-w-max items-start gap-0.5 pb-0 [touch-action:pan-x]">
        {allCategories.map((category) => {
          const catName = getCategoryName(category);
          return (
          <a
            href={`/#${catName}`}
            key={category.id || catName}
            className={buttonVariants({
              size: "sm",
              variant: "ghost",
              className: cn(
                "group h-auto w-[74px] min-w-[74px] flex-col gap-0.5 rounded-2xl px-0 py-0 text-[13px] font-semibold leading-4 shadow-none touch-manipulation hover:bg-transparent md:h-9 md:w-auto md:min-w-fit md:flex-row md:gap-1.5 md:rounded-full md:px-3.5 md:py-2 md:text-xs",
                active === catName ? "text-primary" : "text-foreground",
              ),
            })}
          >
            <span className={cn(
              "grid h-[50px] w-[50px] place-items-center rounded-[16px] bg-[#f4f7fb] text-[29px] shadow-[0_4px_10px_rgba(41,47,67,0.05)] transition-colors md:hidden",
              active === catName && "bg-primary text-primary-foreground shadow-[0_7px_16px_rgba(241,32,70,0.22)]",
            )}>
              <CategoryImage category={category} />
            </span>
            <span className="h-7 max-w-[72px] overflow-hidden text-center text-[12px] leading-[14px] whitespace-normal [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {catName}
            </span>
          </a>
          );
        })}
      </div>
    </div>
  );
}

CategoryTabs.propTypes = {
  categories: PropTypes.array.isRequired,
  active: PropTypes.string,
  onChange: PropTypes.func,
};
