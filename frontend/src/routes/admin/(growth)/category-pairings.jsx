import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryPairingsOptions } from "@/query/options/recommendations";
import { categoriesOptions } from "@/query/options/menu";
import {
  createCategoryPairing,
  deleteCategoryPairing,
  toggleCategoryPairing,
} from "@/services/recommendation-service";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowRightIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useLocation as useActiveLocation } from "@/context/LocationContext";

export const Route = createFileRoute("/admin/(growth)/category-pairings")({
  component: AdminCategoryPairingsPage,
});

function AddPairingDialog({ open, onOpenChange, categories, onSubmit, submitting }) {
  const [sourceCategoryId, setSourceCategoryId] = useState("");
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      sourceCategoryId: Number(sourceCategoryId),
      targetCategoryId: Number(targetCategoryId),
      displayOrder: Number(displayOrder),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Category Pairing</DialogTitle>
          <DialogDescription>
            When a cart contains items from the source category, suggest items from the target category.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Source Category <span className="text-muted-foreground text-xs">(cart contains)</span></Label>
            <Select value={sourceCategoryId} onValueChange={setSourceCategoryId} required>
              <SelectTrigger><SelectValue placeholder="Select source…" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Target Category <span className="text-muted-foreground text-xs">(recommend from)</span></Label>
            <Select value={targetCategoryId} onValueChange={setTargetCategoryId} required>
              <SelectTrigger><SelectValue placeholder="Select target…" /></SelectTrigger>
              <SelectContent>
                {categories
                  .filter(c => String(c.id) !== sourceCategoryId)
                  .map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Display Order <span className="text-muted-foreground text-xs">(lower = higher priority)</span></Label>
            <Input type="number" min="0" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !sourceCategoryId || !targetCategoryId}>
              {submitting ? "Adding…" : "Add Pairing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminCategoryPairingsPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { activeLocationId } = useActiveLocation();

  const { data: pairings = [], isLoading } = useQuery(categoryPairingsOptions(activeLocationId));
  const { data: categories = [] } = useQuery(categoriesOptions());

  const createMutation = useMutation({
    mutationFn: createCategoryPairing,
    onSuccess: () => {
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["growth", "category-pairings"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategoryPairing,
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["growth", "category-pairings"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleCategoryPairing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["growth", "category-pairings"] }),
  });

  const handleAdd = async (data) => {
    setSubmitting(true);
    try { await createMutation.mutateAsync(data); } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="flex px-4 pt-2 flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <AdminHeader
          title="Category Pairings"
          description="Fallback engine: when no item-level mapping exists, recommend items from paired categories."
          className="px-0 pt-0"
        />
        <Button onClick={() => setAddOpen(true)} size="lg">
          <PlusIcon className="size-5" /> Add Pairing
        </Button>
      </div>

      <div className="px-4">
        <div className="rounded-md bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source Category</TableHead>
                <TableHead className="w-8" />
                <TableHead>Recommends From</TableHead>
                <TableHead className="w-20 text-center">Priority</TableHead>
                <TableHead className="w-20 text-center">Active</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && pairings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No category pairings yet. Add your first pairing as a fallback recommendation.
                  </TableCell>
                </TableRow>
              )}
              {pairings.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-medium">{p.sourceCategoryName}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <ArrowRightIcon className="size-4" />
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-primary/10 text-primary border-primary/20">{p.targetCategoryName}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{p.displayOrder}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={p.isActive} onCheckedChange={() => toggleMutation.mutate(p.id)} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AddPairingDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        onSubmit={handleAdd}
        submitting={submitting}
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Remove Category Pairing"
          message={`Remove "${deleteTarget?.sourceCategoryName} → ${deleteTarget?.targetCategoryName}"?`}
          confirmLabel="Remove"
          onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
          onCancel={() => setDeleteTarget(null)}
          pending={deleteMutation.isPending}
        />
      )}
    </>
  );
}
