import PropTypes from "prop-types";
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

const getCategoryEmoji = (cat) => {
  const name = cat.toLowerCase();
  if (name === "all") return "🍴";
  return Object.entries(CATEGORY_EMOJIS).find(([key]) => name.includes(key))?.[1] || "🍽️";
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
              <span aria-hidden="true">{getCategoryEmoji(cat)}</span>
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
