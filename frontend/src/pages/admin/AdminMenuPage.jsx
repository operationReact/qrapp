import { useEffect, useState, useMemo } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { getMenu, updateMenuItem, deleteMenuItem } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AdminMenuItem from "../../components/admin/AdminMenuItem";
import MenuItemEditModal from "../../components/MenuItemEditModal";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Upload } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminMenuFilters from "../../components/admin/AdminMenuFilters";
import BulkMenuUploadModal from "../../components/admin/BulkMenuUploadModal";

export default function AdminMenuPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isSuperUser, user: admin, setUser: setAdmin } = useAuth();

  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") || "",
  );
  const [selectedCategories, setSelectedCategories] = useState(
    () => searchParams.get("categories")?.split(",").filter(Boolean) || [],
  );
  const [selectedTags, setSelectedTags] = useState(
    () => searchParams.get("tags")?.split(",").filter(Boolean) || [],
  );
  const [filters, setFilters] = useState({
    showRecommended: searchParams.get("recommended") === "true",
    showAvailable: searchParams.get("available") === "true",
    isVeg: searchParams.get("veg") === "true" ? true : null,
  });

  async function loadMenu() {
    setLoadingMenu(true);
    try {
      const response = await getMenu();
      setMenu(response.data || []);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setAdmin(null);
        navigate("/login", {
          replace: true,
          state: { from: location.pathname },
        });
        return;
      }
      console.error(err);
    } finally {
      setLoadingMenu(false);
    }
  }

  useEffect(() => {
    loadMenu();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCategories.length)
      params.set("categories", selectedCategories.join(","));
    if (selectedTags.length) params.set("tags", selectedTags.join(","));
    if (filters.showRecommended) params.set("recommended", "true");
    if (filters.showAvailable) params.set("available", "true");
    if (filters.isVeg === true) params.set("veg", "true");
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategories, selectedTags, filters, setSearchParams]);

  const allCategories = useMemo(
    () =>
      [...new Set(menu.map((item) => item.category).filter(Boolean))].sort(),
    [menu],
  );

  const allTags = useMemo(
    () => [...new Set(menu.map((item) => item.tag).filter(Boolean))].sort(),
    [menu],
  );

  const handleEditSuccess = (updatedItem) => {
    setMenu((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    );
    setEditingItem(null);
  };

  const handleDeleteConfirm = async (deletingItem) => {
    try {
      await deleteMenuItem(deletingItem.id);
      setMenu((prev) => prev.filter((item) => item.id !== deletingItem.id));
      setDeletingItem(null);
    } catch (err) {
      console.error(err);
      alert(
        err?.response?.data || err?.message || "Failed to delete menu item",
      );
    }
  };

  const handleToggleAvailable = async (id, nextAvailable) => {
    setMenu((prev) =>
      prev.map((current) =>
        current.id === id ? { ...current, available: nextAvailable } : current,
      ),
    );
    try {
      await updateMenuItem(id, { available: nextAvailable });
    } catch (err) {
      console.error(err);
      setMenu((prev) =>
        prev.map((current) =>
          current.id === id
            ? { ...current, available: !nextAvailable }
            : current,
        ),
      );
      alert(err?.response?.data || "Failed to update availability");
    }
  };

  const handleToggleRecommended = async (id, nextRecommended) => {
    setMenu((prev) =>
      prev.map((current) =>
        current.id === id
          ? { ...current, recommended: nextRecommended }
          : current,
      ),
    );
    try {
      await updateMenuItem(id, { recommended: nextRecommended });
    } catch (err) {
      console.error(err);
      setMenu((prev) =>
        prev.map((current) =>
          current.id === id
            ? { ...current, recommended: !nextRecommended }
            : current,
        ),
      );
      alert(err?.response?.data || "Failed to update recommendation");
    }
  };

  const handleClearAll = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedTags([]);
    setFilters({ showRecommended: false, showAvailable: false, isVeg: null });
    setSearchParams({}, { replace: true });
  };

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
      !selectedCategories.includes(item.category)
    ) {
      return false;
    }

    if (selectedTags.length > 0 && !selectedTags.includes(item.tag)) {
      return false;
    }

    if (filters.showRecommended && !item.recommended) {
      return false;
    }

    if (filters.showAvailable && !item.available) {
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

    return true;
  });

  if (!isAdmin && !isSuperUser) {
    return (
      <Navigate to={"/login"} replace state={{ from: location.pathname }} />
    );
  }

  return (
    <>
      <div className="flex px-4 pt-2 flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <AdminHeader
          title="Menu"
          description="Manage all your menu items, availability, and recommendations."
          className="px-0 pt-0"
        />

        <div className="flex gap-2 sm:w-auto">
          <Button
            onClick={() => setBulkUploadOpen(true)}
            variant="outline"
            size="lg"
          >
            <Upload className="size-5" />
            Bulk Upload
          </Button>
          <Button
            onClick={() => navigate("/admin/manage-menu")}
            size="lg"
          >
            <Plus className="size-5" />
            Create New Item
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] min-h-0">
        <div className="border-b md:border-b-0 pb-2 md:pb-0 md:px-0 px-4">
          <AdminMenuFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            filters={filters}
            onFiltersChange={setFilters}
            allCategories={allCategories}
            allTags={allTags}
            onClearAll={handleClearAll}
          />
        </div>

        <main className="p-4 overflow-auto">
          <div className="grid pb-4 gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {loadingMenu &&
              Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-100/80"
                />
              ))}

            {!loadingMenu &&
              filteredItems.map((item) => (
                <AdminMenuItem
                  key={item.id}
                  item={item}
                  onEdit={() => setEditingItem(item)}
                  onDelete={(item) => handleDeleteConfirm(item)}
                  onToggleAvailable={handleToggleAvailable}
                  onToggleRecommended={handleToggleRecommended}
                />
              ))}

            {!loadingMenu && menu.length === 0 && (
              <div className="col-span-full py-20 text-center rounded-3xl border border-dashed border-slate-200 bg-white">
                <h3 className="text-lg font-semibold">No Items Found!</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get started by creating your first menu item.
                </p>
                <Button
                  onClick={() => navigate("/admin/manage-menu")}
                  variant="outline"
                  className="mt-4 text-sm! font-medium! w-full max-w-1/3 h-12"
                >
                  Create Menu Item
                </Button>
              </div>
            )}

            {!loadingMenu && menu.length > 0 && filteredItems.length === 0 && (
              <div className="col-span-full py-20 text-center rounded-3xl border border-dashed border-slate-200 bg-white">
                <h3 className="text-lg font-semibold">No Matching Items!</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your search or filters.
                </p>
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  className="mt-4 text-sm! font-medium! w-full max-w-1/3 h-12"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      <MenuItemEditModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={handleEditSuccess}
      />

      <BulkMenuUploadModal
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() => { setBulkUploadOpen(false); loadMenu(); }}
      />
    </>
  );
}
