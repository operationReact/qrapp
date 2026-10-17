import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChefHat,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Store,
  Utensils,
  X,
} from "lucide-react";
import { baseURL } from "@/services";
import { publicLocationSearchOptions } from "@/context/LocationContext";
import {
  RECENT_LOCATIONS_KEY,
  addRecentLocation,
  formatDistance,
  matchesLocationQuery,
  nearbyRows,
  parseRecentLocations,
  resolveRecentLocations,
} from "@/lib/locationDiscovery";
import "../../styles/location-landing.css";

// Images wider than this ratio are treated as wordmark/logo artwork and shown whole.
const LOGO_ASPECT_RATIO = 1.9;
const SERVER_PAGE_SIZE = 12;
const LOCAL_PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

const FILTERS = [
  { id: "all", label: "All locations" },
  { id: "nearby", label: "Nearby" },
  { id: "recent", label: "Recently visited" },
];

function locationImage(location) {
  if (!location?.locationPhotoUrl) return null;
  return `${baseURL}/api/public/location-images/${location.id}`;
}

function locationAddressLines(location) {
  const structuredLines = [
    location.addressLine1,
    [location.city, location.district].filter(Boolean).join(", "),
    [location.stateUt, location.pinCode].filter(Boolean).join(" "),
  ].filter(Boolean);
  return structuredLines.length ? structuredLines : (location.address ? [location.address] : []);
}

function readRecentEntries() {
  try {
    return parseRecentLocations(localStorage.getItem(RECENT_LOCATIONS_KEY));
  } catch {
    return [];
  }
}

