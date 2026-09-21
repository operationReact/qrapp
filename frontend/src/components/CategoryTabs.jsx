import PropTypes from "prop-types";
import { useState } from "react";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";

const CATEGORY_EMOJIS = {
  breakfast: "🍳",
  lunch: "🍱",
  sandwich: "🥪",
  snacks: "🍟",
  dinner: "🍲",
  beverage: "🥤",
  dessert: "🍰",
};

const CATEGORY_IMAGES = {
  all: "/category-icons/all.svg",
  breakfast: "/category-icons/breakfast.svg",
  lunch: "/category-icons/lunch.svg",
  sandwich: "/category-icons/sandwich.svg",
  snacks: "/category-icons/snacks.svg",
  dinner: "/category-icons/dinner.svg",
  beverage: "/category-icons/beverage.svg",
  dessert: "/category-icons/dessert.svg",
};

const getCategoryKey = (cat) => {
  const name = cat.toLowerCase();
  if (name === "all") return "all";
  return Object.keys(CATEGORY_IMAGES).find((key) => name.includes(key)) || "all";
};

const getCategoryEmoji = (cat) => CATEGORY_EMOJIS[getCategoryKey(cat)] || "🍽️";

function CategoryImage({ category }) {
  const [failed, setFailed] = useState(false);
  const src = CATEGORY_IMAGES[getCategoryKey(category)];

  if (failed) {
    return <span className="text-[23px]" aria-hidden="true">{getCategoryEmoji(category)}</span>;
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="size-8 object-contain"
    />
  );
};

const getCategoryLabel = (cat) => {
  const name = cat.toLowerCase();
  if (name === "all") return "All";
  if (name.includes("breakfast")) return "Breakfast";
  if (name.includes("lunch")) return "Lunch";
  if (name.includes("sandwich")) return "Sandwiches";
  if (name.includes("snack")) return "Snacks";
  if (name.includes("dinner")) return "Dinner";
  if (name.includes("beverage")) return "Beverages";
  if (name.includes("dessert")) return "Desserts";
  return cat;
};

export default function CategoryTabs({ categories, active }) {
  // Always include "All" at the beginning
  const allCategories = ["All", ...categories.filter((c) => c !== "All")];

  return (
    <div className="no-scrollbar overflow-x-auto">
      <div className="flex min-w-max items-start gap-2 pb-1">
        {allCategories.map((cat) => (
          <a
            href={`/#${cat}`}
            key={cat}
            className={buttonVariants({
              size: "sm",
              variant: "ghost",
              className: cn(
                "group h-auto min-w-[58px] flex-col gap-1.5 rounded-2xl px-0.5 py-1 text-[14px] font-semibold shadow-none hover:bg-transparent md:h-9 md:min-w-fit md:flex-row md:gap-1.5 md:rounded-full md:px-3.5 md:py-2 md:text-xs",
                active === cat ? "text-primary" : "text-foreground",
              ),
            })}
          >
            <span className={cn(
              "grid size-14 place-items-center rounded-[20px] bg-[#f4f7fb] text-[29px] shadow-[0_5px_14px_rgba(41,47,67,0.05)] transition-colors md:hidden",
              active === cat && "bg-primary text-white shadow-[0_7px_16px_rgba(241,32,70,0.22)]",
            )}>
              <CategoryImage category={cat} />
            </span>
            <span className="whitespace-nowrap">{getCategoryLabel(cat)}</span>
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
