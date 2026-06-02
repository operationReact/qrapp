import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";

export default function CategoriesScroll({
  categories = [],
  value = "ALL",
  onChange,
  counts = {},
}) {
  const items = [
    { key: "ALL", label: "All", count: counts.ALL },
    ...categories.map((c) => ({
      key: c,
      label: c,
      count: counts[c],
    })),
  ];

  return (
    <Carousel opts={{ dragFree: true }} className="grid">
      <CarouselContent className="-ml-2">
        {items.map((item) => {
          const isActive = value === item.key;
          return (
            <CarouselItem key={item.key} className="basis-auto pl-2">
              <Button
                type="button"
                onClick={() => onChange(item.key)}
                variant={isActive ? "branded-secondary" : "secondary"}
              >
                <span>{item.label}</span>
                {typeof item.count === "number" && (
                  <Badge
                    className={cn(
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary-foreground/5 text-muted-foreground",
                    )}
                  >
                    {item.count}
                  </Badge>
                )}
              </Button>
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
}
