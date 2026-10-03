import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createHomeCampaign,
  updateHomeCampaign,
  setHomeCampaignActive,
  deleteHomeCampaign,
  duplicateHomeCampaign,
  uploadHomeCampaignImage,
  removeHomeCampaignImage,
} from "@/services/homeCampaignService";
import { homeCampaignAdminListOptions } from "@/query/options/home-campaigns";
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
  CopySimpleIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import HomeCampaignForm from "@/components/admin/home-campaigns/HomeCampaignForm";
import CampaignImageGenerationModal from "@/components/admin/CampaignImageGenerationModal";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";

export const Route = createFileRoute("/admin/(menu)/home-content/")({
  component: HomeContentPage,
});

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const RAIL_LABEL = { HERO: "Hero", DISCOVERY: "Discovery", PROMOTION: "Promotion" };

export default function HomeContentPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiGenerationState, setAiGenerationState] = useState({
    campaignId: null,
    campaignName: null,
    locationId: null,
    currentImageUrl: null,
  });

  const { data: campaigns = [], isLoading } = useQuery(
    homeCampaignAdminListOptions(),
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["home-campaigns"] });

  const createMut = useMutation({
    mutationFn: ({ data }) => createHomeCampaign(data),
    onSuccess: (created, variables) => {
      invalidate();
      setCreateOpen(false);
      if (variables.meta?.aiGeneration) {
        setAiGenerationState({
          campaignId: created.id,
          campaignName: created.title,
          locationId: created.locationId,
          currentImageUrl: created.imageUrl,
        });
        setAiModalOpen(true);
        toast.success("Campaign draft created");
      } else {
        if (variables.meta?.imageFile) {
          uploadImageMut.mutate({
            id: created.id,
            file: variables.meta.imageFile,
            options: { mobile: false },
          });
        }
        toast.success("Campaign created");
      }
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to create campaign"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateHomeCampaign(id, data),
    onSuccess: (updated) => {
      invalidate();
      setEditTarget(updated);
      toast.success("Campaign updated");
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to update campaign"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, isActive }) => setHomeCampaignActive(id, isActive),
    onSuccess: () => {
      invalidate();
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteHomeCampaign,
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success("Campaign deleted");
    },
    onError: () => toast.error("Failed to delete campaign"),
  });

  const duplicateMut = useMutation({
    mutationFn: duplicateHomeCampaign,
    onSuccess: () => {
      invalidate();
      toast.success("Campaign duplicated as an inactive draft");
    },
    onError: () => toast.error("Failed to duplicate campaign"),
  });

  const uploadImageMut = useMutation({
    mutationFn: ({ id, file, options }) => uploadHomeCampaignImage(id, file, options),
    onSuccess: (updated) => {
      invalidate();
      setEditTarget(updated);
      toast.success("Image uploaded");
    },
    onError: () => toast.error("Failed to upload image"),
  });

  const removeImageMut = useMutation({
    mutationFn: ({ id, options }) => removeHomeCampaignImage(id, options),
    onSuccess: (updated) => {
      invalidate();
      setEditTarget(updated);
      toast.success("Image removed");
    },
    onError: () => toast.error("Failed to remove image"),
  });

  const handleToggle = (campaign, active) => {
    statusMut.mutate({ id: campaign.id, isActive: active });
  };

  const handleOpenAIModal = (campaignIdOrDraft, campaignName) => {
    if (typeof campaignIdOrDraft === "object") {
      createMut.mutate({
        data: campaignIdOrDraft.data,
        meta: { aiGeneration: true },
      });
      return;
    }
    setAiGenerationState({
      campaignId: campaignIdOrDraft,
      campaignName,
      locationId: editTarget?.locationId ?? null,
      currentImageUrl: editTarget?.imageUrl ?? null,
    });
    setAiModalOpen(true);
  };

  const handleAIImageApplied = (updated) => {
    setAiModalOpen(false);
    setEditTarget(updated);
    invalidate();
    toast.success("Campaign image generated and applied");
  };

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-background pb-32">
      <AdminHeader
        title="Home Content"
        subtitle="Manage the customer Home page hero billboard, discovery tiles and promotion cards"
        className="sr-only"
      />

      <div className="mx-auto w-full min-w-0 max-w-screen-2xl space-y-4 px-3 pb-24 pt-3 sm:px-4 sm:pb-6 sm:pt-4 md:space-y-6">
        {/* KPI strip */}
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {[
            { label: "Total", value: campaigns.length },
            { label: "Active", value: campaigns.filter((c) => c.isActive).length },
            { label: "Hero slides", value: campaigns.filter((c) => c.type === "HERO").length },
            { label: "Global", value: campaigns.filter((c) => c.locationId == null).length },
          ].map((k) => (
            <div key={k.label} className="min-w-0 rounded-lg bg-card p-3 sm:p-4">
              <p className="truncate text-xs font-medium text-primary sm:text-sm">{k.label}</p>
              <p className="mt-0.5 text-xl font-semibold leading-none sm:mt-1 sm:text-2xl">{k.value}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold">All Campaigns</h2>
            <Button
              onClick={() => setCreateOpen(true)}
              size="sm"
              variant="branded-secondary"
              className="w-full gap-1.5 sm:w-auto"
            >
              <PlusIcon className="size-4" />
              New Campaign
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : campaigns.length === 0 ? (
            <Empty className="min-w-0 border bg-white px-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SparkleIcon />
                </EmptyMedia>
                <EmptyDescription>
                  No Home campaigns yet. Create your first hero, discovery tile or promotion card.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
                <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Rail</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.title}</div>
                        {c.subtitle && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {c.subtitle}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{RAIL_LABEL[c.type] ?? c.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {c.locationId == null ? "🌐 Global" : c.locationName ?? c.locationId}
                        </span>
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
                        <span className="text-xs text-muted-foreground">
                          {formatDate(c.startsAt)} – {formatDate(c.endsAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => duplicateMut.mutate(c.id)}
                            title="Duplicate"
                          >
                            <CopySimpleIcon className="size-4" />
                          </Button>
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

              <div className="space-y-3 md:hidden">
                {campaigns.map((c) => (
                  <article key={c.id} className="min-w-0 rounded-lg border bg-card p-3">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold">{c.title}</h3>
                        {c.subtitle && (
                          <p className="mt-0.5 break-words text-xs text-muted-foreground">
                            {c.subtitle}
                          </p>
                        )}
                      </div>
                      <Badge className="shrink-0" variant="outline">
                        {RAIL_LABEL[c.type] ?? c.type}
                      </Badge>
                    </div>

                    <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Location</p>
                        <p className="break-words font-medium">
                          {c.locationId == null ? "🌐 Global" : c.locationName ?? c.locationId}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Date range</p>
                        <p className="break-words font-medium">
                          {formatDate(c.startsAt)} – {formatDate(c.endsAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Switch
                          checked={c.isActive}
                          onCheckedChange={(v) => handleToggle(c, v)}
                        />
                        <Badge variant={c.isActive ? "default" : "secondary"}>
                          {c.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => duplicateMut.mutate(c.id)}
                          title="Duplicate"
                        >
                          <CopySimpleIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditTarget(c)}
                          title="Edit"
                        >
                          <PencilSimpleIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(c)}
                          title="Delete"
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>New Home Campaign</DialogTitle>
            <DialogDescription>
              Configure a hero slide, discovery tile or promotion card for the customer Home page.
            </DialogDescription>
          </DialogHeader>
          <HomeCampaignForm
            onSubmit={(data, meta) => createMut.mutate({ data, meta })}
            submitting={createMut.isPending}
            onOpenAIModal={handleOpenAIModal}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
      >
        <DialogContent className="flex h-[min(calc(100dvh-24px),720px)] max-h-[calc(100dvh-24px)] min-h-0 w-[calc(100vw-24px)] max-w-[520px] flex-col gap-4 overflow-hidden p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>Update content, scheduling and targeting.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <HomeCampaignForm
              initialData={editTarget}
              onSubmit={(data) => updateMut.mutate({ id: editTarget.id, data })}
              submitting={updateMut.isPending}
              uploadingImage={uploadImageMut.isPending || removeImageMut.isPending}
              onUploadImage={(file, options) =>
                uploadImageMut.mutate({ id: editTarget.id, file, options })
              }
              onRemoveImage={(options) =>
                removeImageMut.mutate({ id: editTarget.id, options })
              }
              onOpenAIModal={(campaignId, campaignName) =>
                handleOpenAIModal(campaignId, campaignName)
              }
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <DialogContent className="w-[calc(100%-1rem)] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
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

      {/* AI Image Generation Modal */}
      {aiModalOpen && (
        <CampaignImageGenerationModal
          open={aiModalOpen}
          campaignId={aiGenerationState.campaignId}
          campaignName={aiGenerationState.campaignName}
          locationId={aiGenerationState.locationId}
          currentImageUrl={aiGenerationState.currentImageUrl}
          onClose={() => setAiModalOpen(false)}
          onImageApplied={handleAIImageApplied}
        />
      )}
    </div>
  );
}
