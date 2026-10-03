import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CameraIcon, ConfettiIcon, SparkleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { hallOfHappinessOptions } from "@/query/options/hall-of-happiness";
import { myPartyOrdersOptions } from "@/query/options/party-orders";
import { getHallOfHappinessEligibility } from "@/services/hall-of-happiness-service";
import CelebrationAmbientLayer from "@/components/home/CelebrationAmbientLayer";
import CustomerHallPhotoUpload from "@/components/CustomerHallPhotoUpload";
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

function useIsDesktop() {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = (event) => setMatches(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return matches;
}

function useEligibleHallOrder(enabled) {
  const ordersQuery = useQuery({ ...myPartyOrdersOptions, enabled });
  const completed = useMemo(
    () => (ordersQuery.data || []).filter((order) => order.status === "COMPLETED").slice(0, 5),
    [ordersQuery.data],
  );
  const eligibility = useQueries({
    queries: completed.map((order) => ({
      queryKey: ["hall-of-happiness", "eligibility", order.id],
      queryFn: () => getHallOfHappinessEligibility(order.id),
      staleTime: 60_000,
    })),
  });
  const index = eligibility.findIndex((result) => result.data?.eligible);
  return index >= 0 ? completed[index] : null;
}

function HallOfHappinessPage() {
  const { user } = useAuth();
  const { activeLocationId } = useActiveLocation();
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const headerRef = useRef(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const eligibleOrder = useEligibleHallOrder(Boolean(user?.token));
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const node = headerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setHeaderVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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
      <main className="mx-auto w-full max-w-7xl overflow-x-clip px-4 py-4 sm:px-6 md:py-10 lg:px-8">
        <div ref={headerRef} className="relative isolate">
          <CelebrationAmbientLayer
            presetName="HALL_OF_HAPPINESS_GALLERY_CELEBRATION"
            intensity={isDesktop ? "MEDIUM" : "BOLD"}
            active={headerVisible}
            className="celebration-layer-page"
          />
          <div className="relative z-10 pb-4 pt-0.5 sm:pb-6">
            <Link to="/" className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <ArrowLeftIcon size={18} /> Back to home
            </Link>
            <h1 className="whitespace-nowrap text-[clamp(1.0625rem,5.4vw,1.25rem)] font-bold leading-tight tracking-tight sm:text-3xl">
              <span className="text-foreground">Bro &amp; Bro</span>
              <span aria-hidden="true" className="mx-1.5 font-normal text-muted-foreground/60">·</span>
              <span className="bg-gradient-to-r from-rose-600 to-amber-500 bg-clip-text text-transparent">Hall of Happiness</span>
            </h1>
            <p className="mt-1 text-xs leading-snug text-muted-foreground sm:text-sm">Real moments. Real celebrations.</p>
          </div>
        </div>
        <section
          aria-labelledby="hall-invitation-title"
          className="relative mb-4 flex min-w-0 flex-col gap-3 overflow-hidden rounded-[20px] border border-rose-100 bg-gradient-to-br from-rose-50/90 to-amber-50/80 p-4 shadow-sm sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5"
        >
          <div className="min-w-0">
            <h2 id="hall-invitation-title" className="text-base font-semibold leading-tight text-foreground sm:text-lg">
              Want to be part of Hall of Happiness?
            </h2>
            <p className="mt-1.5 max-w-xl text-[13px] leading-snug text-muted-foreground sm:text-sm">
              Place a Party or Bulk Order of ₹1,499+ and share your celebration memories with us.
            </p>
          </div>
          {eligibleOrder ? (
            <button
              type="button"
              onClick={() => setSubmitOpen(true)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Share My Memories <ArrowRightIcon size={14} weight="bold" />
            </button>
          ) : (
            <Link
              to="/new-party-order"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Plan Your Celebration <ArrowRightIcon size={14} weight="bold" />
            </Link>
          )}
        </section>
        {eligibleOrder && (
          <CustomerHallPhotoUpload order={eligibleOrder} hidden open={submitOpen} onOpenChange={setSubmitOpen} />
        )}
        {query.isError && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <WarningCircleIcon size={20} weight="duotone" /> Happiness memories are temporarily unavailable.
            <button type="button" onClick={() => query.refetch()} className="ml-auto min-h-11 font-semibold underline">Retry</button>
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
