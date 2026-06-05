/* eslint-disable react-hooks/refs */
import { useMemo, useState, useEffect } from "react";
import Autoplay from "embla-carousel-autoplay";
import { Button, buttonVariants } from "./ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
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
import { cn } from "@/lib/utils";

// ── Carousel dot indicators ────────────────────────────────────────────────
function CarouselDots({ itemCount }) {
  const { api } = useCarousel();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(api.selectedScrollSnap());
    api.on("select", () => setSelectedIndex(api.selectedScrollSnap()));
  }, [api]);

  return (
    <div className="flex lg:hidden justify-center gap-1.5 mt-2">
      {Array.from({ length: itemCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            selectedIndex === i ? "w-4 bg-primary" : "w-1.5 bg-gray-300",
          )}
        />
      ))}
    </div>
  );
}

// ── Party Order card — self-contained with Drawer ─────────────────────────
const FORM_ID = "discover-party-order-form";

function PartyOrderCard({ deal }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl p-2 pr-[68px] pt-2 border relative overflow-clip min-h-[80px]",
        deal.bgClass,
      )}
    >
      <div className="grid gap-0.5 text-wrap">
        <h3 className="text-sm font-semibold leading-tight pr-2">
          {deal.icon} {deal.title}
        </h3>
        <p className="text-xs text-pretty text-muted-foreground leading-tight mb-0.5">
          {deal.subtitle}
        </p>

        <Drawer
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setCreated(false); }}
        >
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("w-fit h-7 bg-white font-semibold text-xs", deal.btnClass)}
            >
              {deal.cta}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="px-4 md:max-w-md md:mx-auto">
            <DrawerHeader>
              <DrawerTitle className="text-lg font-semibold text-center">
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
                  className={buttonVariants({ variant: "ghost", className: "w-full" })}
                >
                  Cancel
                </DrawerClose>
              </DrawerFooter>
            )}
          </DrawerContent>
        </Drawer>
      </div>

      <div
        className={cn(
          "absolute -right-4 -bottom-4 w-20 h-20 rounded-full blur-xl opacity-60",
          deal.blobClass,
        )}
      />
      <img
        src={deal.imgSrc}
        alt={deal.title}
        className={cn(
          "absolute -right-2 top-1/2 -translate-y-1/2 w-16 h-16 object-cover rounded-full shadow-md z-10",
          deal.imgClass,
        )}
      />
    </div>
  );
}

// ── Static deal card ───────────────────────────────────────────────────────
function StaticDealCard({ deal, onClick }) {
  return (
    <div
      className={cn(
        "rounded-xl p-2 pr-[68px] pt-2 border relative overflow-clip min-h-[80px]",
        deal.bgClass,
      )}
    >
      <div className="grid gap-0.5 text-wrap">
        <h3 className="text-sm font-semibold leading-tight pr-2">
          {deal.icon} {deal.title}
        </h3>
        <p className="text-xs text-pretty text-muted-foreground leading-tight mb-0.5">
          {deal.subtitle}
        </p>
        <Button
          variant="outline"
          size="sm"
          className={cn("w-fit h-7 bg-white font-semibold text-xs", deal.btnClass)}
          onClick={onClick}
        >
          {deal.cta}
        </Button>
      </div>

      <div
        className={cn(
          "absolute -right-4 -bottom-4 w-20 h-20 rounded-full blur-xl opacity-60",
          deal.blobClass,
        )}
      />
      <img
        src={deal.imgSrc}
        alt={deal.title}
        className={cn(
          "absolute -right-2 top-1/2 -translate-y-1/2 w-16 h-16 object-cover rounded-full shadow-md z-10",
          deal.imgClass,
        )}
      />
    </div>
  );
}

// ── Discovery cards config ─────────────────────────────────────────────────
// Add new featured experiences here — no layout code changes needed.
const DISCOVERY_CARDS = [
  {
    id: "party",
    type: "party",           // renders PartyOrderCard with its Drawer
    title: "Party & Team Orders",
    subtitle: "Ordering for a group? Let us handle the food.",
    cta: "Start Party Order",
    icon: "🎉",
    bgClass: "bg-white border-zinc-200",
    blobClass: "bg-zinc-100",
    btnClass: "border-zinc-200 text-zinc-700 hover:bg-zinc-50",
    imgSrc:
      "https://images.unsplash.com/photo-1529543544282-ea669407fca3?q=80&w=200&auto=format&fit=crop",
    imgClass: "border-2 border-white",
  },
  {
    id: "combos",
    title: "Combo Deals",
    subtitle: "Bundle your favorite items and save up to 20%.",
    cta: "Explore Combos",
    icon: "🏷️",
    bgClass: "bg-white border-zinc-200",
    blobClass: "bg-zinc-100",
    btnClass: "border-zinc-200 text-zinc-700 hover:bg-zinc-50",
    imgSrc:
      "https://images.unsplash.com/photo-1594212206063-4d6a4a4d6423?q=80&w=200&auto=format&fit=crop",
    imgClass: "mix-blend-multiply border-transparent shadow-none",
  },
  {
    id: "signature",
    title: "BB Signature Products",
    subtitle: "House-made specialties crafted by our chefs.",
    cta: "Explore Collection",
    icon: "👑",
    bgClass: "bg-amber-50/40 border-amber-100/60",
    blobClass: "bg-amber-100/70",
    btnClass: "border-amber-200 text-amber-800 hover:bg-amber-50",
    imgSrc:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=200&auto=format&fit=crop",
    imgClass: "border-2 border-white object-cover",
  },
];

// ── Section ────────────────────────────────────────────────────────────────
export default function DealsSection() {
  const plugin = useMemo(() => Autoplay({ delay: 2000, stopOnInteraction: true }), []);
  const [combosOpen, setCombosOpen] = useState(false);

  return (
    <div className="mt-2">
      <CombosDrawer open={combosOpen} onOpenChange={setCombosOpen} />

      <Carousel
        plugins={[plugin]}
        onMouseEnter={plugin.stop}
        onMouseLeave={plugin.reset}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[15px] font-bold">Featured for you</h2>
          <div className="flex items-center gap-2">
            <CarouselPrevious className="static translate-y-0 transform-none size-8 bg-zinc-50 hover:bg-gray-100 border-border rounded-md shadow-xs text-secondary-foreground" />
            <CarouselNext className="static translate-y-0 transform-none size-8 bg-zinc-50 hover:bg-gray-100 border-border rounded-md shadow-xs text-secondary-foreground" />
          </div>
        </div>

        <CarouselContent className="pr-16">
          {DISCOVERY_CARDS.map((deal) => (
            <CarouselItem key={deal.id} className="md:basis-1/2 lg:basis-1/3">
              {deal.type === "party"
                ? <PartyOrderCard deal={deal} />
                : <StaticDealCard
                    deal={deal}
                    onClick={deal.id === "combos" ? () => setCombosOpen(true) : undefined}
                  />
              }
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselDots itemCount={DISCOVERY_CARDS.length} />
      </Carousel>
    </div>
  );
}
