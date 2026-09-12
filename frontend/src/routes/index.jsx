import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { menuOptions, categoriesOptions } from "@/query/options/menu";
import Navbar from "../components/shared/Navbar";
import SearchBar from "../components/shared/SearchBar";
import CategoryTabs from "../components/CategoryTabs";
import MenuItemCard from "../components/MenuItemCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { usePreferences } from "@/context/PreferencesContext";
import MobileMenu from "../components/shared/MobileMenu";
import { useLocation } from "@tanstack/react-router";
import DealsSection from "@/components/DealsSection";
import React from "react";
import { BowlFoodIcon } from "@phosphor-icons/react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { buildPageHead, buildWebSiteSchema } from "@/content/companyInfo";


export const Route = createFileRoute("/")({
  head: () =>
    buildPageHead({
      title: "BRO & BRO Food Court",
      description:
        "BRO & BRO Food Court is a technology-enabled food destination for corporate communities.",
      path: "/",
      breadcrumbs: [{ name: "Home", path: "/" }],
      schemas: [buildWebSiteSchema()],
    }),
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
    refetch: fetchMenu,
  } = useQuery(menuOptions(opts));

  const { data: categoriesData } = useQuery(categoriesOptions);

  const categories = [...new Set((categoriesData || []).map((c) => c.name))];

  const menuItems = menu || [];

  const getCategoryName = (item) => item.category?.name || "";
  const getTagName = (item) => item.tag?.name || "";


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
      getCategoryName(item),
      getTagName(item),
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
    const categoryName = getCategoryName(item) || "Specials";
    if (acc[categoryName]) {
      acc[categoryName].push(item);
    } else {
      acc[categoryName] = [item];
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
                className="touch-button rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container-premium flex flex-col gap-2.5 py-2">
        <div className="flex gap-3 w-full">
          <SearchBar onSearch={setSearchQuery} />
        </div>

        <DealsSection />
      </div>

      <div className="container-premium mt-2">
        <CategoryTabs categories={categories} active={category} />
      </div>

      <main className="container-premium py-2.5 md:py-4 lg:py-5">
        <div className="page-stack gap-2!">
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


          {/* CATEGORY ROWS — compact header + carousel */}
          {Object.entries(groups).map(([catName, items]) => (
            <section
              key={catName}
              id={encodeURIComponent(catName)}
              className="flex flex-col gap-2 scroll-mt-4 rounded-lg py-2"
            >
              {/* Compact single-line category header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <h2 className="truncate text-md font-bold leading-snug">
                    {catName}
                  </h2>
                  <span className="shrink-0 text-xs text-zinc-600">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                </div>
              </div>

              {/* Products */}
              {items.length === 1 ? (
                // Single item — expand to a wider featured card, no empty space
                <div className="w-full max-w-xs sm:max-w-sm md:max-w-[220px] lg:max-w-[200px]">
                  <MenuItemCard item={items[0]} />
                </div>
              ) : (
                <Carousel opts={{ dragFree: true }}>
                  <CarouselContent className="-ml-2 pr-3">
                    {items.map((item) => (
                      <CarouselItem
                        key={item.id}
                        className="pl-2 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6"
                      >
                        <MenuItemCard item={item} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
