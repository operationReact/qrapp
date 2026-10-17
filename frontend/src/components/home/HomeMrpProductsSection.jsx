import { useEffect, useMemo, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { baseURL } from "@/services";
import { getCategories, getProductCategoryImages } from "@/services/category-service";
import { getCatalogProducts } from "@/services/mrp-product-service";
import { getCategoryVideoSrc } from "@/lib/categoryVideos";
import "@/styles/home-mrp-products.css";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from "@/components/ui/carousel";

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

export default function HomeMrpProductsSection({ locationId }) {
  const { data: products = [] } = useQuery({
    queryKey: ["home-mrp-products", locationId],
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
  const { data: productCategoryImages = [] } = useQuery({
    queryKey: ["home-product-category-images", locationId],
    queryFn: () => getProductCategoryImages(locationId),
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
    productCategoryImages
      .filter((category) => category.name && category.imageUrl)
      .forEach((category) => categoryImages.set(category.name.trim().toLowerCase(), resolveImageUrl(category.imageUrl)));
    const categoryVideos = new Map(
      productCategoryImages
        .filter((category) => category.name && category.videoKey)
        .map((category) => [category.name.trim().toLowerCase(), getCategoryVideoSrc(category.videoKey)]),
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
    return Array.from(grouped.values()).map((category) => ({
      ...category,
      image: categoryImages.get(category.key) || category.image,
      video: categoryVideos.get(category.key) || null,
    }));
  }, [backendCategories, productCategoryImages, products]);

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
    <section className="container-premium py-1 md:py-3 lg:py-4" aria-labelledby="home-mrp-products-heading">
      <div className="relative overflow-hidden rounded-[20px] border border-[#f4cfc3] bg-[radial-gradient(circle_at_90%_0%,rgba(255,224,211,0.8),transparent_34%),linear-gradient(120deg,#fffaf6_0%,#ffebe2_100%)] px-2.5 py-2 shadow-[0_14px_36px_rgba(143,70,42,0.08)] sm:rounded-[28px] sm:px-6 sm:py-6 lg:rounded-[32px] lg:px-8 lg:py-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 size-52 rounded-full border-[18px] border-white/35" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-[-72px] left-[28%] size-40 rounded-full bg-[#ffd7c8]/35 blur-2xl" />
        <div className="relative flex min-h-[86px] items-center justify-between gap-2 sm:min-h-[168px] lg:min-h-[190px]">
          <div className="relative z-10 max-w-[620px] lg:max-w-[390px]">
            <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] sm:text-xs" style={{ color: "#d91d34" }}>
              EVERYDAY FAVOURITES
            </p>
            <h2 id="home-mrp-products-heading" className="mt-1 font-sans text-2xl font-extrabold leading-tight tracking-[-0.035em] sm:mt-2 sm:text-4xl lg:text-[46px]" style={{ color: "#30201c" }}>
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
          </Link>
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          plugins={autoplay ? [autoplay] : undefined}
          className="relative mt-2 sm:mt-6 lg:mt-4"
        >
          <CarouselContent className="-ml-3 touch-pan-x cursor-grab py-1 pr-1 active:cursor-grabbing">
            {categories.map((category, index) => (
              <CarouselItem
                key={category.key}
                className="basis-[58%] pl-3 min-[390px]:basis-[48%] sm:basis-[34%] md:basis-1/4 lg:basis-1/5"
              >
                <Link
                  to="/essentials"
                  hash={category.routeKey || category.key}
                  className="group hmp-tile w-full focus-visible:outline-none"
                  style={{ "--hmp-delay": `${Math.min(index, 8) * 80}ms` }}
                  aria-label={`Shop ${category.label}, ${category.count} ${category.count === 1 ? "product" : "products"}`}
                >
                  <div className="hmp-stage">
                    {category.video ? (
                      <span className="hmp-float hmp-float--video">
                        <video
                          src={category.video}
                          className="hmp-video"
                          width="116"
                          height="116"
                          muted
                          autoPlay
                          loop
                          playsInline
                          preload="metadata"
                          aria-hidden="true"
                        />
                      </span>
                    ) : category.image ? (
                      <span className="hmp-float">
                        <img
                          src={category.image}
                          alt=""
                          loading="lazy"
                          width="320"
                          height="220"
                          className="hmp-img"
                        />
                      </span>
                    ) : (
                      <span className="hmp-float">
                        <span className="hmp-initial" aria-hidden="true">{category.label.charAt(0).toUpperCase()}</span>
                      </span>
                    )}
                  </div>
                  <div className="hmp-body">
                    <div className="min-w-0">
                      <span className="hmp-chip">
                        {category.count > 0 ? `${category.count} ${category.count === 1 ? "item" : "items"}` : "New"}
                      </span>
                      <h3 className="mt-1 line-clamp-2 font-sans text-xs font-extrabold leading-4 text-[#17212b] sm:mt-2 sm:text-[15px] sm:leading-5 lg:text-base">
                        {category.label}
                      </h3>
                    </div>
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
