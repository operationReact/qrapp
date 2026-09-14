import PropTypes from "prop-types";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import {
  BowlFoodIcon,
  CakeIcon,
  CloudSunIcon,
  CoffeeIcon,
  HamburgerIcon,
} from "@phosphor-icons/react";

const CATEGORY_ICONS = {
  "breakfast specials": <CloudSunIcon />,
  "lunch meals": <BowlFoodIcon />,
  sandwiches: <HamburgerIcon />,
  beverage: <CoffeeIcon />,
  dessert: <CakeIcon />,
};

const getCategoryIcon = (cat) => {
  const name = cat.toLowerCase();
  return CATEGORY_ICONS[name] || null;
};

export default function CategoryTabs({ categories, active }) {
  // Always include "All" at the beginning
  const allCategories = ["All", ...categories.filter((c) => c !== "All")];

  return (
    <div className="no-scrollbar overflow-x-auto">
      <div className="flex min-w-max items-center gap-2 pb-1">
        {allCategories.map((cat) => (
          <a
            href={`/#${cat}`}
            key={cat}
            className={buttonVariants({
              size: "sm",
              variant: active === cat ? "default" : "secondary",
              className: cn(
                "h-9 min-w-fit rounded-lg px-3 text-[13px] font-semibold shadow-sm md:h-9 md:rounded-full md:px-3.5 md:text-xs",
                {
                  "bg-primary": active === cat,
                },
              ),
            })}
          >
            {cat !== "All" && (
              <span className="hidden md:inline-flex">{getCategoryIcon(cat)}</span>
            )}
            <span>{cat}</span>
          </a>
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
