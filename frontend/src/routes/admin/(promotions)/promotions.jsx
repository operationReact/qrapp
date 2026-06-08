import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotionStatus,
} from "@/services/promotion-service";
import { promotionsOptions } from "@/query/options/promotions";
import AdminHeader from "@/components/admin/AdminHeader";
import PromotionForm from "@/components/admin/PromotionForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrashIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/admin/(promotions)/promotions")({
  component: AdminPromotionsPage,
});

function formatDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadge(promo) {
  const now = new Date();
  if (!promo.isActive) return { label: "Inactive", variant: "secondary" };
  if (promo.expiresAt && new Date(promo.expiresAt) < now) return { label: "Expired", variant: "destructive" };
  if (promo.startsAt && new Date(promo.startsAt) > now) return { label: "Upcoming", variant: "outline" };
  return { label: "Active", variant: "default" };
}

function AdminPromotionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser: setAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data: promotions = [], isLoading, error } = useQuery(promotionsOptions);

  useEffect(() => {
    if (error && (error?.response?.status === 401 || error?.response?.status === 403)) {
      setAdmin(null);
      navigate({ to: "/login", replace: true, state: { from: location.pathname } });
    }
  }, [error, navigate, setAdmin]);

  const createMutation = useMutation({
    mutationFn: createPromotion,
    onSuccess: () => {
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePromotion(id, data),
    onSuccess: () => {
      setEditOpen(false);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: togglePromotionStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["promotions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePromotion,
    onSuccess: () => {
      setDeleteOpen(false);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
  });

  const handleCreate = async (data) => {
    setSubmitting(true);
    try { await createMutation.mutateAsync(data); } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  const handleUpdate = async (data) => {
    setSubmitting(true);
    try { await updateMutation.mutateAsync({ id: selected.id, data }); } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    try { await deleteMutation.mutateAsync(selected.id); } catch (e) { console.error(e); }
  };

  const rewardSummary = (promo) => {
    if (!promo.reward) return "—";
    const r = promo.reward;
    if (r.rewardType === "FREE_DELIVERY") return "Free Delivery";
    if (r.rewardType === "PERCENTAGE_DISCOUNT") {
      const cap = r.maxCap ? ` (max ₹${r.maxCap})` : "";
      return `${r.value}%${cap}`;
    }
    return `₹${r.value}`;
  };

  return (
    <>
      <div className="flex px-4 pt-2 flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <AdminHeader
          title="Promotions"
          description="Manage automatic discounts and coupon-code promotions."
          className="px-0 pt-0"
        />
        <Button onClick={() => setCreateOpen(true)} className="sm:w-auto" size="lg">
          <PlusIcon className="size-5" />
          New Promotion
        </Button>
      </div>

      <div className="px-4 space-y-6">
        <div className="rounded-md bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code / Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading…</TableCell>
                </TableRow>
              ) : promotions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No promotions yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                promotions.map((promo) => {
                  const { label, variant } = statusBadge(promo);
                  return (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {promo.code
                            ? <span className="font-mono font-medium">{promo.code}</span>
                            : <span className="text-muted-foreground text-xs italic">auto</span>
                          }
                          <span className="text-xs text-muted-foreground">{promo.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {promo.promoType === "COUPON_CODE" ? "Coupon" : "Automatic"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{rewardSummary(promo)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{formatDate(promo.startsAt)} →</div>
                        <div>{formatDate(promo.expiresAt)}</div>
                      </TableCell>
                        <TableCell className="text-sm">
                          {promo.totalUsed ?? 0} / {promo.totalUsageLimit ?? "∞"}
                        </TableCell>
                      <TableCell>
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={promo.isActive}
                            onCheckedChange={() => toggleMutation.mutate(promo.id)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelected(promo); setEditOpen(true); }}
                          >
                            <PencilSimpleIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => { setSelected(promo); setDeleteOpen(true); }}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-medium">New Promotion</DialogTitle>
            <DialogDescription>Create a new coupon or automatic discount.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            <PromotionForm id="create-promo-form" onSubmit={handleCreate} isLoading={submitting} />
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-promo-form" disabled={submitting}>
              {submitting ? "Saving…" : "Create Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-medium">Edit Promotion</DialogTitle>
            <DialogDescription>Update promotion details.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            <PromotionForm
              id="edit-promo-form"
              initialData={selected}
              onSubmit={handleUpdate}
              isLoading={submitting}
            />
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" form="edit-promo-form" disabled={submitting}>
              {submitting ? "Saving…" : "Update Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Promotion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selected?.title}&rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
