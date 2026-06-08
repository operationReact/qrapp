import {
  createFileRoute,
  Navigate,
  useLocation,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateMenuItem, deleteMenuItem, getDeletedMenuItems, restoreMenuItem } from "@/services/menu-service";
import { menuOptions } from "@/query/options/menu";
import { useAuth } from "@/context/AuthContext";
import AdminMenuItem from "@/components/admin/AdminMenuItem";
import MenuItemEditModal from "@/components/MenuItemEditModal";
import { Button } from "@/components/ui/button";
import AdminMenuFilters from "@/components/admin/AdminMenuFilters";
import BulkMenuUploadModal from "@/components/admin/BulkMenuUploadModal";
import BulkCostEditSheet from "@/components/admin/BulkCostEditSheet";
import SummaryMetrics from "@/components/admin/SummaryMetrics";
import CategoriesScroll from "@/components/admin/CategoriesScroll";
import CategoriesManageModal from "@/components/admin/CategoriesManageModal";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  ArrowLeftIcon,
  ArrowCounterClockwiseIcon,
  BowlFoodIcon,
  FunnelIcon,
  LegoIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
  UploadIcon,
  WarningCircleIcon,
  CurrencyInrIcon,
} from "@phosphor-icons/react";
import { ButtonGroup } from "@/components/ui/button-group";

