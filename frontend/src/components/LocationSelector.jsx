import { ChevronDown, MapPin, RefreshCw } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { Button } from "@/components/ui/button";

export function LocationSelector({ className = "", home = false }) {
  const { activeLocation, availableLocations, setActiveLocation, isLoading, error, refetch } = useLocation();
  if (error) return <Button variant="outline" size="lg" className={`min-h-11 ${className}`} onClick={() => refetch()}><RefreshCw className="size-4" /> Retry location</Button>;
  if (isLoading) return <div className={`h-11 w-44 animate-pulse rounded-xl bg-zinc-100 ${className}`} aria-label="Loading locations" />;
  if (!availableLocations.length) return null;
  const locationName = activeLocation?.name || activeLocation?.title || "Location";
  const locationAddress = activeLocation?.address || activeLocation?.addressLine || "";
  return (
    <label className={`relative flex min-w-0 items-center gap-2.5 border border-border/80 bg-card px-3 ${home ? "min-h-12 rounded-2xl shadow-[0_2px_10px_rgba(42,35,30,0.04)]" : "min-h-11 rounded-xl"} ${className}`}>
      <MapPin className="size-[19px] shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Delivering to</span>
        <span className="block truncate text-[13px] font-bold text-foreground">{locationName}{locationAddress ? `, ${locationAddress}` : ""}</span>
      </span>
      <ChevronDown className="size-4 shrink-0 text-foreground" aria-hidden="true" />
      {availableLocations.length > 1 && (
        <>
          <span className="sr-only">Active location</span>
          <select
            aria-label="Choose delivery location"
            value={activeLocation?.id ?? ""}
            onChange={(event) => setActiveLocation(availableLocations.find((item) => String(item.id) === event.target.value))}
            className="absolute inset-0 min-h-12 w-full cursor-pointer opacity-0"
          >
            {availableLocations.map((location) => <option key={location.id} value={location.id}>{location.name || location.title || `Location ${location.id}`}</option>)}
          </select>
        </>
      )}
    </label>
  );
}
