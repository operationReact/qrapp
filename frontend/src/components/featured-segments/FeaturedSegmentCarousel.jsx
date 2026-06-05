import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import MenuItemCard from "@/components/MenuItemCard";
import HeroProductCard from "./HeroProductCard";

/**
 * FeaturedSegmentCarousel
 *
 * Rendering strategy:
 *   hero=true + 1 item  → single full-width HeroProductCard (no empty space)
 *   hero=true + 2 items → two HeroProductCards stacked or side by side
 *   hero=true + 3+ items → first item is HeroProductCard, rest are standard in carousel
 *   hero=false → standard MenuItemCard carousel for all items
 */
export default function FeaturedSegmentCarousel({ items = [], emptyNode, hero = false, itemProps = {} }) {
  if (!items.length) {
    return emptyNode ?? null;
  }

  // Standard carousel (non-hero segments)
  if (!hero) {
    return (
      <Carousel opts={{ dragFree: true }}>
        <CarouselContent className="-ml-2 pr-3">
          {items.map((item) => (
            <CarouselItem key={item.id} className="pl-2 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6">
              <MenuItemCard item={item} {...itemProps} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    );
  }

  // Hero mode: 1 item
  if (items.length === 1) {
    return (
      <div className="px-0.5">
        <HeroProductCard item={items[0]} badge="🔥 Bestseller" />
      </div>
    );
  }

  // Hero mode: 2 items
  if (items.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <HeroProductCard key={item.id} item={item} badge="🔥 Pre-Order" />
        ))}
      </div>
    );
  }

  // Hero mode: 3+ items
  const [heroItem, ...rest] = items;
  return (
    <div className="flex flex-col gap-3">
      <HeroProductCard item={heroItem} badge="🔥 Bestseller" />
      <Carousel opts={{ dragFree: true }}>
        <CarouselContent className="-ml-2 pr-3">
          {rest.map((item) => (
            <CarouselItem key={item.id} className="pl-2 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6">
              <MenuItemCard item={item} {...itemProps} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
