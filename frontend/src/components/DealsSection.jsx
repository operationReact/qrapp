import { useRef, useState, useEffect } from "react";
import Autoplay from "embla-carousel-autoplay";
import { Button } from "./ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

function CarouselDots({ itemCount }) {
  const { api } = useCarousel();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(api.selectedScrollSnap());

    api.on("select", () => {
      setSelectedIndex(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="flex lg:hidden justify-center gap-1.5 mt-3">
      {Array.from({ length: itemCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            selectedIndex === i ? "w-4 bg-primary" : "w-1.5 bg-gray-300",
          )}
        />
      ))}
    </div>
  );
}

export default function DealsSection() {
  const plugin = useRef(Autoplay({ delay: 2000, stopOnInteraction: true }));

  const deals = [
    {
      id: 1,
      title: "Today's Chef Specials",
      subtitle: "Freshly prepared favorites, available only today.",
      cta: "View Specials",
      icon: "🔥",
      bgClass: "bg-orange-50/50 border-orange-100/50",
      blobClass: "bg-orange-100",
      btnClass: "border-orange-200 text-orange-600 hover:bg-orange-50",
      imgSrc:
        "https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=200&auto=format&fit=crop",
      imgClass: "border-2 border-white",
    },
    {
      id: 2,
      title: "Combo Deals",
      subtitle: "Bundle your favorite items and save up to 20%.",
      cta: "Explore Combos",
      icon: "🏷️",
      bgClass: "bg-purple-50/50 border-purple-100/50",
      blobClass: "bg-purple-100",
      btnClass: "border-purple-200 text-purple-600 hover:bg-purple-50",
      imgSrc:
        "https://images.unsplash.com/photo-1594212206063-4d6a4a4d6423?q=80&w=200&auto=format&fit=crop",
      imgClass: "mix-blend-multiply border-transparent shadow-none",
    },
    {
      id: 3,
      title: "Weekend Family Feast",
      subtitle: "Satisfy the whole family with our mega sharing platters.",
      cta: "Get Feast",
      icon: "👨‍👩‍👧‍👦",
      bgClass: "bg-emerald-50/50 border-emerald-100/50",
      blobClass: "bg-emerald-100",
      btnClass: "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
      imgSrc:
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=200&auto=format&fit=crop",
      imgClass: "border-2 border-white object-cover",
    },
    {
      id: 4,
      title: "Happy Hour Snacks",
      subtitle: "Half-price appetizers every day from 4 PM to 6 PM.",
      cta: "View Snacks",
      icon: "🥨",
      bgClass: "bg-blue-50/50 border-blue-100/50",
      blobClass: "bg-blue-100",
      btnClass: "border-blue-200 text-blue-600 hover:bg-blue-50",
      imgSrc:
        "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?q=80&w=200&auto=format&fit=crop",
      imgClass: "border-2 border-white object-cover",
    },
  ];

  return (
    <div className="mt-4">
      {/* eslint-disable react-hooks/refs */}
      <Carousel
        plugins={[plugin.current]}
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Deals For You</h2>
          <div className="flex items-center gap-2">
            <CarouselPrevious className="static translate-y-0 transform-none size-8 bg-zinc-50 hover:bg-gray-100 border-border rounded-md shadow-xs text-secondary-foreground" />
            <CarouselNext className="static translate-y-0 transform-none size-8 bg-zinc-50 hover:bg-gray-100 border-border rounded-md shadow-xs text-secondary-foreground" />
          </div>
        </div>

        <CarouselContent className="pr-16">
          {deals.map((deal) => (
            <CarouselItem key={deal.id} className="md:basis-1/2 lg:basis-1/3">
              <div
                className={cn(
                  "rounded-xl p-3 pr-22 pt-4 border relative overflow-clip min-h-32",
                  deal.bgClass,
                )}
              >
                <div className="grid gap-1.5 mb-1 text-wrap">
                  <h3 className="text-sm font-semibold leading-tight pr-2">
                    {deal.icon} {deal.title}
                  </h3>
                  <p className="text-xs text-pretty text-muted-foreground leading-tight mb-2">
                    {deal.subtitle}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-fit bg-white font-semibold",
                      deal.btnClass,
                    )}
                  >
                    {deal.cta}
                  </Button>
                </div>

                <div
                  className={cn(
                    "absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-xl opacity-60",
                    deal.blobClass,
                  )}
                />
                <img
                  src={deal.imgSrc}
                  alt={deal.title}
                  className={cn(
                    "absolute -right-2 text-xs text-muted-foreground overflow-clip top-1/2 -translate-y-1/2 w-20 h-20 object-cover rounded-full shadow-md z-10",
                    deal.imgClass,
                  )}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselDots itemCount={deals.length} />
      </Carousel>
    </div>
  );
}
