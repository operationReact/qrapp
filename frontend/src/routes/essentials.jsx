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
          <div className="essentials-hero relative isolate flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-[#efbda9] bg-[radial-gradient(ellipse_at_50%_48%,#fffdf1_0%,#fff0df_34%,#ffd8ce_68%,#f8c1b4_100%)] px-1 py-1 shadow-[0_16px_36px_rgba(143,70,42,0.16)] lg:hidden">
            {/* Ambient light and depth layers */}
            <span className="essentials-halo absolute left-1/2 top-1/2 z-0 size-[190px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff8d2]/80 blur-2xl" aria-hidden="true" />
            <span className="essentials-glow absolute -right-8 -top-8 z-0 size-28 rounded-full bg-[#ffd0bd]/70 blur-xl" aria-hidden="true" />
            <span className="essentials-glow essentials-glow-delay absolute -bottom-10 -left-6 z-0 size-32 rounded-full bg-[#ffe39a]/65 blur-xl" aria-hidden="true" />
            <span className="essentials-blob essentials-blob-coral absolute -left-8 bottom-[-38px] z-0 size-32 rounded-full blur-sm" aria-hidden="true" />
            <span className="essentials-blob essentials-blob-gold absolute -right-7 top-[-34px] z-0 size-28 rounded-full blur-sm" aria-hidden="true" />
            <span className="essentials-blob essentials-blob-pink absolute right-[16%] bottom-[-42px] z-0 size-24 rounded-full blur-md" aria-hidden="true" />

            {/* Fine orbit rings stay behind the basket */}
            <span className="essentials-orbit essentials-orbit-one absolute left-1/2 top-1/2 z-0 h-[174px] w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-[50%]" aria-hidden="true" />
            <span className="essentials-orbit essentials-orbit-two absolute left-1/2 top-1/2 z-0 h-[204px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-[50%]" aria-hidden="true" />
            <span className="essentials-platform absolute bottom-[10px] left-1/2 z-[1] h-3 w-[42%] -translate-x-1/2 rounded-[50%]" aria-hidden="true" />

            {/* Local product art floats around the basket without covering it. */}
            <img src="/assets/essentials/products/lays.png.png" alt="" className="essentials-snack essentials-snack-one absolute left-[7%] top-[18%] z-[8]" aria-hidden="true" />
            <img src="/assets/essentials/products/kitkat.png.png" alt="" className="essentials-snack essentials-snack-two absolute left-[15%] bottom-[12%] z-[8]" aria-hidden="true" />
            <img src="/assets/essentials/products/oreo.png.png" alt="" className="essentials-snack essentials-snack-three absolute left-[28%] top-[7%] z-[8]" aria-hidden="true" />
            <img src="/assets/essentials/products/coca-cola.png.png" alt="" className="essentials-snack essentials-snack-four absolute right-[7%] top-[15%] z-[8]" aria-hidden="true" />
            <img src="/assets/essentials/products/thums-up.png.png" alt="" className="essentials-snack essentials-snack-five absolute right-[16%] bottom-[11%] z-[8]" aria-hidden="true" />
            <img src="/assets/essentials/products/lays.png.png" alt="" className="essentials-snack essentials-snack-six absolute right-[29%] top-[6%] z-[8]" aria-hidden="true" />
            <img src="/assets/essentials/products/oreo.png.png" alt="" className="essentials-snack essentials-snack-seven absolute left-[25%] bottom-[7%] z-[8]" aria-hidden="true" />
            <img src="/assets/essentials/products/kitkat.png.png" alt="" className="essentials-snack essentials-snack-eight absolute right-[25%] bottom-[6%] z-[8]" aria-hidden="true" />

            {/* Small glints add sparkle, not visual noise */}
            <span className="essentials-spark essentials-spark-one absolute left-[12%] top-[47%] z-20 size-2 rounded-full" aria-hidden="true" />
            <span className="essentials-spark essentials-spark-two absolute right-[12%] top-[48%] z-20 size-2 rounded-full" aria-hidden="true" />
            <span className="essentials-spark essentials-spark-three absolute right-[25%] top-[12%] z-20 size-1.5 rounded-full" aria-hidden="true" />
            <span className="essentials-shimmer pointer-events-none absolute inset-y-0 -left-1/2 z-30 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/45 to-transparent" aria-hidden="true" />

            <img
                src={heroImage}
                alt="Bro & Bro Snacks & More"
                className="essentials-breathe relative z-20 block h-auto max-h-[175px] w-full max-w-[390px] object-contain drop-shadow-[0_16px_16px_rgba(104,51,24,0.24)]"
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

          <section className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible md:grid-cols-9 lg:gap-3">
            {visibleCategoryNames.map(([label, value]) => {
              const categoryImage = adminCategoryImages.get(value)
                  || essentialsAsset("categories", categoryFiles[value]);
              return (
                  <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedCategory(value)}
                      className={`flex h-[68px] min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border bg-card px-1 py-1.5 text-center text-[10px] font-semibold shadow-sm transition sm:h-auto sm:min-w-0 sm:gap-2 sm:px-1 sm:py-2 sm:text-xs lg:min-h-24 ${
                          selectedCategory === value ? "border-primary bg-primary/5 text-primary" : "border-transparent"
                      }`}
                  >
                    {categoryImage && (
                        <img src={categoryImage} alt="" className="size-7 rounded-md object-cover sm:size-10 sm:rounded-lg" />
                    )}
                    {label}
                  </button>
              );
            })}
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
        <style>{`
        @keyframes essentials-breathe {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.025); }
        }
        @keyframes essentials-shimmer {
          0%, 12% { transform: translateX(0) skewX(-18deg); opacity: 0; }
          22%, 42% { opacity: .8; }
          58%, 100% { transform: translateX(430%) skewX(-18deg); opacity: 0; }
        }
        @keyframes essentials-glow {
          0%, 100% { transform: scale(.92); opacity: .52; }
          50% { transform: scale(1.1); opacity: .9; }
        }
        @keyframes essentials-halo {
          0%, 100% { transform: translate(-50%, -50%) scale(.88); opacity: .62; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: .96; }
        }
        @keyframes essentials-orbit-one { to { transform: translate(-50%, -50%) rotate(350deg); } }
        @keyframes essentials-orbit-two { to { transform: translate(-50%, -50%) rotate(-350deg); } }
        @keyframes essentials-blob {
          0%, 100% { transform: scale(.88) translate3d(0, 0, 0); }
          50% { transform: scale(1.12) translate3d(7px, -7px, 0); }
        }
        @keyframes essentials-spark {
          0%, 100% { opacity: .3; transform: scale(.7); }
          50% { opacity: 1; transform: scale(1.35); }
        }
        @keyframes essentials-snack-float {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-7deg); }
          50% { transform: translate3d(3px, -10px, 0) rotate(7deg); }
        }
        @keyframes essentials-snack-drift {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(6deg) scale(1); }
          50% { transform: translate3d(-4px, -7px, 0) rotate(-8deg) scale(1.06); }
        }
        @keyframes essentials-platform {
          0%, 100% { opacity: .35; transform: translateX(-50%) scaleX(.8); }
          50% { opacity: .9; transform: translateX(-50%) scaleX(1.08); }
        }
        .essentials-breathe { animation: essentials-breathe 3.2s ease-in-out infinite; }
        .essentials-shimmer { animation: essentials-shimmer 7s ease-in-out infinite; }
        .essentials-glow { animation: essentials-glow 4s ease-in-out infinite; }
        .essentials-glow-delay { animation-delay: -2s; }
        .essentials-halo { animation: essentials-halo 3.4s ease-in-out infinite; }
        .essentials-orbit {
          border: 1px solid transparent;
          background: linear-gradient(#0000, #0000) padding-box,
            conic-gradient(from 0deg, #ef6b57, #ffd34e, #e96ac4, #7bc7e8, #ef6b57) border-box;
          opacity: .78;
          box-shadow: 0 0 14px rgb(239 107 87 / 24%);
        }
        .essentials-orbit-one { animation: essentials-orbit-one 9s linear infinite; }
        .essentials-orbit-two { animation: essentials-orbit-two 12s linear infinite reverse; opacity: .52; }
        .essentials-blob { animation: essentials-blob 6s ease-in-out infinite; }
        .essentials-blob-coral { background: #ef6b57; opacity: .27; }
        .essentials-blob-gold { background: #ffcf55; opacity: .36; animation-delay: -2s; }
        .essentials-blob-pink { background: #e96ac4; opacity: .22; animation-delay: -3.5s; }
        .essentials-spark {
          background: #fff;
          box-shadow: 0 0 0 5px rgb(255 255 255 / 22%), 0 0 15px 4px rgb(255 244 177 / 78%);
          animation: essentials-spark 2.8s ease-in-out infinite;
        }
        .essentials-spark-two { background: #fff3b0; animation-delay: -.9s; }
        .essentials-spark-three { animation-delay: -1.8s; }
        .essentials-snack {
          width: clamp(28px, 8vw, 42px);
          height: clamp(34px, 12vw, 58px);
          object-fit: contain;
          filter: drop-shadow(0 5px 5px rgb(104 51 24 / 22%)) saturate(1.08);
          pointer-events: none;
          animation: essentials-snack-float 4.2s ease-in-out infinite;
          will-change: transform;
        }
        .essentials-snack-two { animation-name: essentials-snack-drift; animation-duration: 4.8s; animation-delay: -.8s; }
        .essentials-snack-three { animation-duration: 5.1s; animation-delay: -1.4s; }
        .essentials-snack-four { animation-name: essentials-snack-drift; animation-duration: 3.8s; animation-delay: -2s; }
        .essentials-snack-five { animation-duration: 3.6s; animation-delay: -.5s; }
        .essentials-snack-six { animation-name: essentials-snack-drift; animation-duration: 4.4s; animation-delay: -2.5s; }
        .essentials-snack-seven { animation-duration: 4s; animation-delay: -1.1s; }
        .essentials-snack-eight { animation-name: essentials-snack-drift; animation-duration: 5.4s; animation-delay: -2.8s; }
        .essentials-platform {
          background: radial-gradient(ellipse, rgb(255 215 91 / 75%), rgb(239 107 87 / 15%) 65%, transparent 72%);
          filter: blur(1px);
          animation: essentials-platform 3.6s ease-in-out infinite;
        }
        @media (max-width: 360px) {
          .essentials-snack { width: 24px; height: 36px; }
          .essentials-orbit-one { width: 250px; }
          .essentials-orbit-two { width: 280px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .essentials-breathe, .essentials-shimmer, .essentials-glow,
          .essentials-halo, .essentials-orbit, .essentials-blob,
          .essentials-spark, .essentials-snack, .essentials-platform { animation: none !important; }
        }
      `}</style>
        <MobileMenu />
      </div>
  );
}
