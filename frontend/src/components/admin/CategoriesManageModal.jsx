import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PlusIcon,
  TrashIcon,
  TagIcon,
  MagnifyingGlassIcon,
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
} from "@/services/category-service";
import { categoriesOptions, menuOptions } from "@/query/options/menu";

export default function CategoriesManageModal({
  open,
  onOpenChange,
}) {
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    ...categoriesOptions,
    enabled: open,
  });

  const { data: menu = [] } = useQuery(menuOptions());

  const counts = menu.reduce((acc, item) => {
    const name = item.category?.name;
    if (!name) return acc;
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});

  const sortedCategories = [...categories].sort((a, b) =>
    (a.name || "").localeCompare(b.name || ""),
  );

  const knownNames = sortedCategories.map((c) => c.name);

  const filtered = search.trim()
    ? sortedCategories.filter((c) =>
        c.name?.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : sortedCategories;

  const createMutation = useMutation({
    mutationFn: (name) => createCategory({ name }),
    onSuccess: () => {
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      toast.success("Category created");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to create category",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      toast.success("Category deleted");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to delete category",
      );
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
            Add or remove categories used by your menu items.
          </DialogDescription>
        </DialogHeader>

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
              {filtered.map((cat) => {
                const name = cat.name ?? cat;
                const id = cat.id ?? name;
                const count = counts[name] ?? 0;
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 p-2.5 rounded-md border border-border bg-card"
                  >
                    <div
                      className={cn(
                        "size-8 rounded-md flex items-center justify-center bg-primary/10 text-primary shrink-0",
                      )}
                    >
                      <TagIcon size={14} weight="bold" />
                    </div>
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
                            "{name}" is used by {count}{" "}
                            {count === 1 ? "item" : "items"}. Deleting this
                            category will unassign those items.
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
      </DialogContent>
    </Dialog>
  );
}
