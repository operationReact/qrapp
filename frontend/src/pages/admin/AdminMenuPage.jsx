import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getMenu, updateMenuItem, deleteMenuItem } from "../../services/api";
import { useAdminAuth } from "../../context/AdminAuthContext";
import AdminMenuItem from "../../components/admin/AdminMenuItem";
import MenuItemEditModal from "../../components/MenuItemEditModal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminMenuPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, setAdmin } = useAdminAuth();

  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

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

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
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

      <div className="grid pb-4 px-4 gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loadingMenu &&
          Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-100/80"
            />
          ))}

        {!loadingMenu &&
          menu.map((item) => (
            <AdminMenuItem
              key={item.id}
              item={item}
              onEdit={() => setEditingItem(item)}
              onDelete={() => setDeletingItem(item)}
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
      </div>

      <MenuItemEditModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={handleEditSuccess}
      />

      {deletingItem && (
        <ConfirmDialog
          title="Delete menu item"
          message={`Are you sure you want to delete "${deletingItem.name}"?`}
          onCancel={() => setDeletingItem(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}
