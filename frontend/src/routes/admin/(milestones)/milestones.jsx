import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { milestoneConfigsOptions } from "@/query/options/milestones";
import {
  createMilestoneConfig,
  updateMilestoneConfig,
  toggleMilestoneConfig,
  deleteMilestoneConfig,
} from "@/services/milestone-service";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";

export const Route = createFileRoute("/admin/(milestones)/milestones")({
  component: AdminMilestonesPage,
});

const EMPTY_FORM = {
  thresholdAmount: "",
  discountPct: "",
  maxCap: "",
  validityDays: "",
  isActive: true,
};

function MilestoneFormDialog({ open, onOpenChange, initialData, onSubmit, submitting }) {
  const [form, setForm] = useState(initialData ?? EMPTY_FORM);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Reset when dialog opens/closes
  useState(() => { setForm(initialData ?? EMPTY_FORM); });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      thresholdAmount: parseFloat(form.thresholdAmount),
      discountPct:     parseFloat(form.discountPct),
      maxCap:          parseFloat(form.maxCap),
      validityDays:    parseInt(form.validityDays),
      isActive:        form.isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-medium">
            {initialData ? "Edit Milestone" : "New Milestone"}
          </DialogTitle>
          <DialogDescription>
            Define a spending threshold and the reward issued when a user crosses it.
          </DialogDescription>
        </DialogHeader>
        <form id="milestone-form" onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Spend Threshold (₹) <span className="text-destructive">*</span></Label>
            <Input
              type="number" min="1" step="1" required
              value={form.thresholdAmount}
              onChange={(e) => set("thresholdAmount", e.target.value)}
              placeholder="e.g. 500"
            />
            <p className="text-xs text-muted-foreground">Lifetime order value the user must cross.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount % <span className="text-destructive">*</span></Label>
              <Input
                type="number" min="1" max="100" step="0.1" required
                value={form.discountPct}
                onChange={(e) => set("discountPct", e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max Cap (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number" min="1" step="1" required
                value={form.maxCap}
                onChange={(e) => set("maxCap", e.target.value)}
                placeholder="e.g. 150"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Coupon Valid For (days) <span className="text-destructive">*</span></Label>
            <Input
              type="number" min="1" step="1" required
              value={form.validityDays}
              onChange={(e) => set("validityDays", e.target.value)}
              placeholder="e.g. 30"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="ms-active"
              checked={form.isActive}
              onCheckedChange={(v) => set("isActive", v)}
            />
            <Label htmlFor="ms-active" className="font-normal cursor-pointer">Active</Label>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="milestone-form" disabled={submitting}>
            {submitting ? "Saving…" : initialData ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminMilestonesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // milestone config object
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: configs = [], isLoading } = useQuery(milestoneConfigsOptions);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-milestone-configs"] });

  const createMut = useMutation({ mutationFn: createMilestoneConfig, onSuccess: () => { setCreateOpen(false); invalidate(); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => updateMilestoneConfig(id, data), onSuccess: () => { setEditTarget(null); invalidate(); } });
  const toggleMut = useMutation({ mutationFn: toggleMilestoneConfig, onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: deleteMilestoneConfig, onSuccess: () => { setDeleteTarget(null); invalidate(); } });

  const handleCreate = async (data) => {
    setSubmitting(true);
    try { await createMut.mutateAsync(data); } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  const handleUpdate = async (data) => {
    setSubmitting(true);
    try { await updateMut.mutateAsync({ id: editTarget.id, data }); } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="flex px-4 pt-2 flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <AdminHeader
          title="Milestone Rewards"
          description="Define spending thresholds — users automatically receive personalised coupon codes when they cross each milestone."
          className="px-0 pt-0"
        />
        <Button onClick={() => setCreateOpen(true)} size="lg" className="sm:w-auto">
          <PlusIcon className="size-5" />
          New Milestone
        </Button>
      </div>

      <div className="px-4">
        <div className="rounded-md bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Spend Threshold</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Max Cap</TableHead>
                <TableHead>Coupon Valid For</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading…</TableCell></TableRow>
              ) : configs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No milestones configured.</TableCell></TableRow>
              ) : configs.map((cfg) => (
                <TableRow key={cfg.id}>
                  <TableCell className="font-semibold">₹{Number(cfg.thresholdAmount).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="font-medium text-primary">{cfg.discountPct}% off</TableCell>
                  <TableCell>₹{Number(cfg.maxCap).toLocaleString("en-IN")}</TableCell>
                  <TableCell>{cfg.validityDays} days</TableCell>
                  <TableCell>
                    <Badge variant={cfg.isActive ? "default" : "secondary"}>
                      {cfg.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Switch
                        checked={cfg.isActive}
                        onCheckedChange={() => toggleMut.mutate(cfg.id)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => setEditTarget(cfg)}>
                        <PencilSimpleIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(cfg)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Info box */}
        <div className="mt-4 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">How it works</p>
          <p>When a user's cumulative lifetime spend crosses a threshold, the system automatically generates a personalised coupon (e.g. <span className="font-mono">RAHUL500</span>, <span className="font-mono">PRIYA1000</span>) and marks it as earned. The coupon is single-use and expires after the configured validity period.</p>
          <p>Milestones are checked after every successful order. Disabling a milestone only prevents future awards — existing coupons are unaffected.</p>
        </div>
      </div>

      {/* Create dialog */}
      <MilestoneFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialData={null}
        onSubmit={handleCreate}
        submitting={submitting}
      />

      {/* Edit dialog */}
      {editTarget && (
        <MilestoneFormDialog
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          initialData={{
            thresholdAmount: String(editTarget.thresholdAmount),
            discountPct:     String(editTarget.discountPct),
            maxCap:          String(editTarget.maxCap),
            validityDays:    String(editTarget.validityDays),
            isActive:        editTarget.isActive,
          }}
          onSubmit={handleUpdate}
          submitting={submitting}
        />
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Milestone</DialogTitle>
            <DialogDescription>
              Delete the <strong>₹{deleteTarget?.thresholdAmount}</strong> milestone? Users who already earned their coupon are unaffected, but no new coupons will be issued for this threshold.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
