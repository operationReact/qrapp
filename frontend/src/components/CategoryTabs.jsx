import PropTypes from "prop-types";
import { buttonVariants } from "./ui/button";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";
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
    <Carousel opts={{ dragFree: true }}>
      <CarouselContent className={"-ml-1.5"}>
        {allCategories.map((cat) => (
          <CarouselItem className="basis-auto pl-1.5" key={cat}>
            <a
              href={`/#${cat}`}
              className={buttonVariants({
                size: "sm",
                variant: active === cat ? "default" : "secondary",
                className: cn(`min-w-12`, {
                  "bg-primary": active === cat,
                }),
              })}
            >
              {cat !== "All" && getCategoryIcon(cat)}
              <span>{cat}</span>
            </a>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

CategoryTabs.propTypes = {
  categories: PropTypes.array.isRequired,
  active: PropTypes.string,
  onChange: PropTypes.func,
};
