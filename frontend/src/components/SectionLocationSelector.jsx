import { useEffect } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import {
  assignableSectionLocations,
  canUseSectionLocationSelector,
} from "@/lib/sectionLocation";

/**
 * Section-level location selector for regular ADMIN / MANAGER users.
 *
 * Renders only for users who may pick among their assigned locations at the
 * section level (see {@link canUseSectionLocationSelector}). SUPER_ADMIN keeps
 * the root-level selector instead and KITCHEN_STAFF never see any selector, so
 * this component returns null for them. The selection is a transient override
 * that scopes the current section's data without mutating the persisted global
 * location context. There is deliberately no "All Locations" option here.
 */
export function SectionLocationSelector({ className = "", label = "Location" }) {
  const { user } = useAuth();
  const {
    availableLocations,
    activeLocation,
    setSectionLocation,
    clearSectionLocation,
  } = useLocation();

  useEffect(() => () => {
    // Section overrides are transient and must not leak into another page.
    clearSectionLocation();
  }, [clearSectionLocation]);

  if (!canUseSectionLocationSelector(user)) return null;

  const options = assignableSectionLocations(availableLocations);
  // Nothing to choose between — hide the control entirely.
  if (options.length < 2) return null;

  const value = activeLocation?.id != null ? String(activeLocation.id) : "";
  const nameFor = (location) => location.name || location.title || `Location ${location.id}`;

  return (
    <div className={`relative inline-flex ${className}`}>
      <label className="sr-only" htmlFor="section-location-select">{label}</label>
      <MapPin
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-primary"
        aria-hidden="true"
      />
      <select
        id="section-location-select"
        value={value}
        onChange={(event) => {
          const next = options.find((item) => String(item.id) === event.target.value);
          if (next) setSectionLocation(next);
        }}
        className="h-11 min-w-[160px] appearance-none rounded-xl border border-border/80 bg-card pl-8 pr-8 text-xs font-bold text-foreground outline-none transition-colors hover:bg-white focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        {options.map((location) => (
          <option key={location.id} value={String(location.id)}>
            {nameFor(location)}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-primary"
        aria-hidden="true"
      />
    </div>
  );
}
