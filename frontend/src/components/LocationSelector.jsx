import { useState } from "react";
import { Check, ChevronDown, MapPin, RefreshCw } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export function LocationSelector({ className = "", home = false, header = false }) {
  const { activeLocation, availableLocations, setActiveLocation, isLoading, error, refetch } = useLocation();
  const [open, setOpen] = useState(false);

  if (error) {
    return (
      <Button
        variant={header ? "ghost" : "outline"}
        size="lg"
        className={`${header ? "min-h-10 rounded-full bg-[#fff0f3] px-3 text-[12px]" : "min-h-11"} ${className}`}
        onClick={() => refetch()}
      >
        <RefreshCw className="size-4" /> Retry
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`${header ? "h-10 w-[112px] rounded-full" : "h-11 w-44 rounded-xl"} animate-pulse bg-zinc-100 ${className}`}
        aria-label="Loading locations"
      />
    );
  }

  if (!availableLocations.length) {
    return (
      <button
        type="button"
        onClick={() => refetch()}
        className={`relative flex min-h-10 min-w-0 items-center gap-2 rounded-full bg-[#fff0f3] px-3 text-[12px] font-bold text-foreground ${className}`}
      >
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate">Location</span>
      </button>
    );
  }

  const locationName = activeLocation?.name || activeLocation?.title || "Location";
  const locationAddress = activeLocation?.address || activeLocation?.addressLine || "";
  const canSwitch = availableLocations.length > 1;

  const trigger = (
    <button
      type="button"
      className={`relative flex min-w-0 items-center gap-2.5 border border-border/80 bg-card px-3 text-left ${header ? "min-h-10 max-w-[118px] rounded-full border-transparent bg-[#fff0f3] px-3" : home ? "min-h-12 rounded-2xl shadow-[0_2px_10px_rgba(42,35,30,0.04)]" : "min-h-11 rounded-xl"} ${className}`}
      onClick={() => canSwitch && setOpen(true)}
      aria-label="Open location selector"
      disabled={!canSwitch}
    >
      <MapPin className="size-[19px] shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1 leading-tight">
        {!header && (
          <span className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Delivering to
          </span>
        )}
        <span className={`block truncate font-bold text-foreground ${header ? "text-[12px]" : "text-[13px]"}`}>
          {locationName}
          {!header && locationAddress ? `, ${locationAddress}` : ""}
        </span>
      </span>
      {canSwitch && <ChevronDown className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  );

  if (!canSwitch) return trigger;

  return (
    <>
      {trigger}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto w-full max-w-md rounded-t-2xl">
          <DrawerHeader>
            <DrawerTitle>Select location</DrawerTitle>
            <DrawerDescription>Choose where you want to browse the menu.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <div className="grid gap-2">
              {availableLocations.map((location) => {
                const name = location.name || location.title || `Location ${location.id}`;
                const isActive = String(activeLocation?.id) === String(location.id);
                return (
                  <button
                    key={location.id}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm ${isActive ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-foreground"}`}
                    onClick={() => {
                      setActiveLocation(location);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate pr-2 font-medium">{name}</span>
                    {isActive && <Check className="size-4 shrink-0" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

