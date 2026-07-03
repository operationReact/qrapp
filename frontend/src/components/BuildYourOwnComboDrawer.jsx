import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { buttonVariants } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useByocDiscount } from "@/hooks/useByocDiscount";
import { useQuery } from "@tanstack/react-query";
import { activeComboCampaignsOptions } from "@/query/options/combo-campaigns";
import { menuOptions } from "@/query/options/menu";
import ComboProgressBanner from "@/components/ComboProgressBanner";
import { SparkleIcon, PlusCircleIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { baseURL } from "@/services";
import { cn } from "@/lib/utils";

// ── Menu item card for the picker ─────────────────────────────────────────
function ItemPickerCard({ item, inCart, onAdd, onRemove }) {
  const imgSrc = item.imageUrl
    ? item.imageUrl.startsWith("http")
      ? item.imageUrl
      : `${baseURL}${item.imageUrl}`
    : null;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-white overflow-hidden transition-all",
        inCart && "ring-2 ring-emerald-500 border-emerald-300",
      )}
    >
      {/* Image */}
      <div className="relative h-28 bg-muted overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
            <img src="/brand/white.png" alt="" className="size-10 opacity-20 object-contain" />
          </div>
        )}
        {inCart && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
            <CheckCircleIcon weight="fill" className="size-8 text-emerald-600" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1 p-2 flex-1">
        <span className="text-[12px] font-semibold leading-tight line-clamp-2">{item.name}</span>
        <span className="text-[11px] text-muted-foreground">₹{item.price}</span>
      </div>

      {/* CTA */}
      <div className="px-2 pb-2">
        {inCart ? (
          <button
            onClick={onRemove}
            className="w-full text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-1.5 hover:bg-emerald-100 transition-colors"
          >
            ✓ Added
          </button>
        ) : (
          <button
            onClick={onAdd}
            className="w-full text-[11px] font-semibold text-white bg-emerald-500 rounded-xl py-1.5 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
          >
            <PlusCircleIcon className="size-3.5" weight="fill" />
            Add
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Drawer ────────────────────────────────────────────────────────────
export default function BuildYourOwnComboDrawer({ open, onOpenChange }) {
  const { cart, addItem, decreaseItem } = useCart();
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Active campaigns
  const { data: campaigns = [] } = useQuery(activeComboCampaignsOptions);

  // All menu items
  const { data: menuItems = [] } = useQuery(menuOptions({ available: true }));

  // BYOC discount evaluation based on current cart
  const { campaigns: evalCampaigns } = useByocDiscount(cart, open);

  // Pick the first (highest-priority) campaign to display
  const primaryCampaign = campaigns[0] ?? null;
  const primaryEval = evalCampaigns[0] ?? null;

  // Build category filter from eligibility rules (null = all)
  const eligibleCategoryIds =
    primaryCampaign?.eligibleCategoryIds?.length > 0
      ? new Set(primaryCampaign.eligibleCategoryIds)
      : null;

  const eligibleItemIds =
    primaryCampaign?.eligibleMenuItemIds?.length > 0
      ? new Set(primaryCampaign.eligibleMenuItemIds)
      : null;

  // Filter menu items to those eligible for the campaign
  const eligibleItems = menuItems.filter((item) => {
    if (!primaryCampaign) return true;
    if (!eligibleCategoryIds && !eligibleItemIds) return true;
    if (eligibleItemIds?.has(item.id)) return true;
    if (eligibleCategoryIds?.has(item.categoryId ?? item.category?.id)) return true;
    return false;
  });

  // Derive categories from eligible items
  const categories = [
    ...new Map(
      eligibleItems
        .filter((i) => i.category?.id || i.categoryId)
        .map((i) => {
          const id = i.category?.id ?? i.categoryId;
          const name = i.category?.name ?? i.categoryName ?? "Other";
          return [id, { id, name }];
        }),
    ).values(),
  ];

  const displayItems =
    selectedCategory != null
      ? eligibleItems.filter(
          (i) => (i.category?.id ?? i.categoryId) === selectedCategory,
        )
      : eligibleItems;

  const cartIds = new Set(cart.map((i) => i.id));

  const handleAdd = (item) => {
    addItem({
      id: item.id,
      name: item.name,
      price: Number(item.price ?? item.sellingPrice ?? 0),
      imageUrl: item.imageUrl,
      categoryId: item.category?.id ?? item.categoryId,
      category: item.category,
    });
  };

  const handleRemove = (item) => {
    decreaseItem({ id: item.id });
  };

  if (!primaryCampaign && campaigns.length === 0) {
    return null; // No active BYOC campaigns — don't render
  }

  const tiers = primaryCampaign?.tiers ?? [];
  const minItems = tiers[0]?.minItems ?? 2;
  const maxDiscount = tiers[tiers.length - 1]?.discountValue ?? 20;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] flex flex-col">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DrawerHeader className="shrink-0 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <SparkleIcon weight="fill" className="size-5 text-emerald-500" />
            <DrawerTitle className="text-lg font-bold">
              {primaryCampaign?.name ?? "Build Your Own Combo"}
            </DrawerTitle>
          </div>
          <DrawerDescription className="text-[13px]">
            Add {minItems}+ eligible items and save up to {maxDiscount}% on your order.
          </DrawerDescription>

          {/* Progress banner */}
          {primaryEval && (
            <div className="mt-3">
              <ComboProgressBanner campaign={primaryEval} />
            </div>
          )}

          {/* Category filter tabs */}
          {categories.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  selectedCategory == null
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                    selectedCategory === cat.id
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </DrawerHeader>

        {/* ── Item grid ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-2 [scrollbar-width:thin]">
          <div className="grid grid-cols-3 gap-3">
            {displayItems.map((item) => (
              <ItemPickerCard
                key={item.id}
                item={item}
                inCart={cartIds.has(item.id)}
                onAdd={() => handleAdd(item)}
                onRemove={() => handleRemove(item)}
              />
            ))}
            {displayItems.length === 0 && (
              <div className="col-span-3 py-8 text-center text-sm text-muted-foreground">
                No eligible items found.
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <DrawerFooter className="shrink-0 pt-2">
          <DrawerClose
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            Done
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