export const Route = createFileRoute("/admin/(menu)/menu")({
  component: function AdminMenuPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const search = useSearch({ strict: false });
    const { isAdmin, isSuperUser } = useAuth();

    const initialAvailability = (() => {
      if (search.availability === "available") return "AVAILABLE";
      if (search.availability === "unavailable") return "UNAVAILABLE";
      if (search.available === "true") return "AVAILABLE";
      return "ALL";
    })();

    const [quickFilter, setQuickFilter] = useState(initialAvailability);
    const [searchInput, setSearchInput] = useState(() => search.q || "");
    const [searchQuery, setSearchQuery] = useState(() => search.q || "");
    const [activeCategoryId, setActiveCategoryId] = useState(
      () => search.activeCategory || "ALL",
    );
    const [selectedTags, setSelectedTags] = useState(
      () => search.tags?.split(",").filter(Boolean) || [],
    );
    const [filters, setFilters] = useState({
      showRecommended: search.recommended === "true",
      isVeg: search.veg === "true" ? true : null,
    });
    const queryClient = useQueryClient();
    const [editingItem, setEditingItem] = useState(null);
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
    const [bulkCostOpen, setBulkCostOpen] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
    const [trashOpen, setTrashOpen] = useState(false);
    const trashRef = useRef(null);

    const { data: menu = [], isLoading: loadingMenu } = useQuery(menuOptions());

    const { data: deletedItems = [], isLoading: loadingDeleted, isFetching: fetchingDeleted } = useQuery({
      queryKey: ["menu-deleted"],
      queryFn:  getDeletedMenuItems,
      staleTime: 30_000,
    });

    const restoreMutation = useMutation({
      mutationFn: (id) => restoreMenuItem(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["menu"] });
        queryClient.invalidateQueries({ queryKey: ["menu-deleted"] });
        toast.success("Item restored successfully");
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || err?.message || "Failed to restore item");
      },
    });

    useEffect(() => {
      const t = setTimeout(() => setSearchQuery(searchInput), 300);
      return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
      const params = {};
      if (searchQuery) params.q = searchQuery;
      if (activeCategoryId && activeCategoryId !== "ALL")
        params.activeCategory = activeCategoryId;
      if (selectedTags.length) params.tags = selectedTags.join(",");
      if (filters.showRecommended) params.recommended = "true";
      if (filters.isVeg === true) params.veg = "true";
      if (quickFilter === "AVAILABLE") params.availability = "available";
      if (quickFilter === "UNAVAILABLE") params.availability = "unavailable";
      navigate({ search: params, replace: true });
    }, [
      searchQuery,
      activeCategoryId,
      selectedTags,
      filters,
      quickFilter,
      navigate,
    ]);

    const allCategories = useMemo(
      () =>
        [
          ...new Set(menu.map((item) => item.category?.name).filter(Boolean)),
        ].sort(),
      [menu],
    );

    const allTags = useMemo(
      () =>
        [...new Set(menu.map((item) => item.tag?.name).filter(Boolean))].sort(),
      [menu],
    );

    const totalItems = menu.length;
    const availableCount = useMemo(
      () => menu.filter((m) => m.available).length,
      [menu],
    );

    // Profitability coverage
    const activeItemCount = availableCount;
    const activeWithCost  = useMemo(
      () => menu.filter((m) => m.available && m.estimatedCost != null).length,
      [menu],
    );
    const coveragePct = activeItemCount > 0
      ? Math.round((activeWithCost / activeItemCount) * 100)
      : 100;
    const missingCostCount = activeItemCount - activeWithCost;

    const categoryCounts = useMemo(() => {
      const counts = { ALL: totalItems };
      for (const item of menu) {
        const name = item.category?.name;
        if (!name) continue;
        counts[name] = (counts[name] ?? 0) + 1;
      }
      return counts;
    }, [menu, totalItems]);

    const toggleMutation = useMutation({
      mutationFn: ({ id, data }) => updateMenuItem(id, data),
      onError: (err) => {
        console.error(err);
        alert(err?.response?.data || "Failed to update menu item");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["menu"] });
      },
    });

    const deleteMutation = useMutation({
      mutationFn: (id) => deleteMenuItem(id),
      onError: (err) => {
        console.error(err);
        alert(
          err?.response?.data || err?.message || "Failed to delete menu item",
        );
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["menu"] });
        queryClient.invalidateQueries({ queryKey: ["menu-deleted"] });
      },
    });

    const handleEditSuccess = () => {
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["menu"] });
    };

    const handleDeleteConfirm = (item) => {
      if (
        !window.confirm(
          `Delete "${item.name}"? It will be removed from the menu.`,
        )
      ) {
        return;
      }
      deleteMutation.mutate(item.id);
    };

    const handleToggleAvailable = (id, nextAvailable) => {
      toggleMutation.mutate({ id, data: { available: nextAvailable } });
    };

    const handleToggleRecommended = (id, nextRecommended) => {
      toggleMutation.mutate({ id, data: { recommended: nextRecommended } });
    };

    const handleClearAll = () => {
      setSearchInput("");
      setSearchQuery("");
      setActiveCategoryId("ALL");
      setSelectedTags([]);
      setFilters({ showRecommended: false, isVeg: null });
      setQuickFilter("ALL");
      navigate({ search: {}, replace: true });
    };

    const selectedCategories = useMemo(
      () => (activeCategoryId === "ALL" ? [] : [activeCategoryId]),
      [activeCategoryId],
    );

    const filteredItems = menu.filter((item) => {
      const haystack = [item.name, item.description, item.category, item.tag]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (
        searchQuery.trim() &&
        !haystack.includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }

      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(item.category?.name)
      ) {
        return false;
      }

      if (selectedTags.length > 0 && !selectedTags.includes(item.tag?.name)) {
        return false;
      }

      if (filters.showRecommended && !item.recommended) {
        return false;
      }

      if (filters.isVeg !== null) {
        const itemIsVeg =
          item.isVeg === true ||
          item.isVeg === "true" ||
          item.isVeg === 1 ||
          item.isVeg === "1";
        if (itemIsVeg !== filters.isVeg) {
          return false;
        }
      }

      // MISSING_COST quick-filter
      if (quickFilter === "MISSING_COST") {
        return item.available && item.estimatedCost == null;
      }

      if (quickFilter === "AVAILABLE"   && !item.available) return false;
      if (quickFilter === "UNAVAILABLE" &&  item.available) return false;

      return true;
    });

    const activeFilterCount = useMemo(() => {
      let count = 0;
      if (selectedTags.length > 0) count += selectedTags.length;
      if (filters.showRecommended) count += 1;
      if (filters.isVeg === true) count += 1;
      return count;
    }, [selectedTags, filters]);

    if (!isAdmin && !isSuperUser) {
      return (
        <Navigate to={"/login"} replace state={{ from: location.pathname }} />
      );
    }

    const summaryItems = [
      {
        label: "Total Items",
        value: totalItems,
        icon: BowlFoodIcon,
        tone: "red",
      },
      {
        label: "Total Categories",
        value: allCategories?.length || 0,
        icon: LegoIcon,
        tone: "rose",
      },
      {
        label: "Cost Coverage",
        value: `${coveragePct}%`,
        subtext: missingCostCount > 0
          ? `${missingCostCount} active item${missingCostCount !== 1 ? "s" : ""} need cost`
          : "All active items costed",
        icon: CurrencyInrIcon,
        tone: coveragePct === 100 ? "emerald" : missingCostCount > 0 ? "amber" : "emerald",
      },
    ];

    const handleOpenTrash = () => {
      setTrashOpen(true);
      setTimeout(() => trashRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    };

    return (
      <>
        {/* STICKY HEADER */}
        <div className="flex items-start gap-3 border-b px-4 pt-3 pb-4 border-border sticky top-0 z-5 bg-background">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate({ to: "/admin" })}
            aria-label="Back to dashboard"
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Menu
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage items, availability &amp; pricing
            </p>
          </div>
        </div>

        <div className="mt-5 px-4">
          <SummaryMetrics items={summaryItems} loading={loadingMenu} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 px-4">
          <ButtonGroup className="w-full order-2 sm:order-0 sm:max-w-sm">
            <InputGroup className="h-10 flex-1 sm:max-w-lg">
              <InputGroupInput
                placeholder="Search menu..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <InputGroupAddon>
                <MagnifyingGlassIcon />
              </InputGroupAddon>
            </InputGroup>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={() => setFilterSheetOpen(true)}
              className="relative shrink-0"
              aria-label="Filters"
            >
              <FunnelIcon weight={activeFilterCount > 0 ? "fill" : "regular"} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] size-5 rounded-full flex items-center justify-center font-bold">
                  {activeFilterCount > 9 ? "9+" : activeFilterCount}
                </span>
              )}
            </Button>
          </ButtonGroup>

          <div className={"flex flex-wrap ml-auto gap-2 order-0 sm:order-1"}>
            <Button
              type="button"
              variant="link"
              onClick={() => setCategoriesModalOpen(true)}
            >
              <LegoIcon /> Manage Categories
            </Button>
            {deletedItems.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 text-zinc-500 border-zinc-200"
                onClick={handleOpenTrash}
              >
                <TrashIcon className="size-4" />
                Trash
                <span className="bg-zinc-200 text-zinc-600 text-xs font-semibold rounded-full px-1.5 py-0.5 leading-none">
                  {deletedItems.length}
                </span>
              </Button>
            )}
            {missingCostCount > 0 && (
              <Button
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50 gap-1.5"
                onClick={() => setBulkCostOpen(true)}
              >
                <WarningCircleIcon weight="fill" className="size-4" />
                Set Costs ({missingCostCount})
              </Button>
            )}
            <Button onClick={() => setBulkUploadOpen(true)} variant="outline">
              <UploadIcon data-icon="inline-start" />
              <span className="sm:hidden">Bulk Actions</span>
              <span className="hidden sm:inline">Bulk Upload</span>
            </Button>
            <Button
              onClick={() => navigate({ to: "/admin/manage-menu" })}
              variant="branded-secondary"
            >
              <PlusIcon data-icon="inline-start" />
              <span className="sm:hidden">Add Item</span>
              <span className="hidden sm:inline">Create New Item</span>
            </Button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-4 py-4 flex flex-col gap-2">
          <CategoriesScroll
            categories={allCategories}
            counts={categoryCounts}
            value={activeCategoryId}
            onChange={setActiveCategoryId}
            onManageClick={() => setCategoriesModalOpen(true)}
          />

          {/* Profitability / Missing-cost quick filter pills */}
          {missingCostCount > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setQuickFilter(quickFilter === "MISSING_COST" ? "ALL" : "MISSING_COST")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                  quickFilter === "MISSING_COST"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                }`}
              >
                <WarningCircleIcon weight="fill" className="size-3.5" />
                Missing Cost · {missingCostCount}
              </button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {loadingMenu &&
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[104px] bg-muted/60 rounded-lg animate-pulse"
                />
              ))}

            {!loadingMenu &&
              filteredItems.map((item) => (
                <AdminMenuItem
                  key={item.id}
                  item={item}
                  onEdit={() => setEditingItem(item)}
                  onDelete={handleDeleteConfirm}
                  onToggleAvailable={handleToggleAvailable}
                  onToggleRecommended={handleToggleRecommended}
                />
              ))}

            {!loadingMenu && menu.length === 0 && (
              <Empty className="border col-span-full border-dashed border-border bg-card py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SparkleIcon size={20} weight="fill" />
                  </EmptyMedia>
                  <EmptyTitle>No Items Found!</EmptyTitle>
                  <EmptyDescription>
                    Get started by creating your first menu item.
                  </EmptyDescription>
                </EmptyHeader>
                <Button
                  onClick={() => navigate({ to: "/admin/manage-menu" })}
                  variant="outline"
                  className="border-border!"
                >
                  <PlusIcon data-icon="inline-start" />
                  Create Menu Item
                </Button>
              </Empty>
            )}

            {!loadingMenu &&
              menu.length > 0 &&
              filteredItems.length === 0 && (
                <Empty className="border col-span-2 border-dashed border-border bg-card py-12">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <MagnifyingGlassIcon size={20} weight="bold" />
                    </EmptyMedia>
                    <EmptyTitle>No Matching Items!</EmptyTitle>
                    <EmptyDescription>
                      Try adjusting your search or filters.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button
                    onClick={handleClearAll}
                    variant="outline"
                    className="border-border!"
                  >
                    Clear Filters
                  </Button>
                </Empty>
              )}

            {!loadingMenu && menu.length > 0 && filteredItems.length === 0 && (
              <div className="py-20 text-center rounded-lg border border-dashed border-border bg-card">
                <h3 className="text-lg font-semibold">No Matching Items!</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your search or filters.
                </p>
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  className="mt-4 border-primary text-primary hover:bg-primary/5"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>

          {/* ── Trash / Deleted Items ─────────────────────────────────── */}
          <div className="px-4 pb-4 mt-2" ref={trashRef}>

            <div className="border border-dashed border-zinc-300 rounded-xl overflow-hidden">

              {/* Toggle header */}
              <button
                type="button"
                onClick={() => setTrashOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-500 hover:bg-zinc-50 transition-colors"
              >
                <TrashIcon className="size-4" />
                <span>Deleted Items</span>
                {deletedItems.length > 0 && (
                  <span className="bg-zinc-200 text-zinc-600 text-xs font-semibold rounded-full px-2 py-0.5">
                    {deletedItems.length}
                  </span>
                )}
                <span className="ml-auto text-xs text-zinc-400">
                  {trashOpen ? "▲ Hide" : "▼ Show"}
                </span>
              </button>

              {/* Panel body */}
              {trashOpen && (
                <div className="border-t border-zinc-200 divide-y divide-zinc-100">
                  {/* Loading skeleton */}
                  {(loadingDeleted || fetchingDeleted) && deletedItems.length === 0 && (
                    <div className="px-4 py-3 space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-14 rounded-lg bg-zinc-100 animate-pulse" />
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!loadingDeleted && !fetchingDeleted && deletedItems.length === 0 && (
                    <p className="py-8 text-center text-sm text-zinc-400">
                      No deleted items in trash.
                    </p>
                  )}

                  {/* Item rows */}
                  {deletedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-zinc-50/60 transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="size-10 rounded-md bg-zinc-100 shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="size-full object-cover opacity-60"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center text-zinc-300 text-lg">
                            🍽️
                          </div>
                        )}
                      </div>

                      {/* Name + category */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-400 line-through truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          {item.categoryName ?? "No category"}
                        </p>
                      </div>

                      {/* Restore button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 text-xs border-zinc-200 hover:border-green-400 hover:text-green-700 hover:bg-green-50"
                        disabled={restoreMutation.isPending}
                        onClick={() => restoreMutation.mutate(item.id)}
                      >
                        <ArrowCounterClockwiseIcon className="size-3.5" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        <AdminMenuFilters
          open={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          searchQuery={searchInput}
          onSearchChange={setSearchInput}
          selectedCategories={selectedCategories}
          onCategoriesChange={(cats) => {
            setActiveCategoryId(cats[0] ?? "ALL");
          }}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          filters={{
            showRecommended: filters.showRecommended,
            showAvailable: quickFilter === "AVAILABLE",
            isVeg: filters.isVeg,
          }}
          onFiltersChange={(next) => {
            setFilters({
              showRecommended: next.showRecommended,
              isVeg: next.isVeg,
            });
            if (next.showAvailable) setQuickFilter("AVAILABLE");
            else if (quickFilter === "AVAILABLE") setQuickFilter("ALL");
          }}
          allCategories={allCategories}
          allTags={allTags}
          onClearAll={handleClearAll}
        />

        <MenuItemEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={handleEditSuccess}
        />

        <BulkMenuUploadModal
          open={bulkUploadOpen}
          onClose={() => setBulkUploadOpen(false)}
          onSuccess={() => {
            setBulkUploadOpen(false);
            queryClient.invalidateQueries({ queryKey: ["menu"] });
          }}
        />

        <BulkCostEditSheet
          open={bulkCostOpen}
          onOpenChange={setBulkCostOpen}
          items={menu}
        />

        <CategoriesManageModal
          open={categoriesModalOpen}
          onOpenChange={setCategoriesModalOpen}
        />
      </>
    );
  },
});
