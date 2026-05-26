import { createFileRoute } from "@tanstack/react-router";
import MenuItemCard from "@/components/MenuItemCard";
import MobileMenu from "@/components/shared/MobileMenu";
import SearchBar from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { usePreferences } from "@/context/PreferencesContext";
import { menuOptions } from "@/query/options/menu";
import { RefreshCcw } from "@boxicons/react";
import { useState } from "react";
import { useQuery } from '@tanstack/react-query'
import Navbar from "@/components/shared/Navbar";

export const Route = createFileRoute("/search")({
  component: SearchPage,
});

function SearchPage() {
  const [query, setQuery] = useState("");

  const {
    preferences: { segmentedFilter: vegFilter },
  } = usePreferences();

  const opts = {};
  if (["veg", "nonveg"].includes(vegFilter)) {
    opts.isVeg = vegFilter === "veg" ? true : false;
  }

  const { data: results, isError: error, refetch: fetchMenu } = useQuery(menuOptions(opts));

  const menuItems = results || [];
  const filteredResults = menuItems.filter((menuItem) => {
    const haystack = [
      menuItem.name,
      menuItem.description,
      menuItem.category.name,
      menuItem.tag?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return query.trim() && haystack.includes(query.trim().toLowerCase());
  });

  const bestsellers = menuItems.filter(
    (item) => item.tag && item.tag.name.toLowerCase() === "bestseller",
  );

  return (
    <div className="page-shell bg-background pb-mobile-nav! md:pb-[initial]!">
      <Navbar />
      <MobileMenu />
      <div className="container-premium pt-3">
        <main className="flex flex-col">
          <div className="flex items-center gap-2">
            <SearchBar autoFocus onSearch={setQuery} />
          </div>
          <Separator className="mt-2 bg-primary-foreground" />

          {error && (
            <div className="rounded-2xl border flex justify-between items-center border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-4 w-full">
              Failed to load menu{" "}
              <Button variant="outline" size="icon" onClick={() => fetchMenu()}>
                <RefreshCcw />
              </Button>
            </div>
          )}

          {bestsellers.length > 0 && (
            <section className="mt-4">
              <h2 className="font-semibold text-slate-900 mb-2">Bestsellers</h2>
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {bestsellers.map((item) => (
                    <CarouselItem
                      key={item.id}
                      className="pl-2 md:pl-4 basis-[55%] sm:basis-1/3 lg:basis-1/4"
                    >
                      <MenuItemCard item={item} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </section>
          )}

          {query.trim() !== "" && (
            <section className="mt-4">
              <h2 className="font-medium text-zinc-700 mb-4">
                Search results for{" "}
                <span className="text-primary">"{query}"</span>
              </h2>
              {filteredResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No results found
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 mt-2">
                  {filteredResults.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
