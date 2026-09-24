import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { HeartIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { hallOfHappinessOptions } from "@/query/options/hall-of-happiness";
import { useAuth } from "@/context/AuthContext";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

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
  const title = photo.caption || photo.eventType || "A happy celebration";

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
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
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        {photo.eventDateTime && (
          <p className="text-xs text-muted-foreground">{formatEventDate(photo.eventDateTime)}</p>
        )}
      </div>
    </article>
  );
}

export default function HallOfHappinessSection() {
  const { user } = useAuth();
  const query = useQuery(hallOfHappinessOptions({
    size: 8,
    enabled: Boolean(user?.token),
  }));

  return (
    <section data-testid="hall-of-happiness-section" aria-labelledby="hall-of-happiness-heading" className="container-premium py-4 md:py-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">Celebrations worth remembering</p>
          <h2 id="hall-of-happiness-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
            ❤️ Bro &amp; Bro Hall of Happiness
          </h2>
        </div>
        <Link to="/hall-of-happiness" className="shrink-0 text-sm font-semibold text-primary hover:underline">
          View All
        </Link>
      </div>

      {query.isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-56 min-w-[78%] rounded-2xl sm:h-64 sm:min-w-0 sm:flex-1" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <WarningCircleIcon size={20} weight="duotone" />
          Happiness memories are temporarily unavailable.
        </div>
      ) : query.data?.content?.length ? (
        <Carousel opts={{ align: "start", dragFree: true }}>
          <CarouselContent className="-ml-3">
            {query.data.content.map((photo) => (
              <CarouselItem key={photo.id} className="basis-[78%] pl-3 sm:basis-1/3 lg:basis-1/4">
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
