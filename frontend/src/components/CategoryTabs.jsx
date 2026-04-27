import PropTypes from "prop-types";
import { Button } from "./ui/button";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";

export default function CategoryTabs({ categories, active, onChange }) {
  return (
    <Carousel>
      <CarouselContent className={"-ml-1.5"}>
        {categories.map((cat) => (
          <CarouselItem className="basis-auto pl-1.5" key={cat}>
            <Button
              variant={active === cat ? "black" : "outline"}
              className="rounded-md"
              onClick={() => onChange(cat)}
            >
              {cat}
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
