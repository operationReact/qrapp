import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createComboCampaign,
  updateComboCampaign,
  updateComboCampaignStatus,
  deleteComboCampaign,
} from "@/services/comboCampaignService";
import { comboCampaignListOptions } from "@/query/options/combo-campaigns";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PlusIcon,
  PencilSimpleIcon,
  TrashIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import ComboCampaignForm from "@/components/admin/combo/ComboCampaignForm";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";

export const Route = createFileRoute("/admin/(menu)/combo-campaigns/")({
  component: ComboCampaignsPage,
});

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ComboCampaignsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: campaigns = [], isLoading } = useQuery(
    comboCampaignListOptions,
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["combo-campaigns"] });

  const createMut = useMutation({
    mutationFn: createComboCampaign,
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success("Campaign created");
    },
    onError: () => toast.error("Failed to create campaign"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateComboCampaign(id, data),
    onSuccess: () => {
      invalidate();
      setEditTarget(null);
      toast.success("Campaign updated");
    },
    onError: () => toast.error("Failed to update campaign"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateComboCampaignStatus(id, status),
    onSuccess: () => {
      invalidate();
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteComboCampaign,
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success("Campaign deleted");
    },
    onError: () => toast.error("Failed to delete campaign"),
  });

  const handleToggle = (campaign, active) => {
    statusMut.mutate({
      id: campaign.id,
      status: active ? "ACTIVE" : "INACTIVE",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <AdminHeader
        title="BYOC Campaigns"
        subtitle="Build Your Own Combo — configure discount ladders for customers"
        className="sr-only"
      />

      <div className="px-4 pb-6 pt-4 space-y-4 md:space-y-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: campaigns.length },
            {
              label: "Active",
              value: campaigns.filter((c) => c.isActive).length,
            },
            {
              label: "Inactive",
              value: campaigns.filter((c) => !c.isActive).length,
            },
            {
              label: "Max Tiers",
              value: campaigns.reduce(
                (m, c) => Math.max(m, c.tiers?.length ?? 0),
                0,
              ),
            },
          ].map((k) => (
            <div key={k.label} className="rounded-lg bg-card p-4">
              <p className="text-sm font-medium text-primary">{k.label}</p>
              <p className="text-2xl font-semibold">{k.value}</p>
            </div>
          ))}
        </div>

        <div>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">All Campaigns</h2>
            <Button
              onClick={() => setCreateOpen(true)}
              size="sm"
              variant="branded-secondary"
              className="gap-1.5"
            >
              <PlusIcon className="size-4" />
              New Campaign
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : campaigns.length === 0 ? (
            <Empty className="border bg-white">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SparkleIcon />
                </EmptyMedia>
                <EmptyDescription>
                  No campaigns yet. Create your first BYOC campaign.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tiers</TableHead>
                    <TableHead>Eligible</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        {c.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {c.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={c.isActive}
                            onCheckedChange={(v) => handleToggle(c, v)}
                          />
                          <Badge variant={c.isActive ? "default" : "secondary"}>
                            {c.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(c.tiers ?? []).map((t) => (
                            <Badge
                              key={t.id}
                              variant="outline"
                              className="text-xs"
                            >
                              {t.minItems}→{t.discountValue}
                              {t.discountType === "PERCENTAGE" ? "%" : "₹"}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {(c.eligibleCategoryIds?.length ?? 0) +
                            (c.eligibleMenuItemIds?.length ?? 0) ===
                          0
                            ? "All items"
                            : `${c.eligibleCategoryIds?.length ?? 0} cats · ${c.eligibleMenuItemIds?.length ?? 0} items`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(c.startsAt)} – {formatDate(c.endsAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditTarget(c)}
                          >
                            <PencilSimpleIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New BYOC Campaign</DialogTitle>
            <DialogDescription>
              Configure a discount ladder customers unlock by adding more items.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto no-scrollbar">
            <ComboCampaignForm
              onSubmit={(data) => createMut.mutate(data)}
              submitting={createMut.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>
              Update tiers and eligibility rules.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <ComboCampaignForm
              initialData={editTarget}
              onSubmit={(data) => updateMut.mutate({ id: editTarget.id, data })}
              submitting={updateMut.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMut.mutate(deleteTarget?.id)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
