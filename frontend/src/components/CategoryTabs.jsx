import PropTypes from "prop-types";
import { Button } from "./ui/button";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";
import { Link } from "react-router-dom";

export default function CategoryTabs({ categories, active }) {
  console.log({ active, categories });
  return (
    <Carousel opts={{ dragFree: true }}>
      <CarouselContent className={"-ml-1.5"}>
        {categories.map((cat) => (
          <CarouselItem className="basis-auto pl-1.5" key={cat}>
            <Button
              variant={active === cat ? "black" : "outline"}
              className={`rounded-md text-sm! font-medium! ${!active && "bg-transparent"}`}
              asChild
            >
              <a href={`/#${cat}`}>{cat}</a>
            </Button>
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
