import { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import MenuItemCard from "@/components/MenuItemCard";
import { cn } from "@/lib/utils";
import { baseURL } from "@/services";
import { ArrowRightIcon } from "@phosphor-icons/react";

/**
 * QuickCollections — premium quick-commerce collection strip.
 *
 * Anatomy:
 *   "Collections" label
 *   Horizontal scroll of rich gradient cards (image-preview + value prop)
 *   ↳ Active card reveals a product rail beneath the strip
 *
 * Inspired by: Zepto, Instamart, Swiggy collection shelves.
 * Priority: product discovery > marketing copy.
 */
export default function QuickCollections({ collections = [] }) {
  const visible = collections.filter((c) => c.items.length > 0);

  // null → auto default to first visible; any string → explicit user choice
  const [activeId, setActiveId] = useState(null);
  const effectiveId =
    activeId && visible.find((c) => c.id === activeId)
      ? activeId
      : visible[0]?.id ?? null;

  const active = visible.find((c) => c.id === effectiveId);

  if (!visible.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Section label ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Collections
        </span>
        {active && (
          <span className="text-[11px] font-medium text-gray-400">
            {active.items.length} items
          </span>
        )}
      </div>

      {/* ── Collection card row ───────────────────────────────────── */}
      <div className="flex gap-3 overflow-x-auto pb-0.5 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((c) => (
          <CollectionCard
            key={c.id}
            collection={c}
            isActive={c.id === effectiveId}
            onClick={() => setActiveId(c.id)}
          />
        ))}
      </div>

      {/* ── Product rail — always visible for active card ─────────── */}
      {active && <ProductRail key={active.id} collection={active} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CollectionCard
   A gradient card with overlapping product previews, value-prop
   badge, and collection name. Tap → activates the product rail.
───────────────────────────────────────────────────────────────── */
function CollectionCard({ collection, isActive, onClick }) {
  const previews = collection.items.slice(0, 3);

  return (
    <button
      onClick={onClick}
      className={cn(
        "snap-start flex-shrink-0 relative overflow-hidden rounded-2xl",
        "w-[148px] flex flex-col justify-between p-3 gap-2",
        "transition-all duration-200 select-none focus-visible:outline-none active:scale-95",
      )}
      style={{
        background: collection.gradient ?? "linear-gradient(135deg,#6366f1,#8b5cf6)",
        minHeight: "176px",
        // Active: accent ring + lifted shadow; idle: subtle shadow
        outline: isActive ? `2.5px solid ${collection.accentHex}` : "2.5px solid transparent",
        outlineOffset: "2px",
        boxShadow: isActive
          ? `0 8px 28px ${collection.accentHex}55`
          : "0 2px 10px rgba(0,0,0,0.12)",
      }}
    >
      {/* ── Value-prop pill ── */}
      <span
        className="self-start whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold leading-none"
        style={{
          background: "rgba(255,255,255,0.88)",
          color: collection.accentHex,
        }}
      >
        {collection.valueProp ?? collection.badge ?? "Explore"}
      </span>

      {/* ── Overlapping product image circles ── */}
      <ProductPreviews items={previews} />

      {/* ── Collection label + arrow ── */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-bold leading-tight text-white drop-shadow-sm">
          {collection.emoji} {collection.label}
        </span>
        <span
          className={cn(
            "flex items-center gap-0.5 text-[11px] font-semibold",
            isActive ? "text-white" : "text-white/70",
          )}
        >
          {collection.items.length} items
          <ArrowRightIcon weight="bold" className="size-3" />
        </span>
      </div>

      {/* ── Subtle noise texture overlay for depth ── */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            "radial-gradient(ellipse at 20% 110%, rgba(255,255,255,0.08) 0%, transparent 60%)",
        }}
      />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ProductPreviews
   Three overlapping circular item thumbnails — like avatar stacks.
───────────────────────────────────────────────────────────────── */
function ProductPreviews({ items }) {
  if (!items.length) return null;

  const fallbackEmojis = ["🍛", "🥗", "🍱"];

  return (
    <div className="flex items-center justify-center py-1">
      <div className="flex">
        {items.map((item, i) => {
          const raw = item.imageUrl;
          const src = raw
            ? raw.startsWith("http")
              ? raw
              : `${baseURL}${raw}`
            : null;

          return (
            <div
              key={item.id}
              className="size-11 rounded-full border-[2.5px] border-white/60 overflow-hidden bg-white/20 flex-shrink-0 shadow-sm"
              style={{
                marginLeft: i > 0 ? "-10px" : "0",
                zIndex: items.length - i,
                position: "relative",
              }}
            >
              {src ? (
                <img
                  src={src}
                  alt=""
                  aria-hidden
                  className="size-full object-cover"
                  // If image fails, the div background colour shows through
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="size-full flex items-center justify-center text-[18px]">
                  {fallbackEmojis[i] ?? "🍽️"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ProductRail
   Compact header + dragFree product carousel shown below the strip.
───────────────────────────────────────────────────────────────── */
function ProductRail({ collection }) {
  return (
    <div
      className="flex flex-col gap-2 rounded-2xl p-3"
      style={{
        background: "#FAFAFA",
        border: "1px solid rgba(0,0,0,0.06)",
        borderLeft: `3px solid ${collection.accentHex}`,
      }}
    >
      {/* Mini header */}
      <div className="flex items-center gap-2">
        <span className="text-sm leading-none flex-shrink-0">
          {collection.emoji}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0">
          <span className="truncate text-[13px] font-bold leading-snug text-gray-900">
            {collection.title}
          </span>
          {collection.subtitle && (
            <span className="truncate text-[11px] font-medium leading-none text-gray-400">
              {collection.subtitle}
            </span>
          )}
        </div>

        {/* Right slot: countdown timer > badge */}
        {collection.action ? (
          <div className="flex-shrink-0">{collection.action}</div>
        ) : collection.badge ? (
          <span
            className="flex-shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none"
            style={{
              background: collection.badgeBg ?? "rgba(0,0,0,0.06)",
              color: collection.badgeColor ?? "#6B7280",
              border: `1px solid ${collection.badgeBorder ?? "rgba(0,0,0,0.10)"}`,
            }}
          >
            {collection.badge}
          </span>
        ) : null}
      </div>

      {/* Products */}
      <Carousel opts={{ dragFree: true }}>
        <CarouselContent className="-ml-2 pr-3">
          {collection.items.map((item) => (
            <CarouselItem
              key={item.id}
              className="pl-2 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6"
            >
              <MenuItemCard item={item} {...(collection.itemProps ?? {})} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
