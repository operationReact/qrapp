/* eslint-disable react-hooks/refs */
import { useMemo, useState, useEffect } from "react";
import Autoplay from "embla-carousel-autoplay";
import { Button, buttonVariants } from "./ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from "@/components/ui/carousel";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import NewPartyOrder from "@/components/shared/NewPartyOrder";
import CombosDrawer from "@/components/CombosDrawer";
import BuildYourOwnComboDrawer from "@/components/BuildYourOwnComboDrawer";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Badge } from "./ui/badge";

// ── Slim progress dots ─────────────────────────────────────────────────────
function ProgressDots({ itemCount }) {
  const { api } = useCarousel();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(api.selectedScrollSnap());
    api.on("select", () => setSelectedIndex(api.selectedScrollSnap()));
  }, [api]);

  return (
    <div className="flex justify-center gap-1.5 mt-3">
      {Array.from({ length: itemCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-[3px] rounded-full transition-all duration-300",
            selectedIndex === i ? "w-6 bg-gray-800" : "w-[6px] bg-gray-300",
          )}
        />
      ))}
    </div>
  );
}

// ── Shared card shell ──────────────────────────────────────────────────────
// Renders two layouts:
//   • Mobile  (<md): compact 110px horizontal card — image peeking right
//   • Desktop (md+): full-bleed 190px banner with scrim overlay
function CardShell({ deal, ctaNode }) {
  return (
    <>
      {/* ── MOBILE: compact horizontal card ──────────────────────── */}
      <div
        className="md:hidden relative flex overflow-hidden rounded-lg"
        style={{ height: "110px", background: deal.mobileBg }}
      >
        {/* Left — text */}
        <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
          <Badge
            className="text-[10px] font-bold mb-2 leading-none tracking-wide  text-white"
            style={{ background: "rgba(255,255,255,0.20)" }}
          >
            {deal.icon} {deal.badge}
          </Badge>

          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold leading-tight text-white line-clamp-2">
              {deal.title}
            </span>
            <span className="line-clamp-1 text-[10px] leading-snug text-white/70">
              {deal.subtitle}
            </span>
          </div>

          {/* Compact inline CTA */}
          <Button
            variant="link"
            size="xs"
            className="text-white mt-2 pl-0! justify-start"
          >
            {deal.cta}
            <CaretRightIcon weight="bold" />
          </Button>
        </div>

        {/* Right — image peek with left-fade */}
        <div className="relative w-22 shrink-0 overflow-clip">
          <img
            src={deal.imgSrc}
            alt=""
            aria-hidden
            draggable="false"
            className="h-full w-full object-cover mastk-l-from-50% mask-l-to-95%"
          />
        </div>
      </div>

      {/* ── DESKTOP: full-bleed banner ────────────────────────────── */}
      <div
        className="hidden md:block relative overflow-hidden rounded-lg"
        style={{ height: "190px" }}
      >
        <img
          src={deal.imgSrc}
          alt={deal.title}
          draggable="false"
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0, 0, 0, 0.82) 0%, rgba(0, 0, 0, 0.8) 34%, transparent 100%)",
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-between p-4">
          <Badge
            className="self-start font-semibold"
            style={{
              background: deal.badgeBg ?? "rgba(255,255,255,0.88)",
              color: deal.badgeColor ?? "#111827",
            }}
          >
            {deal.icon} {deal.badge}
          </Badge>
          <div className="flex items-end justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.75">
              <span className="text-sm font-semibold leading-tight text-background drop-shadow-sm">
                {deal.title}
              </span>
              <span className="line-clamp-2 text-sm font-medium leading-snug text-white/75">
                {deal.subtitle}
              </span>
            </div>
            {ctaNode}
          </div>
        </div>
      </div>
    </>
  );
}

// Frosted-glass CTA button — used on all card types
function GlassCTA({ label }) {
  return (
    <Button
      size="xs"
      variant="ghost"
      className="border h-9 border-white/30 bg-white/20 px-3 text-white backdrop-blur-xs hover:text-white transition-colors hover:bg-white/25 shadow-lg shadow-black"
    >
      {label}
      <CaretRightIcon weight="bold" className="size-3" />
    </Button>
  );
}

// ── Party Order card — triggers full Drawer ────────────────────────────────
const FORM_ID = "discover-party-order-form";

function PartyOrderCard({ deal }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setCreated(false);
      }}
    >
      <DrawerTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="w-full cursor-pointer"
          onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        >
          <CardShell deal={deal} ctaNode={<GlassCTA label={deal.cta} />} />
        </div>
      </DrawerTrigger>

      <DrawerContent className="px-4 md:max-w-md md:mx-auto">
        <DrawerHeader>
          <DrawerTitle className="text-center text-lg font-semibold">
            Create Party Order
          </DrawerTitle>
          <DrawerDescription>
            Tell us about your event and preferred menu.
            <br />
            We'll get back to you with an estimate.
          </DrawerDescription>
        </DrawerHeader>
        <div
          className="no-scrollbar flex-1 overflow-y-auto px-1 py-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <NewPartyOrder
            formId={FORM_ID}
            hideSubmitButton
            onClose={() => setOpen(false)}
            onPendingChange={setPending}
            onSuccess={() => setCreated(true)}
          />
        </div>
        {!created && (
          <DrawerFooter className="px-2">
            <Button
              type="submit"
              form={FORM_ID}
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending ? "Submitting…" : "Request Estimate"}
            </Button>
            <DrawerClose
              className={buttonVariants({
                variant: "ghost",
                className: "w-full",
              })}
            >
              Cancel
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}

