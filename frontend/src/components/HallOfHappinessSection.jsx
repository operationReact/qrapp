import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRightIcon, CameraIcon, ConfettiIcon, HeartIcon, SparkleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { hallOfHappinessConfigOptions, hallOfHappinessOptions } from "@/query/options/hall-of-happiness";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import CelebrationAmbientLayer from "@/components/home/CelebrationAmbientLayer";
import "@/styles/hall-of-happiness.css";

const SOURCE_BADGES = {
  CUSTOMER: { label: "Customer Memory", icon: CameraIcon },
  ADMIN_CURATED: { label: "Bro & Bro Curated", icon: SparkleIcon },
};

function formatEventDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SourceBadge({ sourceType }) {
  const badge = SOURCE_BADGES[sourceType];
  if (!badge) return null;
  const Icon = badge.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
      <Icon size={11} weight="fill" />
      {badge.label}
    </span>
  );
}

function HappinessCard({ photo, dominant }) {
  const [failed, setFailed] = useState(false);
  const title = photo.caption || photo.description || photo.eventLabel || photo.eventType || "A Bro & Bro celebration";
  const eventDate = formatEventDate(photo.eventDateTime);
  const context = photo.eventLabel || photo.eventType;

  return (
    <article className="group relative overflow-hidden rounded-[28px] bg-neutral-900 shadow-[0_18px_40px_-24px_rgba(120,53,15,0.55)]">
      <div className={`relative w-full overflow-hidden ${dominant ? "aspect-[4/5] sm:aspect-[16/11]" : "aspect-[4/5] sm:aspect-[16/11]"}`}>
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted p-4 text-center text-muted-foreground">
            <HeartIcon size={28} weight="duotone" className="text-rose-400" />
            <span className="text-xs">Memory temporarily unavailable</span>
          </div>
        ) : (
          <img
            src={photo.thumbnailUrl || photo.imageUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
          />
        )}
        {!failed && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            {photo.sourceType && (
              <div className="absolute left-4 top-4">
                <SourceBadge sourceType={photo.sourceType} />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-10 text-white">
              <p className="text-base font-semibold leading-snug drop-shadow-sm sm:text-lg">{title}</p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-white/75">
                {context && <span>{context}</span>}
                {context && eventDate && <span>·</span>}
                {eventDate && <span>{eventDate}</span>}
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export default function HallOfHappinessSection() {
  const { activeLocationId } = useActiveLocation();
  const configQuery = useQuery(hallOfHappinessConfigOptions(activeLocationId));
  const sectionRef = useRef(null);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const autoplay = useMemo(
    () => Autoplay({ delay: 4200, stopOnInteraction: true, stopOnMouseEnter: true }),
    [],
  );
  const query = useQuery(hallOfHappinessOptions({
    size: 8,
    locationId: activeLocationId,
    enabled: true,
  }));
  const photos = query.data?.content || [];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) setHasEnteredViewport(true);
      },
      { threshold: 0.12 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  if (!configQuery.isLoading && configQuery.data?.enabled === false) return null;

  return (
    <section
      ref={sectionRef}
      data-testid="hall-of-happiness-section"
      aria-labelledby="hall-of-happiness-heading"
      className="home-desktop-align mx-auto w-full min-w-0 max-w-[1280px] overflow-hidden px-[15px] sm:px-6 lg:overflow-visible lg:px-8"
    >
      <div className="relative isolate mb-2.5 flex min-h-11 min-w-0 items-center justify-between gap-2 sm:mb-4 sm:items-end sm:gap-3 sm:py-2">
        <div className="absolute -inset-x-[15px] -inset-y-1.5 sm:-inset-x-6 lg:-inset-x-8">
          <CelebrationAmbientLayer presetName="HALL_OF_HAPPINESS_CELEBRATION" active={isVisible} />
        </div>
        <div className="relative z-10 min-w-0 flex-1">
          <p className="mb-1 hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-600 sm:flex">
            <HeartIcon size={11} weight="fill" className="sm:h-[13px] sm:w-[13px]" />
            Memories we made together
          </p>
          <h2 id="hall-of-happiness-heading" className="flex min-w-0 items-baseline whitespace-nowrap text-[clamp(16px,4.7vw,18px)] font-bold leading-[1.1] tracking-tight sm:block sm:text-3xl sm:font-extrabold sm:leading-tight">
            <span className={`hall-brand-word text-[clamp(15px,4.4vw,17px)] sm:text-[1em] ${hasEnteredViewport ? "hall-header-title" : "hall-header-title hall-header-title-pending"}`}>Bro &amp; Bro</span>
            <span className={`mx-1 text-[clamp(15px,4.4vw,17px)] text-muted-foreground sm:hidden ${hasEnteredViewport ? "hall-header-separator" : "hall-header-separator hall-header-separator-pending"}`}>·</span>
            <span className={`bg-gradient-to-r from-rose-600 to-amber-500 bg-clip-text text-transparent sm:block ${hasEnteredViewport ? "hall-header-accent" : "hall-header-accent hall-header-accent-pending"}`}>Hall of Happiness</span>
          </h2>
          <p className="mt-1.5 hidden text-sm text-muted-foreground sm:block">Real moments. Real people. Real celebrations.</p>
        </div>
        <Link
          to="/hall-of-happiness"
          className={`relative z-10 inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap text-[12.5px] font-semibold text-primary hover:underline focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-0 sm:text-sm ${hasEnteredViewport ? "hall-header-view-all" : "hall-header-view-all hall-header-view-all-pending"}`}
        >
          View All <ArrowRightIcon size={13} weight="bold" className="sm:h-[15px] sm:w-[15px]" />
        </Link>
      </div>

      {query.isError && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 md:mx-0">
          <WarningCircleIcon size={20} weight="duotone" />
          Some happiness memories are temporarily unavailable.
        </div>
      )}
      {query.isLoading && (
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="aspect-[4/5] w-[82%] shrink-0 rounded-[28px] sm:aspect-[16/11]" />
        </div>
      )}
      {!query.isLoading && photos.length > 0 && (
        <Carousel
          opts={{ align: "start", loop: photos.length > 1 }}
          plugins={photos.length > 1 ? [autoplay] : []}
        >
          <CarouselContent className="no-scrollbar hall-carousel-content overflow-visible px-0">
            {photos.map((photo, index) => (
              <CarouselItem
                key={photo.id}
                className="basis-[86%] pl-3 sm:basis-[62%] md:basis-[48%] lg:basis-[38%]"
              >
                <HappinessCard photo={photo} dominant={index === 0} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}
      {!query.isLoading && photos.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-border bg-muted/30 p-6 text-center sm:p-10">
          <ConfettiIcon size={32} weight="duotone" className="mx-auto mb-2 text-rose-400" />
          <p className="text-sm font-semibold">Hall of Happiness</p>
          <p className="mt-1 text-xs text-muted-foreground">Memories from our Bro &amp; Bro celebrations will appear here.</p>
        </div>
      )}
    </section>
  );
}
