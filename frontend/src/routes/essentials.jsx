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
import { getCategories } from "@/services/category-service";
import { getCatalogProducts } from "@/services/mrp-product-service";

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
  const catalogQuery = useQuery({
    queryKey: ["public-mrp-products", activeLocationId],
    queryFn: () => getCatalogProducts(activeLocationId),
    enabled: Boolean(activeLocationId),
    staleTime: 1000 * 15,
    refetchOnWindowFocus: true,
  });
  const categoriesQuery = useQuery({
    queryKey: ["essentials-categories", activeLocationId],
    queryFn: () => getCategories(activeLocationId),
    enabled: Boolean(activeLocationId),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });
  const legacyMenuQuery = useQuery(retailMenuOptions(activeLocationId));
  const products = catalogQuery.data?.length
    ? catalogQuery.data.map((product) => ({
        ...product,
        price: product.sellingPrice ?? product.mrp,
        available: product.available !== false,
        category: { name: product.categoryName || "Uncategorized" },
        stockStatus: product.availableQuantity == null
            ? "IN_STOCK"
            : product.availableQuantity <= 0
                ? "OUT_OF_STOCK"
                : product.availableQuantity <= (product.lowStockThreshold ?? 0)
                    ? "LOW_STOCK"
                    : "IN_STOCK",
      }))
      : legacyMenuQuery.data || [];
  const isLoading = catalogQuery.isLoading || (!catalogQuery.data && legacyMenuQuery.isLoading);
  const catalogueProducts = catalogQuery.data || [];
  const dynamicCategoryNames = Array.from(new Set(
      catalogueProducts.map((product) => product.categoryName?.trim()).filter(Boolean),
  )).filter((name) => !categoryNames.some(([, value]) => value === name.toLowerCase()));
  const adminCategories = categoriesQuery.data || [];
  const productCategoryKeys = new Set(
      catalogueProducts.map((product) => product.categoryName?.trim().toLowerCase()).filter(Boolean),
  );
  const adminCategoryNames = adminCategories
      .map((category) => category.name?.trim())
      .filter(Boolean)
      .filter((name) => productCategoryKeys.has(name.toLowerCase()))
      .filter((name) => !categoryNames.some(([, value]) => value === name.toLowerCase()));
  const visibleCategoryNames = [
    ...categoryNames,
    ...adminCategoryNames.map((name) => [name, name.toLowerCase()]),
    ...dynamicCategoryNames.map((name) => [name, name.toLowerCase()]),
  ];
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
      <div className="min-h-screen bg-background pb-32">
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

        <main className="mx-auto max-w-5xl space-y-4 px-3 py-3 lg:max-w-7xl lg:space-y-6 lg:px-8 lg:py-5">
          <label className="flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 shadow-sm">
            <MagnifyingGlassIcon className="size-5 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search biscuits, drinks, snacks..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>

          {categoryBanner && (
              <img
                  src={categoryBanner}
                  alt={`${visibleCategoryNames.find(([, value]) => value === selectedCategory)?.[0]} essentials`}
                  className="block h-auto max-h-[130px] w-full rounded-2xl bg-[#fff7f1] object-contain lg:h-[160px] lg:max-h-none"
              />
          )}

          <section aria-label="Shop by category" className="rounded-2xl border border-border/70 bg-card/80 p-1.5 shadow-[0_8px_24px_rgba(30,20,15,0.06)]">
            <div className="no-scrollbar flex gap-1 overflow-x-auto">
              {visibleCategoryNames.map(([label, value]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selectedCategory === value}
                  onClick={() => setSelectedCategory(value)}
                  className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-semibold transition ${
                    selectedCategory === value
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold sm:text-xl">Popular Picks</h2>
              <span className="text-xs font-semibold text-primary sm:text-sm">{filteredProducts.length} items</span>
            </div>
            {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading snacks &amp; more...</p> : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 lg:gap-4">
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
