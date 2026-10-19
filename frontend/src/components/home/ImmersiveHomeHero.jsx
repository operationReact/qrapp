import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import PropTypes from "prop-types";
import Autoplay from "embla-carousel-autoplay";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { WalletIcon } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { walletBalanceOptions } from "@/query/options/wallet";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from "@/components/ui/carousel";
import { Button, buttonVariants } from "@/components/ui/button";
import { LocationSelector } from "@/components/LocationSelector";
import SearchBar from "@/components/shared/SearchBar";
import SegmentedFilter from "@/components/SegmentedFilter";
import { homeCampaignFeedOptions } from "@/query/options/home-campaigns";
import CampaignPresentation from "./CampaignPresentationView";
import { cn } from "@/lib/utils";
import CombosDrawer from "@/components/CombosDrawer";
import BuildYourOwnComboDrawer from "@/components/BuildYourOwnComboDrawer";
import NewPartyOrder from "@/components/shared/NewPartyOrder";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const FORM_ID = "home-hero-party-order-form";

// Fallback billboard shown only when no HERO campaign is configured (never a
// fake campaign — just a tasteful brand backdrop so search/location/filters
// stay usable).
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=1200&auto=format&fit=crop";

function HeroDots({ count }) {
  const { api } = useCarousel();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!api) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(api.selectedScrollSnap());
    api.on("select", () => setSelected(api.selectedScrollSnap()));
  }, [api]);

  if (count <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label="Hero campaigns"
      className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5"
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          role="tab"
          aria-selected={selected === i}
          className={cn(
            "h-[3px] rounded-full shadow transition-all duration-300",
            selected === i ? "w-6 bg-white" : "w-[6px] bg-white/50",
          )}
        />
      ))}
    </div>
  );
}

function HeroSlide({ campaign, handlers, index }) {
  const { api } = useCarousel();
  const subscribe = useCallback((onStoreChange) => {
    if (!api) return () => {};
    api.on("select", onStoreChange);
    api.on("reInit", onStoreChange);
    return () => {
      api.off("select", onStoreChange);
      api.off("reInit", onStoreChange);
    };
  }, [api]);
  const getSnapshot = useCallback(
    () => (api ? api.selectedScrollSnap() === index : index === 0),
    [api, index],
  );
  const active = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return (
    <CampaignPresentation
      campaign={{ ...campaign, isActive: active }}
      handlers={handlers}
      fallbackImage={FALLBACK_IMAGE}
      eager
    />
  );
}

/**
 * ImmersiveHomeHero — one continuous visual canvas. Location, logo, search,
 * Veg/Non-Veg and the data-driven HERO campaign carousel are all layered on
 * top of a single full-bleed background; there are no stacked white card
 * sections.
 */
