import { MapPin, RefreshCw } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { Button } from "@/components/ui/button";

export function LocationSelector({ className = "" }) {
  const { activeLocation, availableLocations, setActiveLocation, isLoading, error, refetch } = useLocation();
  if (error) return <Button variant="outline" size="lg" className={`min-h-11 ${className}`} onClick={() => refetch()}><RefreshCw className="size-4" /> Retry location</Button>;
  if (isLoading) return <div className={`h-11 w-44 animate-pulse rounded-xl bg-zinc-100 ${className}`} aria-label="Loading locations" />;
  if (!availableLocations.length) return null;
  if (availableLocations.length === 1) return <div className={`flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 ${className}`}><MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" /><span>{activeLocation?.name || activeLocation?.title || "Location"}</span></div>;
  return (
    <label className={`flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 ${className}`}>
      <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="sr-only">Active location</span>
      <select
        value={activeLocation?.id ?? ""}
        onChange={(event) => setActiveLocation(availableLocations.find((item) => String(item.id) === event.target.value))}
        className="min-h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold text-zinc-700 outline-none"
      >
        {availableLocations.map((location) => <option key={location.id} value={location.id}>{location.name || location.title || `Location ${location.id}`}</option>)}
      </select>
    </label>
  );
}
