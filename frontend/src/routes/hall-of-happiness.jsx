import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CameraIcon, ConfettiIcon, HeartIcon, SparkleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { hallOfHappinessOptions } from "@/query/options/hall-of-happiness";
import { useAuth } from "@/context/AuthContext";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerMemoryDetailView } from "@/components/hall-of-happiness/CustomerMemoryDetailView";

export const Route = createFileRoute("/hall-of-happiness")({
  component: HallOfHappinessPage,
});

const SOURCE_BADGES = {
  CUSTOMER: { label: "Customer Memory", icon: CameraIcon },
  ADMIN_CURATED: { label: "Bro & Bro Curated", icon: SparkleIcon },
};

function HallOfHappinessPage() {
  const { user } = useAuth();
  const { activeLocationId } = useActiveLocation();
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const query = useQuery(hallOfHappinessOptions({
    size: 24,
    locationId: activeLocationId,
    enabled: Boolean(user?.token),
  }));
  const photos = query.data?.content || [];

  const handleMemoryClick = (photo) => {
    setSelectedMemory(photo);
    setDetailOpen(true);
  };

  return (
    <>
      <main className="container-premium py-6 md:py-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon size={18} /> Back to home
        </Link>
        <div className="mb-7">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-600">
            <HeartIcon size={13} weight="fill" /> Memories we made together
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Bro &amp; Bro{" "}
            <span className="bg-gradient-to-r from-rose-600 to-amber-500 bg-clip-text text-transparent">Hall of Happiness</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            A collection of real moments and celebrations brought to life by Bro &amp; Bro.
          </p>
        </div>
        <section
          aria-labelledby="hall-invitation-title"
          className="mb-5 flex min-w-0 flex-col gap-3 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50/90 to-amber-50/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5"
        >
          <div className="min-w-0">
            <h2 id="hall-invitation-title" className="text-base font-semibold leading-tight text-foreground sm:text-lg">
              Want to be part of the Hall of Happiness?
            </h2>
            <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Celebrate with Bro &amp; Bro. Place a Party or Bulk Order of ₹1,499+ through our app, share your celebration memories, and you could be featured in our Hall of Happiness. Submissions require your consent and are reviewed before publication.
            </p>
          </div>
          <Link
            to="/new-party-order"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:self-center sm:text-sm"
          >
            Plan Your Celebration <ArrowRightIcon size={14} weight="bold" />
          </Link>
        </section>
        {query.isError && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <WarningCircleIcon size={20} weight="duotone" /> Happiness memories are temporarily unavailable.
          </div>
        )}
        {query.isLoading && (
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[4/5] rounded-[24px]" />
            ))}
          </div>
        )}
        {!query.isLoading && photos.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {photos.map((photo) => (
              <GalleryPhoto 
                key={photo.id} 
                photo={photo}
                onClick={() => handleMemoryClick(photo)}
              />
            ))}
          </div>
        )}
        {!query.isLoading && photos.length === 0 && (
          <div className="rounded-[24px] border border-dashed border-border bg-muted/30 p-12 text-center">
            <ConfettiIcon size={34} weight="duotone" className="mx-auto mb-3 text-rose-400" />
            <p className="font-medium">Hall of Happiness</p>
            <p className="mt-1 text-sm text-muted-foreground">Memories from our Bro &amp; Bro celebrations will appear here.</p>
          </div>
        )}
      </main>

      {/* Memory Detail View */}
      <CustomerMemoryDetailView 
        open={detailOpen} 
        onOpenChange={setDetailOpen}
        memory={selectedMemory}
      />
    </>
  );
}

function GalleryPhoto({ photo, onClick }) {
  const [failed, setFailed] = useState(false);
  const title = photo.caption || photo.description || photo.eventLabel || photo.eventType || "A happy celebration";
  const badge = SOURCE_BADGES[photo.sourceType];
  const Icon = badge?.icon;
  return (
    <article 
      className="group overflow-hidden rounded-[24px] bg-neutral-900 shadow-sm cursor-pointer transition hover:shadow-md"
      onClick={onClick}
    >
      <div className="relative aspect-[4/5]">
        {failed ? (
          <div className="flex h-full items-center justify-center bg-muted p-4 text-center text-xs text-muted-foreground">
            This memory is temporarily unavailable.
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
          <>
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            {badge && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                <Icon size={11} weight="fill" /> {badge.label}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-8 text-sm font-semibold text-white">
              {title}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