function writeRecentEntries(entries) {
  try {
    localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(entries));
  } catch {
    // Storage may be unavailable (private mode); recents are a convenience only.
  }
}

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function LocationLandingPage({ locations = [], onSelect }) {
  const [rawQuery, setRawQuery] = useState("");
  const query = useDebouncedValue(rawQuery.trim(), SEARCH_DEBOUNCE_MS);
  const [filter, setFilter] = useState("all");
  const [localLimit, setLocalLimit] = useState(LOCAL_PAGE_SIZE);
  const [geo, setGeo] = useState({ status: "idle", origin: null });
  const [recentEntries, setRecentEntries] = useState(readRecentEntries);

  const isAll = filter === "all";
  const searchQuery = useInfiniteQuery({
    ...publicLocationSearchOptions({ search: query, size: SERVER_PAGE_SIZE }),
    enabled: isAll,
  });
  const serverPages = searchQuery.data?.pages;
  const serverRows = useMemo(
    () => (serverPages || []).flatMap((page) => page.content).map((location) => ({ location })),
    [serverPages],
  );
  const serverTotal = serverPages?.[0]?.totalElements ?? 0;

  const nearby = useMemo(
    () => (filter === "nearby" && geo.origin
      ? nearbyRows(locations, geo.origin, query)
      : { rows: [], withoutCoordinates: 0 }),
    [filter, geo.origin, locations, query],
  );
  const recentRows = useMemo(
    () => resolveRecentLocations(recentEntries, locations)
      .filter((location) => matchesLocationQuery(location, query))
      .map((location) => ({ location })),
    [recentEntries, locations, query],
  );

  const localRows = filter === "nearby" ? nearby.rows : recentRows;
  const rows = isAll ? serverRows : localRows.slice(0, localLimit);
  const totalCount = isAll ? serverTotal : localRows.length;
  const hasMore = isAll ? Boolean(searchQuery.hasNextPage) : localRows.length > localLimit;
  const hasQuery = Boolean(query);
  const serverLoading = isAll && searchQuery.isPending;
  const serverFailed = isAll && searchQuery.isError && serverRows.length === 0;

  function changeFilter(next) {
    setFilter(next);
    setLocalLimit(LOCAL_PAGE_SIZE);
    if (next === "nearby") requestNearby();
  }

  function requestNearby() {
    if (geo.status === "granted" || geo.status === "requesting"
      || geo.status === "denied" || geo.status === "unavailable") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo({ status: "unavailable", origin: null });
      return;
    }
    setGeo({ status: "requesting", origin: null });
    navigator.geolocation.getCurrentPosition(
      (position) => setGeo({
        status: "granted",
        origin: { lat: position.coords.latitude, lng: position.coords.longitude },
      }),
      (error) => setGeo({ status: error?.code === 1 ? "denied" : "unavailable", origin: null }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function handleSelect(location) {
    const next = addRecentLocation(recentEntries, location.id, Date.now());
    setRecentEntries(next);
    writeRecentEntries(next);
    onSelect(location);
  }

  function handleLoadMore() {
    if (isAll) searchQuery.fetchNextPage();
    else setLocalLimit((limit) => limit + LOCAL_PAGE_SIZE);
  }

  function clearSearch() {
    setRawQuery("");
    setLocalLimit(LOCAL_PAGE_SIZE);
  }

  let emptyState = null;
  if (!serverLoading && !serverFailed && rows.length === 0) {
    if (isAll && hasQuery) {
      emptyState = { title: "No locations found", text: "Try a different building, company or area.", clear: true };
    } else if (isAll) {
      emptyState = { title: "No food courts are available right now", text: "Please check back soon or try again.", retry: true };
    } else if (filter === "nearby") {
      if (geo.status === "requesting") {
        emptyState = { title: "Finding locations near you…", text: "Allow location access in your browser to sort by distance." };
      } else if (geo.status === "denied" || geo.status === "unavailable") {
        emptyState = {
          title: "Location isn't available",
          text: geo.status === "denied"
            ? "Location permission is off, so we can't sort by distance. You can still browse all locations."
            : "We couldn't read your location. You can still browse all locations.",
          showAll: true,
        };
      } else {
        emptyState = {
          title: "No nearby locations to show",
          text: hasQuery
            ? "No locations with map coordinates match your search."
            : "None of the available locations have map coordinates yet.",
        };
      }
    } else {
      emptyState = {
        title: "No recently visited locations yet",
        text: "Locations you explore will appear here for quick access.",
      };
    }
  }

  const countLabel = totalCount
    ? `${totalCount} ${totalCount === 1 ? "location" : "locations"}`
    : "Locations";

  return (
    <main className="loc-landing">
      <header className="loc-header">
        <div className="loc-container loc-header-inner">
          <Link to="/" className="loc-brand">
            <img src="/bro-logo.png" alt="Bro & Bro" />
            <span style={{ minWidth: 0 }}>
              <span className="loc-brand-name">Bro &amp; Bro</span>
              <span className="loc-brand-sub">Food Court</span>
            </span>
          </Link>
          <Link to="/login" className="loc-signin">
            Sign in
          </Link>
        </div>
      </header>

      <section className="loc-hero">
        <div className="loc-hero-ring" aria-hidden="true" />
        <div className="loc-container loc-hero-inner">
          <div style={{ position: "relative", zIndex: 1, minWidth: 0 }}>
            <p className="loc-eyebrow">Welcome to</p>
            <h1 className="loc-title">BRO & BRO Food court</h1>
            <p className="loc-lede">Choose a location to explore its menu.</p>
          </div>
          <div className="loc-art" aria-hidden="true">
            <div className="loc-art-halo" />
            <div className="loc-art-plate" />
            <div className="loc-art-core">
              <ChefHat size={48} strokeWidth={1.4} />
            </div>
            <Utensils className="loc-art-utensil" size={36} strokeWidth={1.5} />
            <span className="loc-art-dot loc-art-dot--a" />
            <span className="loc-art-dot loc-art-dot--b" />
          </div>
        </div>
      </section>

      <section className="loc-container loc-section">
        <div className="loc-search" role="search">
          <Search size={20} aria-hidden="true" className="loc-search-icon" />
          <input
            id="loc-search"
            type="search"
            className="loc-search-input"
            aria-label="Search locations"
            placeholder="Search building, company or area"
            autoComplete="off"
            value={rawQuery}
            onChange={(event) => {
              setRawQuery(event.target.value);
              setLocalLimit(LOCAL_PAGE_SIZE);
            }}
          />
          {rawQuery && (
            <button type="button" className="loc-search-clear" onClick={clearSearch} aria-label="Clear search">
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="loc-filters" role="group" aria-label="Filter locations">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              className={`loc-filter${filter === item.id ? " is-active" : ""}`}
              onClick={() => changeFilter(item.id)}
            >
              {item.id === "nearby" && <Navigation size={14} aria-hidden="true" />}
              {item.label}
            </button>
          ))}
        </div>

        <div className="loc-section-head">
          <h2 className="loc-section-title">Available locations</h2>
          {!serverLoading && !serverFailed && (
            <span className="loc-count" aria-live="polite">{countLabel}</span>
          )}
        </div>

        {filter === "nearby" && geo.status === "granted" && nearby.withoutCoordinates > 0 && (
          <p className="loc-note" role="status">
            {nearby.withoutCoordinates} {nearby.withoutCoordinates === 1 ? "location has" : "locations have"} no map coordinates, so {nearby.withoutCoordinates === 1 ? "it isn't" : "they aren't"} listed by distance.
          </p>
        )}

        {serverLoading && (
          <div className="loc-grid" aria-label="Loading locations">
            {[1, 2, 3].map((item) => (
              <div key={item} className="loc-skeleton">
                <div className="loc-skeleton-media" />
                <div className="loc-skeleton-body">
                  <div className="loc-skeleton-line" style={{ width: "66%" }} />
                  <div className="loc-skeleton-line" style={{ width: "83%" }} />
                  <div className="loc-skeleton-line" style={{ height: 48, marginTop: 8 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {serverFailed && (
          <div role="alert" className="loc-panel">
            <div className="loc-panel-icon">
              <MapPin size={20} aria-hidden="true" />
            </div>
            <h3 className="loc-panel-title">Locations are taking a moment to load</h3>
            <p className="loc-panel-text">Check your connection and try again.</p>
            <button type="button" onClick={() => searchQuery.refetch()} className="loc-btn loc-btn--primary">
              <RefreshCw size={16} aria-hidden="true" /> Try again
            </button>
          </div>
        )}

        {emptyState && (
          <div className="loc-panel loc-panel--muted" role="status">
            <div className="loc-panel-icon">
              <Store size={20} aria-hidden="true" />
            </div>
            <h3 className="loc-panel-title">{emptyState.title}</h3>
            <p className="loc-panel-text">{emptyState.text}</p>
            {emptyState.clear && (
              <button type="button" onClick={clearSearch} className="loc-btn loc-btn--secondary">
                Clear search
              </button>
            )}
            {emptyState.retry && (
              <button type="button" onClick={() => searchQuery.refetch()} className="loc-btn loc-btn--secondary">
                Refresh locations
              </button>
            )}
            {emptyState.showAll && (
              <button type="button" onClick={() => changeFilter("all")} className="loc-btn loc-btn--secondary">
                Show all locations
              </button>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div className="loc-grid">
            {rows.map(({ location, distanceKm }) => (
              <LocationCard
                key={location.id}
                location={location}
                distanceKm={distanceKm}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}

        {rows.length > 0 && isAll && searchQuery.isError && (
          <p role="alert" className="loc-note">
            Couldn&apos;t load more locations.{" "}
            <button type="button" className="loc-inline-btn" onClick={() => searchQuery.refetch()}>Retry</button>
          </p>
        )}

        {rows.length > 0 && hasMore && (
          <div className="loc-more">
            <button
              type="button"
              className="loc-btn loc-btn--secondary"
              onClick={handleLoadMore}
              disabled={isAll && searchQuery.isFetchingNextPage}
            >
              {isAll && searchQuery.isFetchingNextPage ? "Loading…" : "View more locations"}
            </button>
          </div>
        )}

        <div className="loc-cue">
          <div className="loc-cue-icon" aria-hidden="true">
            <Utensils size={20} />
          </div>
          <p className="loc-cue-title">Choose a location to continue</p>
          <p className="loc-cue-sub">Your menu will be tailored to the food court you select.</p>
          <div className="loc-cue-links">
            <span>Already have an account?</span>{" "}
            <Link to="/login">Sign in</Link>
            <span className="loc-cue-sep" aria-hidden="true">·</span>
            <Link to="/register">Create account</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function LocationCard({ location, distanceKm, onSelect }) {
  const image = locationImage(location);
  const addressLines = locationAddressLines(location);
  const name = location.name || location.title || "Food court";

  return (
    <article className="loc-card">
      <LocationImage image={image} name={name} />
      <div className="loc-card-body">
        <h3 className="loc-card-name">{name}</h3>
        {distanceKm != null && (
          <p className="loc-distance">{formatDistance(distanceKm)} away</p>
        )}
        <div className="loc-address">
          <MapPin size={16} className="loc-address-pin" aria-hidden="true" />
          <p className="loc-address-lines" style={{ margin: 0 }}>
            {addressLines.length
              ? addressLines.map((line, index) => <span key={`${index}-${line}`}>{line}</span>)
              : "Browse the menu at this food court"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(location)}
          className="loc-cta"
          aria-label={`Explore ${name}`}
        >
          Explore Food Court
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function LocationImage({ image, name }) {
  const [failed, setFailed] = useState(false);
  const [isLogo, setIsLogo] = useState(false);
  const showImage = Boolean(image) && !failed;

  return (
    <div className={`loc-media${showImage && isLogo ? " loc-media--logo" : ""}`}>
      {showImage ? (
        <img
          src={image}
          alt={`${name} food court`}
          loading="lazy"
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            setIsLogo(naturalHeight > 0 && naturalWidth / naturalHeight >= LOGO_ASPECT_RATIO);
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="loc-media-fallback" role="img" aria-label="Food court image unavailable">
          <Store size={36} strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
