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
import {
  updateMenuItem,
  deleteMenuItem,
  getDeletedMenuItems,
  restoreMenuItem,
} from "@/services/menu-service";
import { menuOptions } from "@/query/options/menu";
import { useAuth } from "@/context/AuthContext";
import AdminMenuItem from "@/components/admin/AdminMenuItem";
import MenuItemEditModal from "@/components/MenuItemEditModal";
import { Button } from "@/components/ui/button";
import AdminMenuFilters from "@/components/admin/AdminMenuFilters";
import BulkMenuUploadModal from "@/components/admin/BulkMenuUploadModal";
import BulkCostEditSheet from "@/components/admin/BulkCostEditSheet";
import MissingImagesSheet from "@/components/admin/MissingImagesSheet";
import CategoriesScroll from "@/components/admin/CategoriesScroll";
import CategoriesManageModal from "@/components/admin/CategoriesManageModal";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  ArrowCounterClockwiseIcon,
  FunnelIcon,
  LegoIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SlidersIcon,
  SparkleIcon,
  TrashIcon,
  UploadIcon,
  WarningCircleIcon,
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
    const [missingImagesOpen, setMissingImagesOpen] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
    const [trashOpen, setTrashOpen] = useState(false);
    const [toolsOpen, setToolsOpen] = useState(false);
    const trashRef = useRef(null);

    const { data: menu = [], isLoading: loadingMenu } = useQuery(menuOptions());

    const {
      data: deletedItems = [],
      isLoading: loadingDeleted,
      isFetching: fetchingDeleted,
    } = useQuery({
      queryKey: ["menu-deleted"],
      queryFn: getDeletedMenuItems,
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
        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to restore item",
        );
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

    const missingCostCount = useMemo(
      () => menu.filter((m) => m.available && m.estimatedCost == null).length,
      [menu],
    );

    const missingImageCount = useMemo(
      () => menu.filter((m) => !m.imageUrl).length,
      [menu],
    );

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

      // MISSING_IMAGE quick-filter
      if (quickFilter === "MISSING_IMAGE") {
        return !item.imageUrl;
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


    const handleOpenTrash = () => {
      setTrashOpen(true);
      setTimeout(
        () =>
          trashRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        50,
      );
    };

    return (
      <>
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="px-4 pt-5 pb-3 flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight flex-1">Menu</h1>
          <Button
            onClick={() => navigate({ to: "/admin/manage-menu" })}
            size="sm"
            className="gap-1.5 shrink-0"
            variant="branded-secondary"
          >
            <PlusIcon weight="bold" className="size-3.5" />
            Add Item
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setToolsOpen(true)}
            aria-label="Menu Tools"
          >
            <SlidersIcon />
          </Button>
        </div>

        {/* ── Compact stats pills ─────────────────────────────────── */}
        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Items {totalItems}
          </span>
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Categories {allCategories.length}
          </span>
          {deletedItems.length > 0 && (
            <button
              type="button"
              onClick={() => setToolsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
            >
              <TrashIcon className="size-3" />
              Trash {deletedItems.length}
            </button>
          )}
        </div>

        {/* ── Search ──────────────────────────────────────────────── */}
        <div className="px-4 pb-3">
          <ButtonGroup className="w-full">
            <InputGroup className="h-10 flex-1">
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
        </div>

        {/* ── Attention Required card ──────────────────────────────── */}
        {(missingCostCount > 0 || missingImageCount > 0) && (
          <div className="mx-4 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <WarningCircleIcon weight="fill" className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">Attention Required</p>
                <div className="mt-1 space-y-0.5">
                  {missingCostCount > 0 && (
                    <p className="text-xs text-amber-700">{missingCostCount} items missing cost</p>
                  )}
                  {missingImageCount > 0 && (
                    <p className="text-xs text-amber-700">{missingImageCount} items without image</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                onClick={() =>
                  missingCostCount > 0 ? setBulkCostOpen(true) : setMissingImagesOpen(true)
                }
              >
                Fix Now
              </Button>
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className="px-4 py-2 flex flex-col gap-2">
          <CategoriesScroll
            categories={allCategories}
            counts={categoryCounts}
            value={activeCategoryId}
            onChange={setActiveCategoryId}
          />

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

            {!loadingMenu && menu.length > 0 && filteredItems.length === 0 && (
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
                {(loadingDeleted || fetchingDeleted) &&
                  deletedItems.length === 0 && (
                    <div className="px-4 py-3 space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-14 rounded-lg bg-zinc-100 animate-pulse"
                        />
                      ))}
                    </div>
                  )}

                {/* Empty state */}
                {!loadingDeleted &&
                  !fetchingDeleted &&
                  deletedItems.length === 0 && (
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

        {/* ── Tools Drawer ─────────────────────────────────────── */}
        <Drawer open={toolsOpen} onOpenChange={setToolsOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Menu Tools</DrawerTitle>
            </DrawerHeader>
            <div className="grid gap-1 px-4 pb-8">
              <button
                type="button"
                onClick={() => { setToolsOpen(false); setCategoriesModalOpen(true); }}
                className="flex items-center gap-3 px-3 py-3.5 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <LegoIcon className="size-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">Manage Categories</span>
              </button>
              <button
                type="button"
                onClick={() => { setToolsOpen(false); setBulkUploadOpen(true); }}
                className="flex items-center gap-3 px-3 py-3.5 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <UploadIcon className="size-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">Bulk Upload</span>
              </button>
              <button
                type="button"
                onClick={() => { setToolsOpen(false); handleOpenTrash(); }}
                className="flex items-center gap-3 px-3 py-3.5 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <TrashIcon className="size-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">Trash</span>
                {deletedItems.length > 0 && (
                  <span className="ml-auto bg-zinc-200 text-zinc-600 text-xs font-semibold rounded-full px-2 py-0.5 leading-none">
                    {deletedItems.length}
                  </span>
                )}
              </button>
            </div>
          </DrawerContent>
        </Drawer>

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

        <MissingImagesSheet
          open={missingImagesOpen}
          onOpenChange={setMissingImagesOpen}
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