// ── Static deal card ───────────────────────────────────────────────────────
function StaticDealCard({ deal, onClick, categoryName }) {
  const handleClick = () => {
    if (categoryName) {
      // Set the hash — the browser auto-scrolls to the matching section id
      // and TanStack Router picks up the location change.
      // Using the raw name (not encoded) so the browser encodes it to
      // match the section's id={encodeURIComponent(catName)}.
      window.location.hash = categoryName;
      return;
    }
    onClick?.();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="w-full cursor-pointer"
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      <CardShell deal={deal} ctaNode={<GlassCTA label={deal.cta} />} />
    </div>
  );
}

// ── Discovery cards config ─────────────────────────────────────────────────
const DISCOVERY_CARDS = [
  {
    id: "party",
    type: "party",
    badge: "For Groups",
    title: "Party & Team Orders",
    subtitle: "Let us handle catering for your celebration or team lunch.",
    cta: "Start Party Order",
    icon: "🎉",
    badgeBg: "rgba(234,88,12,0.88)",
    badgeColor: "#fff",
    // Mobile card background
    mobileBg: "linear-gradient(135deg, #c2410c 0%, #9a1c1c 100%)",
    mobileBgFrom: "#c2410c",
    imgSrc:
      "https://images.unsplash.com/photo-1529543544282-ea669407fca3?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "byoc",
    type: "byoc",
    badge: "Save up to 20%",
    title: "Build Your Own Combo",
    subtitle:
      "Mix & match your favorites. Add more items, unlock bigger savings.",
    cta: "Start Building",
    icon: "🔥",
    badgeBg: "rgba(16,185,129,0.88)",
    badgeColor: "#fff",
    mobileBg: "linear-gradient(135deg, #059669 0%, #0f766e 100%)",
    mobileBgFrom: "#059669",
    imgSrc:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "combos",
    badge: "Save Up To 20%",
    title: "Combo Deals",
    subtitle: "Bundle your favorites and save more with every order.",
    cta: "Browse Combos",
    icon: "🏷️",
    badgeBg: "rgba(5,150,105,0.88)",
    badgeColor: "#fff",
    mobileBg: "linear-gradient(135deg, #059669 0%, #0f766e 100%)",
    mobileBgFrom: "#059669",
    imgSrc:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "signature",
    badge: "House Specials",
    title: "BB Exclusive Products",
    subtitle: "Exclusive recipes crafted by our chefs, nowhere else.",
    cta: "Explore Collection",
    icon: "👑",
    badgeBg: "rgba(180,83,9,0.88)",
    badgeColor: "#fff",
    mobileBg: "linear-gradient(135deg, #92400e 0%, #78350f 100%)",
    mobileBgFrom: "#92400e",
    imgSrc:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop",
    categoryName: "BB Signature Products",
  },
];

// ── Section ────────────────────────────────────────────────────────────────
export default function DealsSection() {
  const plugin = useMemo(
    () => Autoplay({ delay: 3800, stopOnInteraction: true }),
    [],
  );
  const [combosOpen, setCombosOpen] = useState(false);
  const [byocOpen, setByocOpen] = useState(false);

  return (
    <div className="mt-2">
      <CombosDrawer open={combosOpen} onOpenChange={setCombosOpen} />
      <BuildYourOwnComboDrawer open={byocOpen} onOpenChange={setByocOpen} />

      <Carousel
        opts={{ loop: true }}
        plugins={[plugin]}
        onMouseEnter={plugin.stop}
        onMouseLeave={plugin.reset}
      >
        {/* Section label — no arrow buttons */}
        <h2 className="mb-2.5 text-[15px] font-bold">Featured for you</h2>

        <CarouselContent className="-ml-3">
          {DISCOVERY_CARDS.map((deal) => (
            <CarouselItem
              key={deal.id}
              // Mobile: fixed compact width so next card peeks (~1.3 visible)
              // Desktop: responsive column fractions
              className="pl-3 basis-[260px] md:basis-full lg:basis-1/3"
            >
              {deal.type === "party" ? (
                <PartyOrderCard deal={deal} />
              ) : (
                <StaticDealCard
                  deal={deal}
                  categoryName={deal.categoryName}
                  onClick={
                    deal.id === "combos"
                      ? () => setCombosOpen(true)
                      : deal.id === "byoc"
                        ? () => setByocOpen(true)
                        : undefined
                  }
                />
              )}
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Slim progress indicator — no arrows, no dots clutter */}
        <ProgressDots itemCount={DISCOVERY_CARDS.length} />
      </Carousel>
    </div>
  );
}
