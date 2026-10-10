import { createFileRoute, Link, useLocation as useRouterLocation } from "@tanstack/react-router";
import { ArrowLeftIcon, MagnifyingGlassIcon, ShoppingCartSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { retailMenuOptions } from "@/query/options/menu";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { LocationSelector } from "@/components/LocationSelector";
import MobileMenu from "@/components/shared/MobileMenu";
import RetailProductCard from "@/components/RetailProductCard";
import { essentialsAsset } from "@/lib/essentialsAssets";

export const Route = createFileRoute("/essentials")({
  component: EssentialsPage,
});

const categoryNames = [
  ["All", "all"],
  ["Biscuits", "biscuits"],
  ["Chips", "chips"],
  ["Chocolates", "chocolates"],
  ["Drinks", "drinks"],
  ["Snacks", "snacks"],
  ["Confectionery", "confectionery"],
  ["Personal Care", "personal care"],
  ["Others", "other"],
];

const categoryFiles = {
  all: "all.png",
  biscuits: "biscuits.png",
  chips: "chips.png",
  chocolates: "chocolates.png",
  drinks: "drinks.png",
  snacks: "snacks.png",
  confectionery: "confectionery.png",
  "personal care": "personal-care.png",
  other: "others.png",
};

const categoryBannerFiles = {
  drinks: "essentials-drinks-banner.png",
  snacks: "essentials-snacks-banner.png",
  chocolates: "essentials-chocolates-banner.png",
};

function EssentialsPage() {
  const { activeLocationId } = useLocation();
  const { hash } = useRouterLocation();
  const { cart } = useCart();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const initial = hash.replace(/^#/, "");
    return categoryNames.some(([, value]) => value === initial) ? initial : "all";
  });
  const { data: products = [], isLoading } = useQuery(retailMenuOptions(activeLocationId));
  const heroImage = essentialsAsset("hero", "essentials-hero.png")
    || "/assets/essentials/essentials-product-collage.png";
  const categoryBanner = categoryBannerFiles[selectedCategory]
    ? essentialsAsset("hero", categoryBannerFiles[selectedCategory])
    : null;

  const filteredProducts = products.filter((item) => {
    const haystack = [item.name, item.barcode, item.category?.name].filter(Boolean).join(" ").toLowerCase();
    const itemCategory = (item.category?.name || "").toLowerCase();
    const categoryMatches = selectedCategory === "all"
      || itemCategory === selectedCategory
      || (selectedCategory === "drinks" && itemCategory === "packaged drinks");
    return (
      (!search.trim() || haystack.includes(search.trim().toLowerCase())) &&
      categoryMatches
    );
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 lg:max-w-7xl lg:px-2">
          <Link to="/" aria-label="Back to home" className="rounded-full p-1.5 hover:bg-muted">
            <ArrowLeftIcon className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold">Snacks &amp; More</h1>
            <LocationSelector className="max-w-[220px] text-xs" />
          </div>
          <Link to="/cart" aria-label="Open cart" className="relative rounded-full p-2 hover:bg-muted">
            <ShoppingCartSimpleIcon className="size-5" />
            {cart.length > 0 && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{cart.length}</span>}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-4 lg:max-w-7xl lg:space-y-6 lg:px-8 lg:py-5">
        <img src={heroImage} alt="Bro & Bro Snacks & More" className="block h-auto max-h-[150px] w-full rounded-2xl object-cover lg:hidden" />

        <label className="flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 shadow-sm">
          <MagnifyingGlassIcon className="size-5 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search biscuits, drinks, snacks..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>

        {categoryBanner && (
          <img
            src={categoryBanner}
            alt={`${categoryNames.find(([, value]) => value === selectedCategory)?.[0]} essentials`}
            className="block h-auto max-h-[130px] w-full rounded-2xl object-cover lg:h-[160px] lg:max-h-none"
          />
        )}

        <section className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-9 lg:gap-3">
          {categoryNames.map(([label, value]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedCategory(value)}
              className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border bg-card px-1 py-2 text-center text-xs font-semibold shadow-sm transition lg:min-h-24 ${
                selectedCategory === value ? "border-primary bg-primary/5 text-primary" : "border-transparent"
              }`}
            >
              {essentialsAsset("categories", categoryFiles[value]) && (
                <img src={essentialsAsset("categories", categoryFiles[value])} alt="" className="size-10 rounded-lg object-cover" />
              )}
              {label}
            </button>
          ))}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">Popular Picks</h2>
            <span className="text-sm font-semibold text-primary">{filteredProducts.length} items</span>
          </div>
          {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading snacks &amp; more...</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
              {filteredProducts.map((item) => <RetailProductCard key={item.id} item={item} />)}
            </div>
          )}
          {!isLoading && filteredProducts.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No snacks &amp; more found.</p>}
        </section>
      </main>
      <MobileMenu />
    </div>
  );
}
