import { useState } from "react";
import { useQuery } from '@tanstack/react-query'
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
import MobileMenu from "@/components/shared/MobileMenu";
import { useLocation } from "@tanstack/react-router";

export default function Menu() {
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();

  const category = decodeURIComponent(location.hash.slice(1)) || "All";

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
    <div className="page-shell pb-mobile-nav! md:pb-[initial]!">
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

      <div className="border-b border-b-muted">
        <div className="container-premium py-3">
          <div className="flex gap-4 w-full">
            <SearchBar onSearch={setSearchQuery} />
          </div>
        </div>
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
            <div className="flex flex-col items-center justify-center rounded-[1.75rem] bg-white py-20 text-gray-400 shadow-sm">
              <div className="text-5xl mb-3">🍽</div>
              <p className="text-lg">No items found</p>
              <p className="text-sm">Try changing filters</p>
            </div>
          )}

          {/* PARTY ORDER BANNER */}
          <PartyOrderBanner />

          {/* ITEMS */}
          {Object.entries(groups).map(([category, items]) => (
            <section
              className="premium-grid scroll-mt-4"
              key={category}
              id={category}
            >
              <h2 className="text-xl font-semibold sm:text-2xl">
                {category || "Specials"}
              </h2>
              <Carousel opts={{ dragFree: true }}>
                <CarouselContent className="pr-8">
                  {items.map((item) => (
                    <CarouselItem
                      key={item.id}
                      className="basis-1/2 sm:basis-1/3 md:basis-1/4"
                    >
                      <MenuItemCard item={item} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
