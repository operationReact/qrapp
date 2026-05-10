import { useEffect, useState, useMemo } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getMenu, updateMenuItem, deleteMenuItem } from "../../services/api";
import { useAdminAuth } from "../../context/AdminAuthContext";
import AdminMenuItem from "../../components/admin/AdminMenuItem";
import MenuItemEditModal from "../../components/MenuItemEditModal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ButtonGroup } from "@/components/ui/button-group";

export default function AdminMenuPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, setAdmin } = useAdminAuth();

  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    showRecommended: false,
    showAvailable: false,
    isVeg: null,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (!admin?.username || !admin?.password) {
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

        <Button
          onClick={() => navigate("/admin/manage-menu")}
          className="sm:w-auto rounded-lg text-sm! font-medium!"
          size="lg"
        >
          <Plus className="size-5" />
          Create New Item
        </Button>
      </div>

      <div className="flex gap-2 mb-4 px-4 pb-2 justify-between items-center">
        <ButtonGroup className="flex-1">
          <InputGroup className="rounded-md max-w-[350px]">
            <InputGroupInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, tags..."
              className="text-sm! w-full"
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="text-sm! font-medium!">
                <Filter />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="leading-none font-medium">Filters</h4>
                  <p className="text-sm text-muted-foreground">
                    Filter by recommended and available items. 
                  </p>
                </div>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-recommended">Recommended Only</Label>
                    <Switch
                      id="show-recommended"
                      checked={filters.showRecommended}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({
                          ...prev,
                          showRecommended: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-available">Available Only</Label>
                    <Switch
                      id="show-available"
                      checked={filters.showAvailable}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({
                          ...prev,
                          showAvailable: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </ButtonGroup>

        <div className="flex items-center gap-2 mr-1">
          <Label htmlFor="veg-filter" className="text-sm font-medium">
            Veg Only
          </Label>
          <Switch
            id="veg-filter"
            checked={filters.isVeg === true}
            onCheckedChange={(checked) =>
              setFilters((prev) => ({
                ...prev,
                isVeg: checked ? true : null,
              }))
            }
          />
        </div>
      </div>

      <div className="grid pb-4 px-4 gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              onClick={() => {
                setSearchQuery("");
                setFilters({
                  showRecommended: false,
                  showAvailable: false,
                  isVeg: null,
                });
              }}
              variant="outline"
              className="mt-4 text-sm! font-medium! w-full max-w-1/3 h-12"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      <MenuItemEditModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
