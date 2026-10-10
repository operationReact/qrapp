import { useEffect, useMemo, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  ArrowRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { retailMenuOptions } from "@/query/options/menu";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from "@/components/ui/carousel";

const CATEGORIES = [
  {
    key: "chips",
    label: "Chips & Snacks",
    image: "/assets/essentials/products/lays.png.png",
    surface: "bg-[#fff0bd]",
    terms: ["chips", "snacks"],
  },
  {
    key: "biscuits",
    label: "Biscuits & Cookies",
    image: "/assets/essentials/products/oreo.png.png",
    surface: "bg-[#eee9ff]",
    terms: ["biscuit", "cookie"],
  },
  {
    key: "chocolates",
    label: "Chocolates",
    image: "/assets/essentials/products/kitkat.png.png",
    surface: "bg-[#f9dfe7]",
    terms: ["chocolate"],
  },
  {
    key: "beverages",
    routeKey: "drinks",
    label: "Beverages",
    image: "/assets/essentials/products/coca-cola.png.png",
    surface: "bg-[#dff6ec]",
    terms: ["drink", "beverage", "cola", "juice", "water"],
  },
  {
    key: "instant-foods",
    routeKey: "snacks",
    label: "Instant Foods",
    image: "/assets/essentials/hero/essentials-snacks-banner.png.png",
    surface: "bg-[#ffecca]",
    terms: ["instant", "noodle", "snack"],
  },
  {
    key: "daily-essentials",
    routeKey: "other",
    label: "Daily Essentials",
    image: "/assets/essentials/hero/essentials-basket.png",
    surface: "bg-[#e2efff]",
    terms: ["personal", "confectionery", "daily", "other"],
  },
];

function matchesCategory(product, category) {
  const text = [product?.name, product?.category?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return category.terms.some((term) => text.includes(term));
}

function CarouselStatus({ count }) {
  const { api, canScrollPrev, canScrollNext } = useCarousel();
  const [selected, setSelected] = useState(0);
  const pageCount = Math.min(count, 4);

  useEffect(() => {
    if (!api) return undefined;
    const update = () => setSelected(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  return (
    <>
      <CarouselPrevious
        aria-label="Previous Snacks & More categories"
        className="left-0 z-10 hidden size-10 -translate-x-1/2 rounded-full border-0 bg-white text-[#ef233c] shadow-[0_6px_18px_rgba(122,47,27,0.12)] hover:bg-white lg:flex"
      >
        <CaretLeftIcon weight="bold" className="size-5" />
      </CarouselPrevious>
      <CarouselNext
        aria-label="Next Snacks & More categories"
        className="right-0 z-10 hidden size-10 translate-x-1/2 rounded-full border-0 bg-white text-[#ef233c] shadow-[0_6px_18px_rgba(122,47,27,0.12)] hover:bg-white lg:flex"
      >
        <CaretRightIcon weight="bold" className="size-5" />
      </CarouselNext>
      {count > 1 && (
        <div className="mt-4 flex justify-center gap-1.5" aria-label="Category carousel position">
          {Array.from({ length: pageCount }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all ${selected % pageCount === index ? "w-10 bg-[#ef233c]" : "w-6 bg-[#f5cfc5]"}`}
            />
          ))}
        </div>
      )}
      <span className="sr-only">
        {canScrollPrev || canScrollNext ? "More categories available" : "All categories visible"}
      </span>
    </>
  );
}

export default function HomeEssentialsSection({ locationId }) {
  const { data: products = [] } = useQuery(retailMenuOptions(locationId));
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);
  const categories = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        ...category,
        count: products.filter((product) => matchesCategory(product, category)).length,
      })),
    [products],
  );

  useEffect(() => {
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const viewportMedia = window.matchMedia("(max-width: 1023px)");
    const update = () => {
      setReducedMotion(motionMedia.matches);
      setCompactViewport(viewportMedia.matches);
    };
    update();
    motionMedia.addEventListener?.("change", update);
    viewportMedia.addEventListener?.("change", update);
    return () => {
      motionMedia.removeEventListener?.("change", update);
      viewportMedia.removeEventListener?.("change", update);
    };
  }, []);

  const autoplay = useMemo(
    () =>
      reducedMotion || !compactViewport
        ? null
        : Autoplay({
            delay: 4200,
            stopOnInteraction: true,
            stopOnMouseEnter: true,
            stopOnFocusIn: true,
          }),
    [compactViewport, reducedMotion],
  );

  return (
    <section className="container-premium py-2 md:py-3 lg:py-4" aria-labelledby="home-essentials-heading">
      <div className="overflow-hidden rounded-[28px] border border-[#f4cfc3] bg-[linear-gradient(120deg,#fff8f3_0%,#ffebe2_100%)] px-4 py-5 shadow-[0_14px_36px_rgba(143,70,42,0.08)] sm:px-6 sm:py-6 lg:rounded-[32px] lg:px-8 lg:py-7">
        <div className="relative flex min-h-[168px] items-center justify-between gap-4 lg:min-h-[190px]">
          <div className="relative z-10 max-w-[620px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ef233c] sm:text-xs">
              Snacks &amp; More
            </p>
            <h2 id="home-essentials-heading" className="mt-2 text-[30px] font-black leading-[1.05] tracking-[-0.04em] text-[#17212b] sm:text-4xl lg:text-[46px]">
              Snacks <span className="text-[#ef233c]">&amp; More</span>
            </h2>
            <p className="mt-3 max-w-[520px] text-sm leading-5 text-[#59636d] sm:text-base lg:text-lg">
              Biscuits, chips, drinks, chocolates &amp; more
            </p>
          </div>

          <img
            src="/assets/essentials/hero/essentials-hero.png"
            alt=""
            aria-hidden="true"
            width="520"
            height="260"
            className="pointer-events-none absolute right-[16%] top-1/2 hidden h-[190px] w-[390px] -translate-y-1/2 object-contain opacity-95 lg:block xl:right-[18%] xl:h-[220px] xl:w-[470px]"
          />

          <Link
            to="/essentials"
            className="relative z-10 inline-flex shrink-0 items-center gap-2 rounded-full bg-[#ef233c] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(239,35,60,0.2)] transition hover:bg-[#d91d34] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef233c] focus-visible:ring-offset-2 sm:px-6 sm:py-3.5 sm:text-base"
          >
            Shop Now
            <ArrowRightIcon weight="bold" className="size-4 sm:size-5" />
          </Link>
        </div>

        <Carousel
          opts={{ align: "start", loop: compactViewport }}
          plugins={autoplay ? [autoplay] : undefined}
          className="relative mt-5 sm:mt-6 lg:mt-4"
        >
          <CarouselContent className="-ml-3 py-1 pr-1">
            {categories.map((category) => (
              <CarouselItem
                key={category.key}
                className="basis-[48%] pl-3 min-[390px]:basis-[43%] sm:basis-1/3 md:basis-1/4 lg:basis-1/6"
              >
                <Link
                  to="/essentials"
                  hash={category.routeKey || category.key}
                  className="group flex h-[208px] flex-col overflow-hidden rounded-[20px] border border-white/80 bg-white shadow-[0_6px_16px_rgba(122,47,27,0.07)] transition hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(122,47,27,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef233c] sm:h-[224px] lg:h-[246px]"
                >
                  <div
                    className={`flex shrink-0 items-center justify-center overflow-hidden p-2 ${category.surface}`}
                    style={{ height: "110px", flexBasis: "110px" }}
                  >
                    <img
                      src={category.image}
                      alt={`${category.label} category`}
                      loading="lazy"
                      width="320"
                      height="220"
                      className="h-auto w-auto object-contain"
                      style={{ maxHeight: "78px", maxWidth: "92px" }}
                      onError={(event) => {
                        event.currentTarget.src = "/assets/essentials/essentials-product-collage.png";
                      }}
                    />
                  </div>
                  <div className="flex min-h-0 flex-1 items-end justify-between gap-2 p-3 sm:p-3.5">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-[13px] font-extrabold leading-4 text-[#17212b] sm:text-sm lg:text-[15px]">
                        {category.label}
                      </h3>
                      <p className="mt-1 text-[11px] text-[#7a838b] sm:text-xs">
                        {category.count > 0 ? `${category.count} products` : "Explore range"}
                      </p>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fff0ec] text-[#ef233c] transition group-hover:bg-[#ef233c] group-hover:text-white">
                    <ArrowRightIcon weight="bold" className="size-4" />
                    </span>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselStatus count={categories.length} />
        </Carousel>
      </div>
    </section>
  );
}
