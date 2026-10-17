import {
  createFileRoute,
  Navigate,
  useLocation,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteMenuItem,
  getDeletedMenuItems,
  patchMenuItemQuick,
  restoreMenuItem,
  setItemCost,
  generateMissingMenuImages,
  getMenuImageGenerationSummary,
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
  DrawerClose,
  DrawerContent,
  DrawerDescription,
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
  ArrowLeftIcon,
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
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { LocationSelector } from "@/components/LocationSelector";

export const Route = createFileRoute("/admin/(menu)/menu")({
  component: function AdminMenuPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const search = useSearch({ strict: false });
    const { isAdmin, isSuperUser } = useAuth();
    const { activeLocationId } = useActiveLocation();

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
    const [toolsOpen, setToolsOpen] = useState(false);
    const [toolsView, setToolsView] = useState("menu"); // "menu" | "trash"
    const [imageBatchActive, setImageBatchActive] = useState(false);
    const [brokenImageIds, setBrokenImageIds] = useState(() => new Set());

    const openToolsMenu  = () => { setToolsView("menu");  setToolsOpen(true); };
    const openTrashView  = () => { setToolsView("trash"); setToolsOpen(true); };
    const handleToolsClose = (open) => {
      setToolsOpen(open);
      if (!open) setTimeout(() => setToolsView("menu"), 300);
    };

    const { data: menu = [], isLoading: loadingMenu } =
      useQuery(menuOptions({ locationId: activeLocationId }));

    const {
      data: deletedItems = [],
      isLoading: loadingDeleted,
      isFetching: fetchingDeleted,
    } = useQuery({
      queryKey: ["menu-deleted", activeLocationId],
      queryFn: () => getDeletedMenuItems(activeLocationId),
      enabled: Boolean(activeLocationId),
      staleTime: 30_000,
    });

    const { data: imageSummary = {} } = useQuery({
      queryKey: ["menu-image-generation-summary", activeLocationId],
      queryFn: () => getMenuImageGenerationSummary(activeLocationId),
      enabled: Boolean(activeLocationId),
      refetchInterval: imageBatchActive ? 2000 : false,
      staleTime: imageBatchActive ? 0 : 30_000,
    });

    const generateMissingImagesMutation = useMutation({
      mutationFn: () => generateMissingMenuImages(activeLocationId, 3),
      onSuccess: (data) => {
        if (data.requested > 0) {
          setImageBatchActive(true);
          toast.success(`Started image generation for ${data.requested} menu item${data.requested === 1 ? "" : "s"}.`);
          queryClient.invalidateQueries({ queryKey: ["menu-image-generation-summary", activeLocationId] });
        } else {
          toast.info("No missing menu images are waiting to be generated.");
        }
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || "Unable to start image generation.");
      },
    });

    useEffect(() => {
      if (!imageBatchActive) return undefined;
      const timeout = window.setTimeout(() => setImageBatchActive(false), 30_000);
      return () => window.clearTimeout(timeout);
    }, [imageBatchActive]);

    const restoreMutation = useMutation({
      mutationFn: (id) => restoreMenuItem(id, activeLocationId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["menu", activeLocationId] });
        queryClient.invalidateQueries({ queryKey: ["menu-deleted", activeLocationId] });
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

    useEffect(() => {
      setBrokenImageIds(new Set());
    }, [activeLocationId, menu]);

    const missingCostCount = useMemo(
      () => menu.filter((m) => m.available && m.estimatedCost == null).length,
      [menu],
    );

    const missingImageCount = useMemo(
      () => menu.filter((m) => !m.imageUrl || brokenImageIds.has(m.id)).length,
      [menu, brokenImageIds],
    );
    const totalMissingImageCount = Math.max(
      missingImageCount,
      Number.isFinite(Number(imageSummary.missing)) ? Number(imageSummary.missing) : 0,
    );

    const avgMargin = useMemo(() => {
      const costed = menu.filter(
        (m) => m.estimatedCost != null && Number(m.estimatedCost) > 0 && Number(m.price) > 0,
      );
      if (!costed.length) return null;
      const sum = costed.reduce((acc, m) => {
        return acc + ((Number(m.price) - Number(m.estimatedCost)) / Number(m.price)) * 100;
      }, 0);
      return Math.round(sum / costed.length);
    }, [menu]);

    const categoryCounts = useMemo(() => {
      const counts = { ALL: totalItems };
      for (const item of menu) {
        const name = item.category?.name;
        if (!name) continue;
        counts[name] = (counts[name] ?? 0) + 1;
      }
      return counts;
    }, [menu, totalItems]);

    const deleteMutation = useMutation({
      mutationFn: (id) => deleteMenuItem(id, activeLocationId),
      onSuccess: () => {
        toast.success("Item moved to Trash");
      },
      onError: (err) => {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data ||
            err?.message ||
            "Failed to delete menu item",
        );
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["menu", activeLocationId] });
        queryClient.invalidateQueries({ queryKey: ["menu-deleted", activeLocationId] });
      },
    });

    const quickUpdateMutation = useMutation({
      mutationFn: ({ id, patch }) => patchMenuItemQuick(id, patch, activeLocationId),
      onSuccess: (_, { patch }) => {
        if (Object.prototype.hasOwnProperty.call(patch, "available")) {
          toast.success(patch.available ? "Item available on menu" : "Item hidden from menu");
        } else if (Object.prototype.hasOwnProperty.call(patch, "recommended")) {
          toast.success(patch.recommended ? "Marked as Recommended" : "Removed from Recommended");
        } else if (Object.prototype.hasOwnProperty.call(patch, "isVeg")) {
          toast.success(patch.isVeg ? "Marked as Veg" : "Marked as Non-Veg");
        }
        queryClient.invalidateQueries({ queryKey: ["menu", activeLocationId] });
      },
      onError: (err, { patch }) => {
        const data = err?.response?.data;
        if (data?.error === "MISSING_ESTIMATED_COST") {
          toast.error("Set an estimated cost before making this item live.");
        } else {
          toast.error(
            data?.message || data || err?.message || "Update failed",
          );
        }
      },
    });

    const costMutation = useMutation({
      mutationFn: ({ id, estimatedCost }) => setItemCost(id, estimatedCost, activeLocationId),
      onSuccess: (_, { estimatedCost }) => {
        toast.success(
          estimatedCost != null
            ? `Cost price saved as ₹${Number(estimatedCost).toFixed(0)}`
            : "Cost price cleared",
        );
        queryClient.invalidateQueries({ queryKey: ["menu", activeLocationId] });
      },
      onError: (err) => {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data ||
            err?.message ||
            "Failed to save cost",
        );
      },
    });

    const handleSetCost = (item, estimatedCost) => {
      costMutation.mutate({ id: item.id, estimatedCost });
    };

    const handleEditSuccess = () => {
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["menu", activeLocationId] });
    };

    const handleDeleteConfirm = (item) => {
      deleteMutation.mutate(item.id);
    };

    const handleQuickUpdate = (patch, item) => {
      quickUpdateMutation.mutate({ id: item.id, patch });
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



    return (
      <>
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="px-3 pt-3 sm:px-5">
          <div
            className="relative overflow-hidden rounded-3xl p-4 sm:p-6"
            style={{
              background: "linear-gradient(135deg,#211b18 0%,#2e1f1c 55%,#4a1a1d 100%)",
              boxShadow: "0 18px 40px -18px rgba(33,27,24,0.55)",
            }}
          >
            <div
              className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full opacity-60 blur-3xl"
              style={{ background: "radial-gradient(circle,#e51b23 0%,transparent 70%)" }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full opacity-40 blur-3xl"
              style={{ background: "radial-gradient(circle,#b88746 0%,transparent 70%)" }}
              aria-hidden="true"
            />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#d9a85c" }}>
                  <span className="inline-block h-px w-5" style={{ background: "#d9a85c" }} aria-hidden="true" />
                  Catalog
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Menu Management
                </h1>
                <p className="mt-1 text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Manage pricing, profitability and availability
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/admin/manage-menu" })}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg,#e51b23 0%,#f0623a 100%)",
                    boxShadow: "0 10px 24px -10px rgba(229,27,35,0.8)",
                  }}
                >
                  <PlusIcon weight="bold" className="size-4" />
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={openToolsMenu}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-[0.98]"
                >
                  <SlidersIcon className="size-4" />
                  Tools
                </button>
              </div>
            </div>
            <div className="relative mt-5 rounded-2xl bg-white/95 p-1 shadow-inner">
              <LocationSelector className="w-full" />
            </div>
          </div>
        </div>

        {/* ── Business-value stats pills ───────────────────────────── */}
        <div className="px-3 sm:px-5 pt-2 pb-2 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Items {totalItems}
          </span>
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Categories {allCategories.length}
          </span>
          {avgMargin != null && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                avgMargin >= 50
                  ? "bg-emerald-50 text-emerald-700"
                  : avgMargin >= 25
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-red-50 text-red-600"
              }`}
            >
              Avg Margin {avgMargin}%
            </span>
          )}
          {deletedItems.length > 0 && (
            <button
              type="button"
              onClick={openTrashView}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
            >
              <TrashIcon className="size-3" />
              Trash {deletedItems.length}
            </button>
          )}
        </div>

        {/* ── Search ──────────────────────────────────────────────── */}
        <div className="px-3 sm:px-5 pb-2">
          <ButtonGroup className="w-full">
            <InputGroup className="h-9 flex-1">
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
              size="icon-md"
              onClick={() => setFilterSheetOpen(true)}
              className="relative shrink-0"
              aria-label="Filters"
            >
              <FunnelIcon weight={activeFilterCount > 0 ? "fill" : "regular"} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] size-4 rounded-full flex items-center justify-center font-bold">
                  {activeFilterCount > 9 ? "9+" : activeFilterCount}
                </span>
              )}
            </Button>
          </ButtonGroup>
        </div>

        {/* ── Attention card ──────────────────────────────────────── */}
        {(missingCostCount > 0 || totalMissingImageCount > 0) && (
          <div className="mx-3 sm:mx-5 mb-2 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2.5">
            {/* Header */}
            <div className="flex items-center gap-1.5">
              <WarningCircleIcon weight="fill" className="size-3.5 text-amber-500 shrink-0" />
              <p className="text-xs font-bold text-amber-900 leading-none">
                {missingCostCount + totalMissingImageCount} Issues Need Attention
              </p>
            </div>

            {/* Tappable issue cards */}
            <div
              className={`grid gap-2 ${
                missingCostCount > 0 && totalMissingImageCount > 0
                  ? "grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {missingCostCount > 0 && (
                <button
                  type="button"
                  onClick={() => setBulkCostOpen(true)}
                  className="flex flex-col gap-2 bg-white rounded-lg border border-amber-200 px-3 py-2.5 hover:border-amber-400 hover:shadow-sm active:scale-[0.97] transition-all text-left"
                >
                  <span className="text-lg leading-none">💰</span>
                  <div>
                    <p className="text-2xl font-black text-amber-800 leading-none tracking-tight">
                      {missingCostCount}
                    </p>
                    <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
                      Missing Costs
                    </p>
                    <p className="text-[10px] text-amber-500 mt-0.5">
                      Needed for margin data
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-amber-600 mt-auto">
                    Set Costs →
                  </span>
                </button>
              )}
              {totalMissingImageCount > 0 && (
                <div className="flex flex-col gap-2 bg-white rounded-lg border border-amber-200 px-3 py-2.5">
                  <span className="text-lg leading-none">🖼️</span>
                  <div>
                    <p className="text-2xl font-black text-amber-800 leading-none tracking-tight">
                      {totalMissingImageCount}
                    </p>
                    <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
                      Missing Images
                    </p>
                    <p className="text-[10px] text-amber-500 mt-0.5">
                      Increases customer orders
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-[11px] px-2.5"
                      disabled={generateMissingImagesMutation.isPending || imageSummary.processing > 0}
                      onClick={() => generateMissingImagesMutation.mutate()}
                    >
                      {generateMissingImagesMutation.isPending
                        ? "Starting…"
                        : imageSummary.processing > 0
                          ? `${imageSummary.processing} processing`
                          : "Generate next 3"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setMissingImagesOpen(true)}
                      className="text-[11px] font-bold text-amber-600 hover:underline"
                    >
                      Manage →
                    </button>
                  </div>
                  {(imageSummary.completed != null || imageSummary.failed != null) && (
                    <p className="text-[10px] text-muted-foreground">
                      {imageSummary.completed || 0} completed · {imageSummary.failed || 0} failed
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className="px-3 sm:px-5 py-2 flex flex-col gap-2">
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
                  onQuickUpdate={handleQuickUpdate}
                  onSetCost={handleSetCost}
                  onImageError={(id) => setBrokenImageIds((previous) => {
                    if (previous.has(id)) return previous;
                    return new Set([...previous, id]);
                  })}
                  isUpdating={quickUpdateMutation.isPending}
                  isSavingCost={costMutation.isPending}
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

        {/* ── Unified Tools / Trash Drawer ─────────────────────── */}
        <Drawer open={toolsOpen} onOpenChange={handleToolsClose}>
          <DrawerContent className="max-h-[85vh] flex flex-col">

            {toolsView === "menu" ? (
              /* ── Tools menu view ── */
              <>
                <DrawerHeader className="border-b shrink-0">
                  <DrawerTitle>Menu Tools</DrawerTitle>
                </DrawerHeader>
                <div className="flex-1 overflow-y-auto">
                  <div className="grid gap-0 px-2 py-2">
                    <button
                      type="button"
                      onClick={() => { setToolsOpen(false); setCategoriesModalOpen(true); }}
                      className="flex items-center gap-3 px-3 py-3.5 rounded-lg hover:bg-muted active:bg-muted transition-colors text-left"
                    >
                      <LegoIcon className="size-5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">Manage Categories</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setToolsOpen(false); setBulkUploadOpen(true); }}
                      className="flex items-center gap-3 px-3 py-3.5 rounded-lg hover:bg-muted active:bg-muted transition-colors text-left"
                    >
                      <UploadIcon className="size-5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">Bulk Upload</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setToolsView("trash")}
                      className="flex items-center gap-3 px-3 py-3.5 rounded-lg hover:bg-muted active:bg-muted transition-colors text-left"
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
                </div>
                <div className="shrink-0 px-4 py-3 border-t">
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full">Close</Button>
                  </DrawerClose>
                </div>
              </>
            ) : (
              /* ── Trash view ── */
              <>
                <DrawerHeader className="border-b shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setToolsView("menu")}
                      className="p-1 -ml-1 rounded-lg hover:bg-muted transition-colors"
                      aria-label="Back to tools"
                    >
                      <ArrowLeftIcon className="size-4 text-muted-foreground" />
                    </button>
                    <div className="flex items-center gap-2">
                      <DrawerTitle>Trash</DrawerTitle>
                      {deletedItems.length > 0 && (
                        <span className="bg-zinc-200 text-zinc-600 text-xs font-semibold rounded-full px-2 py-0.5">
                          {deletedItems.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <DrawerDescription>
                    Restore items to make them available again.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
                  {(loadingDeleted || fetchingDeleted) && deletedItems.length === 0 && (
                    <div className="px-4 py-3 space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-14 rounded-lg bg-zinc-100 animate-pulse" />
                      ))}
                    </div>
                  )}
                  {!loadingDeleted && !fetchingDeleted && deletedItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
                      <TrashIcon className="size-8 opacity-30" />
                      <p className="text-sm">Trash is empty</p>
                    </div>
                  )}
                  {deletedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
                    >
                      <div className="size-11 rounded-lg bg-zinc-100 shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="size-full object-cover opacity-50" />
                        ) : (
                          <div className="size-full flex items-center justify-center text-xl">🍽️</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-400 line-through truncate">{item.name}</p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{item.categoryName ?? "No category"}</p>
                      </div>
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

                <div className="shrink-0 px-4 py-3 border-t">
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full">Done</Button>
                  </DrawerClose>
                </div>
              </>
            )}

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
            queryClient.invalidateQueries({ queryKey: ["menu", activeLocationId] });
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
