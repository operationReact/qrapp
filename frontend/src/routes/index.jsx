import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { menuOptions, categoriesOptions } from "@/query/options/menu";
import Navbar from "../components/shared/Navbar";
import SearchBar from "../components/shared/SearchBar";
import CategoryTabs from "../components/CategoryTabs";
import MenuItemCard from "../components/MenuItemCard";
import PartyOrderBanner from "../components/PartyOrderBanner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { usePreferences } from "@/context/PreferencesContext";
import MobileMenu from "../components/shared/MobileMenu";
import { useLocation } from "@tanstack/react-router";
import DealsSection from "@/components/DealsSection";
import {
  Segment,
  SegmentHeader,
  SegmentLabel,
  SegmentTitle,
  SegmentDescription,
  SegmentContent,
  SegmentFooter,
  SegmentActions,
  SegmentAction,
} from "@/components/shared/segment";
import React from "react";
import CountdownTimer from "@/components/CountdownTimer";
import { FireIcon, SparkleIcon } from "@phosphor-icons/react";
import { BowlFoodIcon } from "@phosphor-icons/react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: MenuPage,
});

function MenuPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { hash } = useLocation();

  const category = decodeURIComponent(hash) || "All";

  const { preferences } = usePreferences();
  const vegFilter = preferences.segmentedFilter;

  const opts = {};
  if (vegFilter === "veg") opts.isVeg = true;
  if (vegFilter === "nonveg") opts.isVeg = false;

  const {
    data: menu,
    isLoading: loading,
    isError: offline,
    error: fetchError,
    refetch: fetchMenu,
  } = useQuery(menuOptions(opts));

  const { data: categoriesData } = useQuery(categoriesOptions);

  const categories = [...new Set((categoriesData || []).map((c) => c.name))];

  const menuItems = menu || [];
  const preOrderOnly = menuItems.filter(
    (item) => item.tag?.name === "PreOrderOnly",
  );

  // ── Pre-order window: open 08:00–21:00 local time ─────────────────────────
  const now = new Date();
  const todayHour = now.getHours() + now.getMinutes() / 60;
  const isPreOrderOpen = todayHour >= 8 && todayHour < 21;

  // Target for countdown: today 21:00 if window open, or tomorrow 08:00 if closed
  const preOrderTarget = (() => {
    const t = new Date();
    if (isPreOrderOpen) {
      t.setHours(21, 0, 0, 0);          // close tonight at 21:00
    } else {
      if (todayHour >= 21) {
        t.setDate(t.getDate() + 1);      // tomorrow
      }
      t.setHours(8, 0, 0, 0);           // opens at 08:00
    }
    return t.toISOString();
  })();
  const freshAndHealthy = menuItems.filter(
    (item) =>
      item.isVeg === true ||
      item.isVeg === "true" ||
      item.isVeg === 1 ||
      item.isVeg === "1",
  );
  const filtered = menuItems.filter((item) => {
    // Normalize possible server representations for boolean-ish isVeg
    const isVeg =
      item.isVeg === true ||
      item.isVeg === "true" ||
      item.isVeg === 1 ||
      item.isVeg === "1";
    const haystack = [
      item.name,
      item.description,
      item.category.name,
      item.tag?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (vegFilter === "veg" && !isVeg) return false;
    if (vegFilter === "nonveg" && isVeg) return false;
    if (
      searchQuery.trim() &&
      !haystack.includes(searchQuery.trim().toLowerCase())
    )
      return false;
    return true;
  });

  const groups = filtered.reduce((acc, item) => {
    if (acc[item.category.name]) {
      acc[item.category.name].push(item);
    } else {
      acc[item.category.name] = [item];
    }

    return acc;
  }, {});

  return (
    <div className="page-shell bg-background pb-mobile-nav! md:pb-[initial]!">
      <Navbar />
      <MobileMenu />
      {/* Backend offline banner (non-technical user friendly) */}
      {offline && (
        <div className="container-premium py-3">
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            Backend unreachable — frontend is using cached data. Start the
            backend to use live data.
            <div className="mt-2 overflow-x-auto rounded-xl bg-white p-2 font-mono text-xs">
              cd backend; ./gradlew bootRun (or gradle bootRun)
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => fetchMenu()}
                className="touch-button rounded-xl bg-red-500 px-3 py-2 text-sm font-medium text-white"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container-premium flex flex-col gap-4 py-3">
        <div className="flex gap-4 w-full">
          <SearchBar onSearch={setSearchQuery} />
        </div>

        <PartyOrderBanner />
        <DealsSection />
      </div>

      <div className="container-premium mt-4">
        <CategoryTabs categories={categories} active={category} />
      </div>

      <main className="container-premium py-4">
        <div className="page-stack">
          {/* HEADER */}
          <div className="space-y-2 sr-only">
            <h1 className="text-2xl font-bold sm:text-3xl">Menu</h1>
            <p className="text-gray-500 text-sm">
              Browse and order directly from your table
            </p>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {filtered.length} item{filtered.length === 1 ? "" : "s"} shown
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <p className="rounded-2xl bg-white px-4 py-5 text-sm text-gray-500 shadow-sm">
              Loading menu...
            </p>
          )}

          {/* EMPTY */}
          {!loading && filtered.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BowlFoodIcon weight="duotone" />
                </EmptyMedia>
                <EmptyTitle>No Menu Items Available</EmptyTitle>
                <EmptyDescription>
                  Remove filters to see all menu items.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {preOrderOnly.length > 0 && (
          <Segment tone="red" className="p-2">
            <SegmentHeader>
              <SegmentLabel icon={<FireIcon weight="duotone" />}>
                <SegmentTitle>Only available on pre-orders</SegmentTitle>
                <SegmentDescription>
                  {isPreOrderOpen
                    ? "Pre-order now for tomorrow. Window closes at 9 PM."
                    : "Pre-order window is closed. Opens at 8 AM tomorrow."}
                </SegmentDescription>
              </SegmentLabel>
              <SegmentActions>
                <CountdownTimer
                  targetDate={preOrderTarget}
                  label={isPreOrderOpen ? "Preorder closes in" : "Opens in"}
                  expiredLabel={isPreOrderOpen ? "Closing…" : "Opening soon"}
                />
              </SegmentActions>
            </SegmentHeader>

            {isPreOrderOpen ? (
              <SegmentContent>
                <Carousel opts={{ dragFree: true }}>
                  <CarouselContent className="-ml-2 pr-3">
                    {preOrderOnly.map((item) => (
                      <CarouselItem
                        key={item.id}
                        className="pl-2 basis-1/3 md:basis-1/4"
                      >
                        <MenuItemCard item={item} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </SegmentContent>
            ) : (
              <SegmentContent>
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <span className="text-3xl">🕘</span>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pre-orders are closed right now.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Come back after 8 AM to pre-order for tomorrow.
                  </p>
                </div>
              </SegmentContent>
            )}

          </Segment>
          )}

          <Segment tone="green" className="p-2">
            <SegmentHeader>
              <SegmentLabel icon={<SparkleIcon weight="duotone" />}>
                <SegmentTitle>Fresh & Healthy</SegmentTitle>
                <SegmentDescription>
                  Light bites, salads, and nourishing bowls.
                </SegmentDescription>
              </SegmentLabel>
              <SegmentActions>
                <SegmentAction variant="outline" size="sm">
                  View All
                </SegmentAction>
              </SegmentActions>
            </SegmentHeader>

            <SegmentContent>
              <Carousel opts={{ dragFree: true }}>
                <CarouselContent className="-ml-2 pr-3">
                  {freshAndHealthy.map((item) => (
                    <CarouselItem
                      key={item.id}
                      className="pl-2 basis-1/3 md:basis-1/4"
                    >
                      <MenuItemCard item={item} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </SegmentContent>
          </Segment>

          {/* ITEMS */}
          {Object.entries(groups).map(([category, items]) => (
            <Segment key={category} id={category}>
              <SegmentHeader>
                <SegmentLabel>
                  <SegmentTitle>{category || "Specials"}</SegmentTitle>
                </SegmentLabel>
              </SegmentHeader>

              <SegmentContent>
                <Carousel opts={{ dragFree: true }}>
                  <CarouselContent className="-ml-2 pr-3">
                    {items.map((item) => (
                      <CarouselItem
                        key={item.id}
                        className="pl-2 basis-1/3 md:basis-1/4"
                      >
                        <MenuItemCard item={item} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </SegmentContent>
            </Segment>
          ))}
        </div>
      </main>
    </div>
  );
}
