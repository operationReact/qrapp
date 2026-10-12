import { useEffect, useMemo, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  ArrowRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { baseURL } from "@/services";
import { getCategories } from "@/services/category-service";
import { getCatalogProducts } from "@/services/product-catalog-service";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from "@/components/ui/carousel";

const CATEGORY_SURFACES = ["#fff0bd", "#eee9ff", "#f9dfe7", "#dff6ec", "#ffecca", "#e2efff"];

function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${baseURL}${url}`;
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
  const { data: products = [] } = useQuery({
    queryKey: ["home-product-catalog", locationId],
    queryFn: () => getCatalogProducts(locationId),
    enabled: Boolean(locationId),
    staleTime: 1000 * 30,
  });
  const { data: backendCategories = [] } = useQuery({
    queryKey: ["home-product-categories", locationId],
    queryFn: () => getCategories(locationId),
    enabled: Boolean(locationId),
    staleTime: 1000 * 60,
  });
  const [reducedMotion, setReducedMotion] = useState(false);
  const categories = useMemo(() => {
    const categoryImages = new Map(
      backendCategories
        .filter((category) => category.name)
        .map((category) => [category.name.trim().toLowerCase(), resolveImageUrl(category.imageUrl)]),
    );
    const grouped = new Map();
    products.forEach((product) => {
      const name = product.categoryName?.trim();
      if (!name) return;
      const key = name.toLowerCase();
      const current = grouped.get(key) || { key, label: name, count: 0, image: null };
      current.count += 1;
      current.image = current.image || resolveImageUrl(product.imageUrl);
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).map((category, index) => ({
      ...category,
      image: categoryImages.get(category.key) || category.image,
      surface: CATEGORY_SURFACES[index % CATEGORY_SURFACES.length],
    }));
  }, [backendCategories, products]);

  useEffect(() => {
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(motionMedia.matches);
    };
    update();
    motionMedia.addEventListener?.("change", update);
    return () => {
      motionMedia.removeEventListener?.("change", update);
    };
  }, []);

  const autoplay = useMemo(
    () =>
      reducedMotion
        ? null
        : Autoplay({
            delay: 3600,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
            stopOnFocusIn: true,
          }),
    [reducedMotion],
  );

  return (
    <section className="container-premium py-1 md:py-3 lg:py-4" aria-labelledby="home-essentials-heading">
      <div className="relative overflow-hidden rounded-[20px] border border-[#f4cfc3] bg-[radial-gradient(circle_at_90%_0%,rgba(255,224,211,0.8),transparent_34%),linear-gradient(120deg,#fffaf6_0%,#ffebe2_100%)] px-2.5 py-2 shadow-[0_14px_36px_rgba(143,70,42,0.08)] sm:rounded-[28px] sm:px-6 sm:py-6 lg:rounded-[32px] lg:px-8 lg:py-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 size-52 rounded-full border-[18px] border-white/35" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-[-72px] left-[28%] size-40 rounded-full bg-[#ffd7c8]/35 blur-2xl" />
        <div className="relative flex min-h-[86px] items-center justify-between gap-2 sm:min-h-[168px] lg:min-h-[190px]">
          <div className="relative z-10 max-w-[620px] lg:max-w-[390px]">
            <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] sm:text-xs" style={{ color: "#d91d34" }}>
              EVERYDAY FAVOURITES
            </p>
            <h2 id="home-essentials-heading" className="mt-1 font-sans text-2xl font-extrabold leading-tight tracking-[-0.035em] sm:mt-2 sm:text-4xl lg:text-[46px]" style={{ color: "#30201c" }}>
              Snacks <span style={{ color: "#d92d45" }}>&amp; More</span>
            </h2>
            <p className="mt-1 max-w-[520px] font-sans text-[11px] font-medium leading-3.5 sm:mt-3 sm:text-base sm:leading-5 lg:text-lg" style={{ color: "#80645b" }}>
              Biscuits, chips, drinks, chocolates &amp; more
            </p>
          </div>

          <Link
            to="/essentials"
            className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 font-sans text-[11px] font-bold shadow-[0_8px_18px_rgba(239,35,60,0.2)] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef233c] focus-visible:ring-offset-2 sm:gap-2 sm:px-6 sm:py-3.5 sm:text-base"
            style={{ backgroundColor: "#ef233c", color: "#ffffff" }}
          >
            Shop Now
            <ArrowRightIcon weight="bold" className="size-4 sm:size-5" />
          </Link>
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          plugins={autoplay ? [autoplay] : undefined}
          className="relative mt-2 sm:mt-6 lg:mt-4"
        >
          <CarouselContent className="-ml-3 touch-pan-x cursor-grab py-1 pr-1 active:cursor-grabbing">
            {categories.map((category) => (
              <CarouselItem
                key={category.key}
                className="basis-[48%] pl-3 min-[390px]:basis-[43%] sm:basis-1/3 md:basis-1/4 lg:basis-1/6"
              >
                <Link
                  to="/essentials"
                  hash={category.routeKey || category.key}
                  className="group flex h-[132px] flex-col overflow-hidden rounded-[16px] border border-white/80 bg-white shadow-[0_6px_16px_rgba(122,47,27,0.07)] transition hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(122,47,27,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef233c] sm:h-[224px] lg:h-[246px]"
                >
                  <div
                    className="relative flex shrink-0 items-center justify-center overflow-hidden p-2"
                    style={{ height: "68px", flexBasis: "68px", background: category.surface }}
                  >
                    <span className="absolute left-3 top-3 size-1.5 rounded-full bg-white/80 shadow-[0_0_0_4px_rgba(255,255,255,0.2)]" aria-hidden="true" />
                    {category.image && (
                      <img
                        src={category.image}
                        alt={`${category.label} category`}
                        loading="lazy"
                        width="320"
                        height="220"
                        className="h-auto w-auto object-contain"
                        style={{ maxHeight: "50px", maxWidth: "70px" }}
                      />
                    )}
                  </div>
                  <div className="flex min-h-0 flex-1 items-end justify-between gap-1 p-1.5 sm:gap-2 sm:p-3.5">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 font-sans text-[10px] font-bold leading-3 text-[#17212b] sm:text-sm lg:text-[15px]">
                        {category.label}
                      </h3>
                      <p className="mt-0.5 font-sans text-[9px] font-medium text-[#7a838b] sm:mt-1 sm:text-xs">
                        {category.count > 0 ? `${category.count} ${category.count === 1 ? "product" : "products"}` : "Explore range"}
                      </p>
                    </div>
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#fff0ec] text-[#ef233c] transition group-hover:bg-[#ef233c] group-hover:text-white sm:size-8">
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
