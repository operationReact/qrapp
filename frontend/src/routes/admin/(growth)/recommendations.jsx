import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recommendationsOptions } from "@/query/options/recommendations";
import { menuOptions } from "@/query/options/menu";
import {
  addRecommendation,
  deleteRecommendation,
  toggleRecommendation,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import ConfirmDialog from "@/components/ConfirmDialog";

export const Route = createFileRoute("/admin/(growth)/recommendations")({
  component: AdminRecommendationsPage,
});

function AddRecommendationDialog({ open, onOpenChange, menuItems, onSubmit, submitting }) {
  const [sourceItemId, setSourceItemId] = useState("");
  const [targetItemId, setTargetItemId] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ sourceItemId: Number(sourceItemId), targetItemId: Number(targetItemId), displayOrder: Number(displayOrder) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Recommendation</DialogTitle>
          <DialogDescription>
            When a customer views the source item, the target item will be recommended.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Source Item <span className="text-muted-foreground text-xs">(the item being viewed)</span></Label>
            <Select value={sourceItemId} onValueChange={setSourceItemId} required>
              <SelectTrigger><SelectValue placeholder="Select source item…" /></SelectTrigger>
              <SelectContent>
                {menuItems.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Recommended Item <span className="text-muted-foreground text-xs">(goes well with)</span></Label>
            <Select value={targetItemId} onValueChange={setTargetItemId} required>
              <SelectTrigger><SelectValue placeholder="Select target item…" /></SelectTrigger>
              <SelectContent>
                {menuItems.filter(m => String(m.id) !== sourceItemId).map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Display Order <span className="text-muted-foreground text-xs">(lower = first)</span></Label>
            <Input type="number" min="0" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !sourceItemId || !targetItemId}>
              {submitting ? "Adding…" : "Add Recommendation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminRecommendationsPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterSource, setFilterSource] = useState("");

  const { data: recs = [], isLoading } = useQuery(recommendationsOptions);
  const { data: menuData = [] } = useQuery(menuOptions());

  const addMutation = useMutation({
    mutationFn: addRecommendation,
    onSuccess: () => {
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["growth", "recommendations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecommendation,
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["growth", "recommendations"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleRecommendation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["growth", "recommendations"] }),
  });

  const handleAdd = async (data) => {
    setSubmitting(true);
    try { await addMutation.mutateAsync(data); } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  const filtered = filterSource
    ? recs.filter(r => String(r.sourceItemId) === filterSource)
    : recs;

  const sourceItems = [...new Map(recs.map(r => [r.sourceItemId, { id: r.sourceItemId, name: r.sourceItemName }])).values()];

  return (
    <>
      <div className="flex px-4 pt-2 flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <AdminHeader
          title="Recommendations"
          description="Manually map items to their recommended pairings. Shown as 'Goes well with' in the cart."
          className="px-0 pt-0"
        />
        <Button onClick={() => setAddOpen(true)} size="lg">
          <PlusIcon className="size-5" /> Add Recommendation
        </Button>
      </div>

      <div className="px-4 space-y-4">
        {sourceItems.length > 0 && (
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground shrink-0">Filter by source:</Label>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All items</SelectItem>
                {sourceItems.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="rounded-md bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source Item</TableHead>
                <TableHead>Recommended Item</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-20 text-center">Order</TableHead>
                <TableHead className="w-20 text-center">Active</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No recommendations yet. Add your first one.</TableCell></TableRow>
              )}
              {filtered.map(rec => (
                <TableRow key={rec.id}>
                  <TableCell className="font-medium">{rec.sourceItemName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {rec.targetItemImageUrl && (
                        <img src={rec.targetItemImageUrl} alt={rec.targetItemName} className="size-8 rounded-md object-cover" />
                      )}
                      <span>{rec.targetItemName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {rec.targetItemPrice > 0 ? `₹${rec.targetItemPrice}` : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{rec.displayOrder}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={rec.isActive}
                      onCheckedChange={() => toggleMutation.mutate(rec.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(rec)}
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

      <AddRecommendationDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        menuItems={menuData}
        onSubmit={handleAdd}
        submitting={submitting}
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Remove Recommendation"
          message={`Remove "${deleteTarget?.sourceItemName} → ${deleteTarget?.targetItemName}"? This cannot be undone.`}
          confirmLabel="Remove"
          onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
          onCancel={() => setDeleteTarget(null)}
          pending={deleteMutation.isPending}
        />
      )}
    </>
  );
}
