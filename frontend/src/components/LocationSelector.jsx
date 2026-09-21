import { useState } from "react";
import { Check, ChevronDown, MapPin, RefreshCw } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTrigger,
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
        className={`touch-manipulation ${header ? "min-h-10 rounded-xl border border-border/70 bg-card px-3 text-[12px]" : "min-h-11"} ${className}`}
        onClick={() => refetch()}
      >
        <RefreshCw className="size-4" /> Retry
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`${header ? "h-10 w-[168px] rounded-xl" : "h-11 w-44 rounded-xl"} animate-pulse bg-zinc-100 ${className}`}
        aria-label="Loading locations"
      />
    );
  }

  if (!availableLocations.length) {
    return (
      <button
        type="button"
        onClick={() => refetch()}
        className={`touch-manipulation relative flex min-h-10 min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-card px-3 text-[12px] font-bold text-foreground ${className}`}
      >
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate">Location</span>
      </button>
    );
  }

  const locationName = activeLocation?.name || activeLocation?.title || "Location";
  const canSwitch = availableLocations.length > 1;

  const triggerClass = `touch-manipulation relative flex min-w-0 items-center gap-2 border border-border/80 bg-card px-3 text-left ${header ? "min-h-11 w-full rounded-xl shadow-sm" : home ? "min-h-12 rounded-2xl shadow-[0_2px_10px_rgba(42,35,30,0.04)]" : "min-h-11 rounded-xl"} ${className}`;

  if (!canSwitch) {
    return (
      <button
        type="button"
        className={triggerClass}
        onClick={() => refetch()}
        aria-label="Refresh locations"
      >
        <MapPin className="size-[17px] shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className={`block font-semibold uppercase tracking-[0.06em] text-muted-foreground ${header ? "text-[9px]" : "text-[10px]"}`}>
            {header ? "Deliver to" : "Delivering to"}
          </span>
          <span className={`block truncate font-bold text-foreground ${header ? "text-[13px]" : "text-[13px]"}`}>
            {locationName}
          </span>
        </span>
      </button>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className={triggerClass}
          aria-label="Open location selector"
          aria-expanded={open}
        >
          <MapPin className="size-[17px] shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className={`block font-semibold uppercase tracking-[0.06em] text-muted-foreground ${header ? "text-[9px]" : "text-[10px]"}`}>
              {header ? "Deliver to" : "Delivering to"}
            </span>
            <span className={`block truncate font-bold text-foreground text-[13px]`}>
              {locationName}
            </span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
        </button>
      </DrawerTrigger>
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
                  className={`touch-manipulation flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm ${isActive ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-foreground"}`}
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
  );
}
