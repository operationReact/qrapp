import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRightIcon, CameraIcon, ConfettiIcon, HeartIcon, SparkleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { hallOfHappinessOptions } from "@/query/options/hall-of-happiness";
import { useAuth } from "@/context/AuthContext";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { user } = useAuth();
  const { activeLocationId } = useActiveLocation();
  const autoplay = useMemo(
    () => Autoplay({ delay: 4200, stopOnInteraction: true, stopOnMouseEnter: true }),
    [],
  );
  const query = useQuery(hallOfHappinessOptions({
    size: 8,
    locationId: activeLocationId,
    enabled: Boolean(user?.token),
  }));
  const photos = query.data?.content || [];

  return (
    <section
      data-testid="hall-of-happiness-section"
      aria-labelledby="hall-of-happiness-heading"
      className="container-premium px-0"
    >
      <div className="mb-4 flex items-end justify-between gap-3 px-3 md:px-0">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-600">
            <HeartIcon size={13} weight="fill" />
            Memories we made together
          </p>
          <h2 id="hall-of-happiness-heading" className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            Bro &amp; Bro
            <br />
            <span className="bg-gradient-to-r from-rose-600 to-amber-500 bg-clip-text text-transparent">Hall of Happiness</span>
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">Real moments. Real people. Real celebrations.</p>
        </div>
        <Link
          to="/hall-of-happiness"
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          View All <ArrowRightIcon size={15} weight="bold" />
        </Link>
      </div>

      {query.isError && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 md:mx-0">
          <WarningCircleIcon size={20} weight="duotone" />
          Some happiness memories are temporarily unavailable.
        </div>
      )}
      {query.isLoading && (
        <div className="flex gap-3 overflow-hidden px-3 md:px-0">
          <Skeleton className="aspect-[4/5] w-[82%] shrink-0 rounded-[28px] sm:aspect-[16/11]" />
        </div>
      )}
      {!query.isLoading && photos.length > 0 && (
        <Carousel
          opts={{ align: "start", loop: photos.length > 1 }}
          plugins={photos.length > 1 ? [autoplay] : []}
        >
          <CarouselContent className="no-scrollbar -ml-3 px-3 md:px-0">
            {photos.map((photo, index) => (
              <CarouselItem
                key={photo.id}
                className="basis-[82%] pl-3 sm:basis-[62%] md:basis-[48%] lg:basis-[38%]"
              >
                <HappinessCard photo={photo} dominant={index === 0} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}
      {!query.isLoading && photos.length === 0 && (
        <div className="mx-3 rounded-[28px] border border-dashed border-border bg-muted/30 p-10 text-center md:mx-0">
          <ConfettiIcon size={32} weight="duotone" className="mx-auto mb-2 text-rose-400" />
          <p className="text-sm font-semibold">Hall of Happiness</p>
          <p className="mt-1 text-xs text-muted-foreground">Memories from our Bro &amp; Bro celebrations will appear here.</p>
        </div>
      )}
    </section>
  );
}
