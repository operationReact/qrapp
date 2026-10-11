import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PlusIcon,
  TrashIcon,
  TagIcon,
  BowlFoodIcon,
  MagnifyingGlassIcon,
  ArrowCounterClockwiseIcon,
  UploadSimpleIcon,
  SparkleIcon,
  CaretUpIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import {
  createCategory,
  deleteCategory,
  getDeletedCategories,
  restoreCategory,
  reorderCategory,
  uploadCategoryImage,
  removeCategoryImage,
  generateCategoryImage,
  applyGeneratedCategoryImage,
} from "@/services/category-service";
import { getDeletedMenuItems, restoreMenuItem } from "@/services/menu-service";
import { categoriesOptions, menuOptions } from "@/query/options/menu";
import { useLocation as useActiveLocation } from "@/context/LocationContext";

/**
 * Per-category image cell: shows the current image (or a placeholder),
 * lets the admin upload a file or generate one with AI. AI generation always
 * produces a preview first — nothing is saved until the admin explicitly
 * accepts it, and generation only ever runs on this admin-triggered action
 * (never while a customer is browsing the Home page).
 */
function CategoryImageCell({ category, activeLocationId, onChanged }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null); // { imageUrl, prompt }

  const uploadMut = useMutation({
    mutationFn: (file) => uploadCategoryImage(category.id, file, activeLocationId),
    onSuccess: (updated) => {
      onChanged(updated);
      toast.success("Image uploaded");
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to upload image"),
  });

  const removeMut = useMutation({
    mutationFn: () => removeCategoryImage(category.id, activeLocationId),
    onSuccess: (updated) => {
      onChanged(updated);
      toast.success("Image removed");
    },
    onError: () => toast.error("Failed to remove image"),
  });

  const generateMut = useMutation({
    mutationFn: () => generateCategoryImage(category.id, activeLocationId),
    onSuccess: (res) => setPreview({ imageUrl: res.imageUrl, prompt: res.prompt }),
    onError: (err) => toast.error(err?.response?.data?.message || "AI generation failed"),
  });

  const applyMut = useMutation({
    mutationFn: () => applyGeneratedCategoryImage(category.id, activeLocationId, preview.imageUrl, preview.imageUrl),
    onSuccess: (updated) => {
      onChanged(updated);
      setPreview(null);
      toast.success("AI image applied");
    },
    onError: () => toast.error("Failed to apply image"),
  });

  return (
    <div className="flex items-center gap-2">
      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
        {category.imageUrl ? (
          <img src={category.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <BowlFoodIcon size={16} />
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadMut.mutate(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Upload image"
        aria-label={`Upload image for ${category.name}`}
        disabled={uploadMut.isPending}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadSimpleIcon size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Generate with AI"
        disabled={generateMut.isPending}
        onClick={() => generateMut.mutate()}
      >
        <SparkleIcon size={14} className={generateMut.isPending ? "animate-pulse" : ""} />
      </Button>
      {category.imageUrl && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Remove image"
          className="text-muted-foreground hover:text-destructive"
          disabled={removeMut.isPending}
          onClick={() => removeMut.mutate()}
        >
          <TrashIcon size={14} />
        </Button>
      )}

      {/* AI preview-then-accept dialog */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>AI image preview — {category.name}</DialogTitle>
            <DialogDescription>
              Review the generated image before it is saved to this category.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <>
              <img src={preview.imageUrl} alt="" className="aspect-square w-full rounded-lg object-cover" />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={generateMut.isPending}
                  onClick={() => generateMut.mutate()}
                >
                  Regenerate
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" disabled={applyMut.isPending} onClick={() => applyMut.mutate()}>
                  {applyMut.isPending ? "Saving…" : "Use Image"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CategoriesManageModal({
  open,
  onOpenChange,
}) {
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [tab, setTab] = useState("active"); // "active" | "trash"
  const queryClient = useQueryClient();
  const { activeLocationId } = useActiveLocation();

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    ...categoriesOptions(activeLocationId),
    enabled: open,
  });

  const { data: deletedCategories = [], isLoading: loadingDeleted } = useQuery({
    queryKey: ["categories-deleted", activeLocationId],
    queryFn:  () => getDeletedCategories(activeLocationId),
    enabled:  open && tab === "trash" && Boolean(activeLocationId),
  });

  const { data: deletedMenuItems = [], isLoading: loadingDeletedItems } = useQuery({
    queryKey: ["menu-deleted", activeLocationId],
    queryFn:  () => getDeletedMenuItems(activeLocationId),
    enabled:  open && tab === "trash" && Boolean(activeLocationId),
  });

  const { data: menu = [] } = useQuery(menuOptions({ locationId: activeLocationId }));

  const counts = menu.reduce((acc, item) => {
    const name = item.category?.name;
    if (!name) return acc;
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});

  // Categories already arrive ordered by displayOrder (then name) from the
  // backend — preserve that order here so the up/down reorder controls make
  // sense, rather than re-sorting alphabetically.
  const sortedCategories = categories;

  const knownNames = sortedCategories.map((c) => c.name);

  const filtered = search.trim()
    ? sortedCategories.filter((c) =>
        c.name?.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : sortedCategories;

  const reorderMutation = useMutation({
    mutationFn: ({ id, displayOrder }) => reorderCategory(id, displayOrder, activeLocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", activeLocationId] });
    },
    onError: () => toast.error("Failed to reorder category"),
  });

  const moveCategory = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= filtered.length) return;
    const current = filtered[index];
    const target = filtered[targetIndex];
    const currentOrder = current.displayOrder ?? index;
    const targetOrder = target.displayOrder ?? targetIndex;
    reorderMutation.mutate({ id: current.id, displayOrder: targetOrder });
    reorderMutation.mutate({ id: target.id, displayOrder: currentOrder });
  };

  const createMutation = useMutation({
    mutationFn: (name) => createCategory({ name }, activeLocationId),
    onSuccess: () => {
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["categories", activeLocationId] });
      queryClient.invalidateQueries({ queryKey: ["menu", activeLocationId] });
      toast.success("Category created");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to create category",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCategory(id, activeLocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", activeLocationId] });
      queryClient.invalidateQueries({ queryKey: ["menu", activeLocationId] });
      toast.success("Category deleted");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to delete category",
      );
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => restoreCategory(id, activeLocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", activeLocationId] });
      queryClient.invalidateQueries({ queryKey: ["categories-deleted", activeLocationId] });
      queryClient.invalidateQueries({ queryKey: ["menu", activeLocationId] });
      toast.success("Category restored");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to restore category",
      );
    },
  });

  const restoreItemMutation = useMutation({
    mutationFn: (id) => restoreMenuItem(id, activeLocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", activeLocationId] });
      queryClient.invalidateQueries({ queryKey: ["menu-deleted", activeLocationId] });
      toast.success("Menu item restored");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to restore item");
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (
      knownNames.some((n) => n?.toLowerCase() === name.toLowerCase())
    ) {
      toast.error("A category with this name already exists");
      return;
    }
    createMutation.mutate(name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <TagIcon weight="bold" />
            Manage Categories
          </DialogTitle>
          <DialogDescription>
            Add categories, upload category images, or remove categories used by your menu items.
          </DialogDescription>
        </DialogHeader>

        {/* ── Tabs ── */}
        <div className="flex border-b px-5 gap-4">
          {[
            { key: "active", label: "Active" },
            {
              key: "trash",
              label: `Trash${
                (deletedCategories.length + deletedMenuItems.length) > 0
                  ? ` (${deletedCategories.length + deletedMenuItems.length})`
                  : ""
              }`,
            },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "active" && (
          <>
            <form
              onSubmit={handleCreate}
              className="px-5 py-3 border-b flex gap-2"
            >
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New category name"
                className="h-10"
                disabled={createMutation.isPending}
              />
              <Button
                type="submit"
                disabled={!newName.trim() || createMutation.isPending}
                className="shrink-0"
              >
                <PlusIcon data-icon="inline-start" />
                Add
              </Button>
            </form>

            <div className="px-5 py-2 border-b">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter categories..."
                  className="h-9 pl-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {loadingCategories ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 rounded-md border border-border bg-muted/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : sortedCategories.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No categories yet. Add one above to get started.
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No categories match "{search}".
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {filtered.map((cat, index) => {
                    const name = cat.name ?? cat;
                    const id = cat.id ?? name;
                    const count = counts[name] ?? 0;
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-3 p-2.5 rounded-md border border-border bg-card"
                      >
                        <div className="flex shrink-0 flex-col">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="h-5"
                            disabled={index === 0 || reorderMutation.isPending}
                            onClick={() => moveCategory(index, -1)}
                            aria-label={`Move ${name} up`}
                          >
                            <CaretUpIcon size={12} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="h-5"
                            disabled={index === filtered.length - 1 || reorderMutation.isPending}
                            onClick={() => moveCategory(index, 1)}
                            aria-label={`Move ${name} down`}
                          >
                            <CaretDownIcon size={12} />
                          </Button>
                        </div>
                        <CategoryImageCell
                          category={cat}
                          activeLocationId={activeLocationId}
                          onChanged={() =>
                            queryClient.invalidateQueries({ queryKey: ["categories", activeLocationId] })
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {count} {count === 1 ? "item" : "items"}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-destructive"
                                disabled={deleteMutation.isPending}
                                aria-label={`Delete ${name}`}
                              >
                                <TrashIcon />
                              </Button>
                            }
                          />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete category?</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{name}" has {count} {count === 1 ? "item" : "items"}.
                                All items in this category will also be soft-deleted and hidden from the menu.
                                You can restore them later from the Trash tab.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(id)}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {tab === "trash" && (
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-5">

            {/* ── Deleted Categories ── */}
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                <TagIcon size={12} /> Categories
              </p>
              {loadingDeleted ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-md border border-border bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : deletedCategories.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No deleted categories.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {deletedCategories.map((cat) => (
                    <li key={cat.id} className="flex items-center gap-3 p-2.5 rounded-md border border-border bg-card opacity-70">
                      <div className="size-8 rounded-md flex items-center justify-center bg-muted text-muted-foreground shrink-0">
                        <TagIcon size={14} weight="bold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate line-through text-muted-foreground">{cat.name}</p>
                        <p className="text-[11px] text-muted-foreground">Restoring also restores its menu items</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 text-xs"
                        disabled={restoreMutation.isPending}
                        onClick={() => restoreMutation.mutate(cat.id)}
                      >
                        <ArrowCounterClockwiseIcon size={13} />
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Deleted Menu Items ── */}
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                <BowlFoodIcon size={12} /> Menu Items
              </p>
              {loadingDeletedItems ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-md border border-border bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : deletedMenuItems.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No deleted menu items.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {deletedMenuItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 p-2.5 rounded-md border border-border bg-card opacity-70">
                      <div className="size-8 rounded-md overflow-hidden bg-muted shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="size-full object-cover opacity-60" />
                        ) : (
                          <div className="size-full flex items-center justify-center text-zinc-300 text-base">🍽️</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate line-through text-muted-foreground">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">{item.categoryName ?? "No category"}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 text-xs"
                        disabled={restoreItemMutation.isPending}
                        onClick={() => restoreItemMutation.mutate(item.id)}
                      >
                        <ArrowCounterClockwiseIcon size={13} />
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