export default function ImmersiveHomeHero({
  locationId,
  onSearch,
  vegFilter,
  onVegFilterChange,
  showOverlayControls = true,
}) {
  const { data } = useQuery(homeCampaignFeedOptions(locationId));
  const { user } = useAuth();
  const { data: walletData, isLoading: loadingWallet } = useQuery({
    ...walletBalanceOptions,
    enabled: !!user?.token,
  });
  const walletBalance = walletData?.balance ?? null;
  const heroCampaigns = data?.hero ?? [];
  const slides = heroCampaigns.length > 0 ? heroCampaigns : [{ id: "fallback", title: null }];

  const plugin = useMemo(
    () => Autoplay({
      delay: 4000,
      playOnInit: true,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
    }),
    [],
  );

  const [partyOpen, setPartyOpen] = useState(false);
  const [partyPending, setPartyPending] = useState(false);
  const [partyCreated, setPartyCreated] = useState(false);
  const [combosOpen, setCombosOpen] = useState(false);
  const [byocOpen, setByocOpen] = useState(false);

  const handlers = {
    openPartyOrder: () => setPartyOpen(true),
    openCombos: () => setCombosOpen(true),
    openByoc: () => setByocOpen(true),
  };

  return (
    <div className="relative isolate overflow-hidden rounded-b-3xl" style={{ 
      height: (() => {
        const w = window.innerWidth;
        if (w < 1024) return "clamp(340px, 78vw, 500px)";
        if (w < 1280) return "320px";
        if (w < 1536) return "340px";
        return "360px";
      })(),
      minHeight: 0,
    }}>
      <CombosDrawer open={combosOpen} onOpenChange={setCombosOpen} />
      <BuildYourOwnComboDrawer open={byocOpen} onOpenChange={setByocOpen} />

      <Drawer
        open={partyOpen}
        onOpenChange={(v) => {
          setPartyOpen(v);
          if (!v) setPartyCreated(false);
        }}
      >
        <DrawerContent className="px-4 md:max-w-md md:mx-auto">
          <DrawerHeader>
            <DrawerTitle className="text-center text-lg font-semibold">
              Create Party Order
            </DrawerTitle>
            <DrawerDescription>
              Tell us about your event and preferred menu.
              <br />
              We&apos;ll get back to you with an estimate.
            </DrawerDescription>
          </DrawerHeader>
          <div
            className="no-scrollbar flex-1 overflow-y-auto px-1 py-4"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <NewPartyOrder
              formId={FORM_ID}
              hideSubmitButton
              onClose={() => setPartyOpen(false)}
              onPendingChange={setPartyPending}
              onSuccess={() => setPartyCreated(true)}
            />
          </div>
          {!partyCreated && (
            <DrawerFooter className="px-2">
              <Button type="submit" form={FORM_ID} size="lg" className="w-full" disabled={partyPending}>
                {partyPending ? "Submitting…" : "Request Estimate"}
              </Button>
              <DrawerClose className={buttonVariants({ variant: "ghost", className: "w-full" })}>
                Cancel
              </DrawerClose>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>

      <Carousel
        opts={{ loop: heroCampaigns.length > 1 }}
        plugins={[plugin]}
        className="absolute inset-0 h-full"
      >
        <CarouselContent className="ml-0 h-full">
          {slides.map((campaign, index) => (
            <CarouselItem key={campaign.id} className="h-full pl-0">
              <HeroSlide campaign={campaign} handlers={handlers} index={index} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <HeroDots count={slides.length} />
      </Carousel>

      {showOverlayControls && (
        <>
          {/* Desktop: Unified premium control system in one row */}
          <div className="hidden lg:block lg:absolute lg:inset-x-0 lg:top-1/2 lg:-translate-y-1/2 lg:z-20">
            {/* Search + Filters: Desktop only, aligned in same row */}
            <div className="flex items-center gap-3 max-w-5xl w-full px-3 mx-auto lg:max-w-5xl">
              <div className="min-w-0 flex-1 lg:max-w-2xl">
                <SearchBar home onSearch={onSearch} />
              </div>
              <SegmentedFilter compact value={vegFilter} onChange={onVegFilterChange} />
            </div>
          </div>

          {/* Mobile only: Location, Search + Filters */}
          <div className="lg:hidden absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <LocationSelector overlay className="min-w-0 flex-1" />
            {user ? (
              <Link
                to="/wallet"
                aria-label="Open wallet"
                className="touch-manipulation relative flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/25 bg-black/25 px-3 text-white backdrop-blur-sm"
              >
                <WalletIcon weight="fill" className="size-4 shrink-0 text-amber-300" aria-hidden="true" />
                <span className="flex flex-col items-start leading-tight">
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.06em] text-white/70">Wallet</span>
                  <span className="block text-[13px] font-bold tabular-nums drop-shadow-sm">
                    {loadingWallet
                      ? "..."
                      : walletBalance == null
                        ? "—"
                        : `₹${walletBalance.toFixed(0)}`}
                  </span>
                </span>
              </Link>
            ) : (
              <Link to="/" className="shrink-0 rounded-xl bg-white/95 p-1.5 shadow-md" aria-label="BRO & BRO">
                <img src="/bro-logo.png" alt="BRO & BRO" className="h-7 w-7 object-contain" />
              </Link>
            )}
          </div>

          {/* Mobile only: Search + Filters below header */}
          <div className="lg:hidden absolute inset-x-0 top-[60px] z-20 flex items-center gap-2 px-3">
            <div className="min-w-0 flex-1">
              <SearchBar home onSearch={onSearch} />
            </div>
            <SegmentedFilter compact value={vegFilter} onChange={onVegFilterChange} />
          </div>
        </>
      )}
    </div>
  );
}

ImmersiveHomeHero.propTypes = {
  locationId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onSearch: PropTypes.func,
  vegFilter: PropTypes.string,
  onVegFilterChange: PropTypes.func,
  showOverlayControls: PropTypes.bool,
};
