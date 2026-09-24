import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeftIcon, HeartIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { hallOfHappinessOptions } from "@/query/options/hall-of-happiness";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/hall-of-happiness")({
  component: HallOfHappinessPage,
});

function HallOfHappinessPage() {
  const { user } = useAuth();
  const query = useQuery(hallOfHappinessOptions({
    size: 24,
    enabled: Boolean(user?.token),
  }));

  return (
    <main className="container-premium py-6 md:py-10">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon size={18} /> Back to home
      </Link>
      <div className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">Celebrations worth remembering</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">❤️ Bro &amp; Bro Hall of Happiness</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          A collection of joyful moments from celebrations brought to life by Bro &amp; Bro.
        </p>
      </div>
      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/3] rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <WarningCircleIcon size={20} weight="duotone" /> Happiness memories are temporarily unavailable.
        </div>
      ) : query.data?.content?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {query.data.content.map((photo) => (
            <GalleryPhoto key={photo.id} photo={photo} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <HeartIcon size={34} weight="duotone" className="mx-auto mb-3 text-rose-400" />
          <p className="font-medium">❤️ Hall of Happiness</p>
          <p className="mt-1 text-sm text-muted-foreground">Memories from our Bro &amp; Bro celebrations will appear here.</p>
        </div>
      )}
    </main>
  );
}

function GalleryPhoto({ photo }) {
  const [failed, setFailed] = useState(false);
  const title = photo.caption || photo.eventType || "A happy celebration";
  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      {failed ? (
        <div className="flex aspect-[4/3] items-center justify-center bg-muted p-4 text-center text-xs text-muted-foreground">
          This memory is temporarily unavailable.
        </div>
      ) : (
        <img
          src={photo.thumbnailUrl || photo.imageUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="aspect-[4/3] w-full object-cover"
        />
      )}
      <div className="p-3">
        <p className="truncate text-sm font-semibold">{title}</p>
      </div>
    </article>
  );
}
