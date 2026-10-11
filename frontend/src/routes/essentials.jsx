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
import { baseURL } from "@/services";
import { getCategories } from "@/services/category-service";
import { getCatalogProducts } from "@/services/product-catalog-service";

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
  const catalogQuery = useQuery({
    queryKey: ["public-product-catalog", activeLocationId],
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
  const adminCategoryImages = new Map(
    adminCategories
      .filter((category) => category.name && category.imageUrl && productCategoryKeys.has(category.name.trim().toLowerCase()))
      .map((category) => [
        category.name.trim().toLowerCase(),
        category.imageUrl.startsWith("http") ? category.imageUrl : `${baseURL}${category.imageUrl}`,
      ]),
  );
  const heroImage = essentialsAsset("hero", "essentials-basket.png")
    || "/assets/essentials/hero/essentials-basket.png";
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
        <div className="relative isolate flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-[#efbda9] bg-[radial-gradient(circle_at_50%_45%,#fff8d8_0%,#ffe7d7_34%,transparent_65%),linear-gradient(135deg,#fff5eb_0%,#ffd5c4_52%,#f6b7a7_100%)] px-3 py-2 shadow-[0_16px_36px_rgba(143,70,42,0.16)] lg:hidden">
          <span className="essentials-halo absolute left-1/2 top-1/2 size-[170px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff8d2]/75 blur-2xl" aria-hidden="true" />
          <span className="essentials-orbit essentials-orbit-one absolute left-1/2 top-1/2 z-0 h-[145px] w-[290px] -translate-x-1/2 -translate-y-1/2 rounded-[50%]" aria-hidden="true" />
          <span className="essentials-orbit essentials-orbit-two absolute left-1/2 top-1/2 z-0 h-[175px] w-[335px] -translate-x-1/2 -translate-y-1/2 rounded-[50%]" aria-hidden="true" />
          <span className="essentials-blob essentials-blob-coral absolute -left-10 bottom-[-45px] z-0 size-36 rounded-full blur-sm" aria-hidden="true" />
          <span className="essentials-blob essentials-blob-gold absolute -right-8 top-[-35px] z-0 size-32 rounded-full blur-sm" aria-hidden="true" />
          <span className="essentials-blob essentials-blob-pink absolute right-[18%] bottom-[-35px] z-0 size-24 rounded-full blur-md" aria-hidden="true" />
          <span className="essentials-spark essentials-spark-one absolute left-[15%] top-[18%] z-0 size-3 rounded-full" aria-hidden="true" />
          <span className="essentials-spark essentials-spark-two absolute right-[14%] bottom-[18%] z-0 size-2 rounded-full" aria-hidden="true" />
          <span className="essentials-spark essentials-spark-three absolute right-[25%] top-[15%] z-0 size-1.5 rounded-full" aria-hidden="true" />
          <span className="essentials-glow absolute -right-8 -top-8 size-24 rounded-full bg-[#ffd0bd]/60 blur-xl" aria-hidden="true" />
          <span className="essentials-glow essentials-glow-delay absolute -bottom-10 -left-6 size-28 rounded-full bg-[#ffe39a]/50 blur-xl" aria-hidden="true" />
          <span className="essentials-shimmer pointer-events-none absolute inset-y-0 -left-1/2 z-20 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/45 to-transparent" aria-hidden="true" />
          <img
            src={heroImage}
            alt="Bro & Bro Snacks & More"
            className="essentials-breathe relative z-10 block h-auto max-h-[160px] w-full object-contain drop-shadow-[0_12px_12px_rgba(104,51,24,0.16)]"
          />
        </div>

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

        <section className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-9 lg:gap-3">
          {visibleCategoryNames.map(([label, value]) => {
            const categoryImage = adminCategoryImages.get(value)
              || essentialsAsset("categories", categoryFiles[value]);
            return (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedCategory(value)}
              className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border bg-card px-1 py-2 text-center text-xs font-semibold shadow-sm transition lg:min-h-24 ${
                selectedCategory === value ? "border-primary bg-primary/5 text-primary" : "border-transparent"
              }`}
            >
              {categoryImage && (
                <img src={categoryImage} alt="" className="size-10 rounded-lg object-cover" />
              )}
              {label}
            </button>
            );
          })}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">Popular Picks</h2>
            <span className="text-sm font-semibold text-primary">{filteredProducts.length} items</span>
          </div>
          {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading snacks &amp; more...</p> : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 lg:gap-4">
              {filteredProducts.map((item) => <RetailProductCard key={item.id} item={item} />)}
            </div>
          )}
          {!isLoading && filteredProducts.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No snacks &amp; more found.</p>}
        </section>
      </main>
      <style>{`
        @keyframes essentials-breathe {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.06); }
        }
        @keyframes essentials-shimmer {
        0% { transform: translateX(0) skewX(-18deg); opacity: 0; }
        15%, 70% { opacity: 1; }
        100% { transform: translateX(430%) skewX(-18deg); opacity: 0; }
        }
        @keyframes essentials-glow {
        0%, 100% { transform: scale(0.92); opacity: 0.55; }
        50% { transform: scale(1.08); opacity: 0.9; }
        }
        @media (prefers-reduced-motion: reduce) {
        .essentials-breathe,
        .essentials-shimmer,
        .essentials-glow,
        .essentials-halo,
        .essentials-orbit,
        .essentials-blob,
        .essentials-spark { animation: none !important; }
        }
        .essentials-breathe { animation: essentials-breathe 1.8s ease-in-out infinite; }
        .essentials-shimmer { animation: essentials-shimmer 5.5s ease-in-out infinite; }
        .essentials-glow { animation: essentials-glow 3.2s ease-in-out infinite; }
        .essentials-glow-delay { animation-delay: 1.4s; }
        .essentials-halo { animation: essentials-halo 2.6s ease-in-out infinite; }
        .essentials-orbit { border: 2px solid transparent; background: linear-gradient(#0000,#0000) padding-box, conic-gradient(from 0deg, #ef6b57, #ffd34e, #e96ac4, #7bc7e8, #ef6b57) border-box; opacity: .82; }
        .essentials-orbit-one { transform: translate(-50%, -50%) rotate(-10deg); animation: essentials-orbit-one 7s linear infinite; }
        .essentials-orbit-two { transform: translate(-50%, -50%) rotate(10deg); animation: essentials-orbit-two 10s linear infinite reverse; opacity: .58; }
        .essentials-blob { animation: essentials-blob 4s ease-in-out infinite; }
        .essentials-blob-coral { background: #ef6b57; opacity: .34; }
        .essentials-blob-gold { background: #ffcf55; opacity: .46; animation-delay: -1.2s; }
        .essentials-blob-pink { background: #e96ac4; opacity: .28; animation-delay: -2.3s; }
        .essentials-spark { background: #fff; box-shadow: 0 0 0 7px rgb(255 255 255 / 24%), 0 0 18px 5px rgb(255 244 177 / 80%); animation: essentials-spark 2.2s ease-in-out infinite; }
        .essentials-spark-two { background: #fff3b0; animation-delay: -.7s; }
        .essentials-spark-three { animation-delay: -1.4s; }
        @keyframes essentials-orbit-one { to { transform: translate(-50%, -50%) rotate(350deg); } }
        @keyframes essentials-orbit-two { to { transform: translate(-50%, -50%) rotate(-350deg); } }
        @keyframes essentials-blob { 0%, 100% { transform: scale(.86) translate(0, 0); } 50% { transform: scale(1.18) translate(8px, -8px); } }
        @keyframes essentials-spark { 0%, 100% { opacity: .35; transform: scale(.7); } 50% { opacity: 1; transform: scale(1.35); } }
        @keyframes essentials-halo {
          0%, 100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.65; }
          50% { transform: translate(-50%, -50%) scale(1.12); opacity: 0.95; }
        }
      `}</style>
      <MobileMenu />
    </div>
  );
}
