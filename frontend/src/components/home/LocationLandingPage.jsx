import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, MapPin, RefreshCw, Store } from "lucide-react";
import { baseURL } from "@/services";

function locationImage(location) {
  if (!location?.locationPhotoUrl) return null;
  return `${baseURL}/api/public/location-images/${location.id}`;
}

function locationSubtitle(location) {
  return [
    location.address,
    !location.address && location.addressLine1,
    !location.address && location.city,
    !location.address && location.stateUt,
  ].filter(Boolean).join(", ");
}

export default function LocationLandingPage({
  locations,
  isLoading,
  error,
  onRetry,
  onSelect,
}) {
  return (
    <main className="w-full min-w-0 min-h-[100dvh] overflow-x-clip bg-[#fbfaf8] pb-[calc(5rem+env(safe-area-inset-bottom))] text-[#242220]">
      <section className="relative isolate overflow-hidden border-b border-[#eee8e1] bg-[radial-gradient(circle_at_100%_0%,#ffe5dc_0%,transparent_38%),linear-gradient(135deg,#fffaf5_0%,#fff_62%)]">
        <div className="pointer-events-none absolute -right-24 -top-32 size-72 rounded-full border-[28px] border-[#ffddd2]/60" aria-hidden="true" />
        <div className="mx-auto w-full max-w-none px-4 pb-6 pt-5 sm:px-8 sm:pb-14 sm:pt-14 lg:max-w-6xl lg:px-10 lg:pb-16 lg:pt-20">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f2c9bc] bg-white/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d92334] shadow-sm sm:mb-5 sm:text-[11px]">
              <MapPin className="size-3.5" aria-hidden="true" />
              Bro &amp; Bro Food Court
            </div>
            <h1 className="max-w-xl text-[2rem] font-bold leading-[1.08] tracking-[-0.04em] text-[#292725] sm:text-5xl sm:leading-[1.08]">
              Where are you ordering from?
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-5 text-[#77736f] sm:mt-4 sm:leading-6 sm:text-base">
              Choose your food court to discover the menu, daily favourites and everything ready for you.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-none px-4 py-6 sm:px-8 sm:py-10 lg:max-w-6xl lg:px-10">
        <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5 sm:gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d92334] sm:text-[11px]">Available locations</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight sm:text-2xl">Pick your food court</h2>
          </div>
          {!isLoading && !error && locations.length > 0 && (
            <span className="shrink-0 text-xs font-semibold text-[#99938c]">
              {locations.length} {locations.length === 1 ? "location" : "locations"}
            </span>
          )}
        </div>

        {isLoading && (
          <div className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3" aria-label="Loading locations">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-56 animate-pulse rounded-2xl border border-[#eee8e1] bg-white p-4 shadow-sm">
                <div className="aspect-[16/7] rounded-xl bg-[#f1eeea]" />
                <div className="mt-4 h-4 w-2/3 rounded bg-[#f1eeea]" />
                <div className="mt-2 h-3 w-5/6 rounded bg-[#f1eeea]" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div role="alert" className="rounded-2xl border border-[#f2c9bc] bg-white px-5 py-8 text-center shadow-sm">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff0ed] text-[#d92334]">
              <MapPin className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-bold">Locations are taking a moment to load</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-[#77736f]">Check your connection and try again.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ff2438] px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2438] focus-visible:ring-offset-2"
            >
              <RefreshCw className="size-4" /> Try again
            </button>
          </div>
        )}

        {!isLoading && !error && locations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#ddd6ce] bg-white px-5 py-10 text-center shadow-sm">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f8f4ef] text-[#77736f]">
              <Store className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-bold">No food courts are available right now</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-[#77736f]">Please check back soon or try refreshing the available locations.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 min-h-11 rounded-xl border border-[#e5e2dd] bg-white px-5 text-sm font-bold text-[#514d48] transition hover:bg-[#f8f7f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2438] focus-visible:ring-offset-2"
            >
              Refresh locations
            </button>
          </div>
        )}

        {!isLoading && !error && locations.length > 0 && (
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {locations.map((location) => {
              const image = locationImage(location);
              const subtitle = locationSubtitle(location);
              return (
                <article
                  key={location.id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#eee8e1] bg-white shadow-[0_8px_24px_rgba(50,35,25,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(50,35,25,0.1)]"
                >
                  <LocationImage image={image} name={location.name} />
                  <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                    <h3 className="text-base font-bold text-[#292725]">{location.name || location.title || "Food court"}</h3>
                    <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-[#77736f]">
                      {subtitle || "Browse the menu at this food court"}
                    </p>
                    <button
                      type="button"
                      onClick={() => onSelect(location)}
                      className="relative z-10 mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff2438] px-4 text-sm font-bold text-white shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2438] focus-visible:ring-offset-2 sm:mt-4"
                    >
                      Explore Food Court
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-[#77736f] sm:mt-10">
          <span>Already have an account?</span>{" "}
          <Link to="/login" className="font-bold text-[#d92334] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2438] focus-visible:ring-offset-2">Sign in</Link>
          <span className="mx-2 text-[#c7c0b8]">·</span>
          <Link to="/register" className="font-bold text-[#d92334] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2438] focus-visible:ring-offset-2">Create account</Link>
        </div>
      </section>
    </main>
  );
}

function LocationImage({ image, name }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-[16/7] w-full overflow-hidden bg-[linear-gradient(135deg,#fff0e9,#f8e5dc)]">
      {image && !failed ? (
        <img
          src={image}
          alt={name ? `${name} food court` : ""}
          className="size-full object-cover transition duration-500 group-hover:scale-105"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-[#d92334]" role="img" aria-label="Food court image unavailable">
          <Store className="size-9 opacity-70" strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" aria-hidden="true" />
    </div>
  );
}
