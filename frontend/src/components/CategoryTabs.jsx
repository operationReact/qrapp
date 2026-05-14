import PropTypes from "prop-types";
import { Button, buttonVariants } from "./ui/button";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";

export default function CategoryTabs({ categories, active }) {
  return (
    <Carousel opts={{ dragFree: true }}>
      <CarouselContent className={"-ml-1.5"}>
        {categories.map((cat) => (
          <CarouselItem className="basis-auto pl-1.5" key={cat}>
            <a
              href={`/#${cat}`}
              className={buttonVariants({
                size: "sm",
                variant: active === cat ? "black" : "outline",
                className:"border-border!"
              })}
            >
              {cat}
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
  onChange: PropTypes.func.isRequired,
};
