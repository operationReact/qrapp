import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { HeartIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { hallOfHappinessOptions } from "@/query/options/hall-of-happiness";
import { useAuth } from "@/context/AuthContext";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

export const STATIC_HAPPINESS_PHOTOS = [
  {
    id: "static-hall-of-happiness-1",
    imageUrl: "/hall_of_happiness/HOHP1.jpeg",
    caption: "Client: NYEI onboarding celebration",
  },
  {
    id: "static-hall-of-happiness-2",
    imageUrl: "/hall_of_happiness/HOHP2.png",
    caption: "Client: NYEI onboarding celebration",
  },
  {
    id: "static-hall-of-happiness-3",
    imageUrl: "/hall_of_happiness/HOHP3.png",
    caption: "Client: NYEI onboarding celebration",
  },
  {
    id: "static-hall-of-happiness-4",
    imageUrl: "/hall_of_happiness/HOHP4.png",
    caption: "Client: NYEI onboarding celebration",
  }
];

function formatEventDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function HappinessCard({ photo }) {
  const [failed, setFailed] = useState(false);
  const title = photo.caption || photo.description || photo.eventType || "A Bro & Bro celebration";
  const eventDate = formatEventDate(photo.eventDateTime);

  return (
    <article className="group overflow-hidden rounded-[18px] border border-rose-100/80 bg-card shadow-[0_8px_24px_-16px_rgba(120,53,15,0.45)]">
      <div className="relative h-[230px] overflow-hidden bg-muted sm:h-[240px]">
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
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
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        {!failed && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pb-4 pt-14 text-white">
            <p className="text-sm font-semibold leading-snug drop-shadow-sm">{title}</p>
            {eventDate && <p className="mt-1 text-[11px] text-white/75">{eventDate}</p>}
          </div>
        )}
      </div>
    </article>
  );
}

export default function HallOfHappinessSection() {
  const { user } = useAuth();
  const autoplay = useMemo(
    () => Autoplay({ delay: 1700, stopOnInteraction: false }),
    [],
  );
  const query = useQuery(hallOfHappinessOptions({
    size: 8,
    enabled: Boolean(user?.token),
  }));
  const photos = [
    ...STATIC_HAPPINESS_PHOTOS,
    ...(query.data?.content || []),
  ];

  return (
    <section
      data-testid="hall-of-happiness-section"
      aria-labelledby="hall-of-happiness-heading"
      className="container-premium rounded-[24px] border border-rose-100/70 bg-gradient-to-br from-rose-50/75 via-amber-50/35 to-background px-3 py-4 md:px-5 md:py-5"
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-600">
            <HeartIcon size={13} weight="fill" />
            Memories we made together
          </p>
          <h2 id="hall-of-happiness-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
            ❤️ Bro &amp; Bro Hall of Happiness
          </h2>
        </div>
        <Link to="/hall-of-happiness" className="shrink-0 text-sm font-semibold text-primary hover:underline">
          View All
        </Link>
      </div>

      {query.isError && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <WarningCircleIcon size={20} weight="duotone" />
          Some happiness memories are temporarily unavailable.
        </div>
      )}
      {query.isLoading && (
        <div className="mb-3 flex gap-3 overflow-hidden">
          <Skeleton className="h-[230px] w-[300px] shrink-0 rounded-[18px] sm:h-[240px]" />
        </div>
      )}
      {photos.length ? (
        <Carousel
          opts={{ align: "start", loop: true }}
          plugins={[autoplay]}
          onMouseEnter={autoplay.stop}
          onMouseLeave={autoplay.reset}
        >
          <CarouselContent className="no-scrollbar -ml-3">
            {photos.map((photo, index) => (
              <CarouselItem
                key={photo.id}
                className={`${index === 0 ? "basis-[300px] sm:basis-[320px]" : "basis-[275px] sm:basis-[280px]"} pl-3`}
              >
                <HappinessCard photo={photo} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <HeartIcon size={30} weight="duotone" className="mx-auto mb-2 text-rose-400" />
          <p className="text-sm font-medium">❤️ Hall of Happiness</p>
          <p className="mt-1 text-xs text-muted-foreground">Memories from our Bro &amp; Bro celebrations will appear here.</p>
        </div>
      )}
    </section>
  );
}
