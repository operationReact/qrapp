import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotionStatus,
} from "@/services/promotion-service";
import { promotionsOptions } from "@/query/options/promotions";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
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
import { TrashIcon, PencilSimpleIcon, PlusIcon, TicketIcon } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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

function getStatus(promo) {
  const now = new Date();
  if (!promo.isActive) return "inactive";
  if (promo.expiresAt && new Date(promo.expiresAt) < now) return "expired";
  if (promo.startsAt && new Date(promo.startsAt) > now) return "upcoming";
  return "active";
}

const STATUS_CONFIG = {
  active:   { label: "Active",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  upcoming: { label: "Upcoming", cls: "bg-blue-50    text-blue-700    border-blue-200"    },
  expired:  { label: "Expired",  cls: "bg-red-50     text-red-600     border-red-200"     },
  inactive: { label: "Inactive", cls: "bg-zinc-100   text-zinc-600    border-zinc-200"    },
};

function StatusPill({ status }) {
  const { label, cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <span className={cn("inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border", cls)}>
      {label}
    </span>
  );
}

const STATUS_FILTERS = ["All", "active", "upcoming", "expired", "inactive"];

function rewardSummary(promo) {
  if (!promo.reward) return "—";
  const r = promo.reward;
  if (r.rewardType === "FREE_DELIVERY") return "Free Delivery";
  if (r.rewardType === "PERCENTAGE_DISCOUNT") {
    const cap = r.maxCap ? ` (max ₹${r.maxCap})` : "";
    return `${r.value}% off${cap}`;
  }
  return `₹${r.value} off`;
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="size-16 bg-primary/8 rounded-2xl flex items-center justify-center mb-4">
        <TicketIcon weight="duotone" className="size-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1.5">No Promotions Yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        Create your first promotion to boost sales and reward your customers.
      </p>
      <Button onClick={onCreateClick} size="lg" className="h-12 px-6 gap-2">
        <PlusIcon weight="bold" className="size-4" />
        Create Promotion
      </Button>
    </div>
  );
}

// Mobile promotion card
function PromoCard({ promo, onEdit, onDelete, onToggle }) {
  const status = getStatus(promo);
  return (
    <div className="bg-white rounded-2xl border border-border p-4 space-y-3 shadow-sm">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {promo.code
            ? <p className="font-mono font-bold text-foreground text-base leading-tight">{promo.code}</p>
            : <p className="text-muted-foreground text-xs italic">auto-apply</p>
          }
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{promo.title}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusPill status={status} />
          <Badge variant="outline" className="text-[10px] font-medium">
            {promo.promoType === "COUPON_CODE" ? "Coupon" : "Automatic"}
          </Badge>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-zinc-50 rounded-xl px-3 py-2">
          <p className="text-zinc-400 uppercase tracking-wide text-[10px] font-semibold mb-0.5">Reward</p>
          <p className="font-semibold text-zinc-800">{rewardSummary(promo)}</p>
        </div>
        <div className="bg-zinc-50 rounded-xl px-3 py-2">
          <p className="text-zinc-400 uppercase tracking-wide text-[10px] font-semibold mb-0.5">Usage</p>
          <p className="font-semibold text-zinc-800">{promo.totalUsed ?? 0} / {promo.totalUsageLimit ?? "∞"}</p>
        </div>
        <div className="bg-zinc-50 rounded-xl px-3 py-2 col-span-2">
          <p className="text-zinc-400 uppercase tracking-wide text-[10px] font-semibold mb-0.5">Validity</p>
          <p className="font-medium text-zinc-700">{formatDate(promo.startsAt)} → {formatDate(promo.expiresAt)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
        <div className="flex items-center gap-2">
          <Switch
            checked={promo.isActive}
            onCheckedChange={() => onToggle(promo.id)}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {promo.isActive ? "Enabled" : "Disabled"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-9" onClick={() => onEdit(promo)}>
            <PencilSimpleIcon className="size-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="size-9 text-destructive hover:text-destructive hover:bg-destructive/5"
            onClick={() => onDelete(promo)}
          >
            <TrashIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminPromotionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeLocationId } = useActiveLocation();
  const { setUser: setAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: promotions = [], isLoading, error } = useQuery(promotionsOptions(activeLocationId));

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

  const openEdit = (promo) => { setSelected(promo); setEditOpen(true); };
  const openDelete = (promo) => { setSelected(promo); setDeleteOpen(true); };

  const filtered = useMemo(() => {
    if (statusFilter === "All") return promotions;
    return promotions.filter((p) => getStatus(p) === statusFilter);
  }, [promotions, statusFilter]);

  const countFor = (f) =>
    f === "All" ? promotions.length : promotions.filter((p) => getStatus(p) === f).length;

  // Skeleton loader rows
  const skeletonRows = Array.from({ length: 4 });

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[28px] leading-tight">
            Promotions
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
            Manage automatic discounts and coupon-code promotions.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          size="lg"
          className="h-12 px-5 gap-2 shrink-0"
        >
          <PlusIcon weight="bold" className="size-4" />
          New Promotion
        </Button>
      </div>

      {/* ── Status filter chips ──────────────────────────────────────────────── */}
      {!isLoading && promotions.length > 0 && (
        <div className="px-4 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {STATUS_FILTERS.map((f) => {
            const count = countFor(f);
            const active = statusFilter === f;
            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-full px-3 h-8 text-xs font-semibold border transition-all whitespace-nowrap",
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400",
                )}
              >
                {f === "All" ? "All" : STATUS_CONFIG[f]?.label ?? f}
                <span className={cn(
                  "rounded-full px-1.5 py-0 text-[10px] font-bold leading-snug",
                  active ? "bg-background/20 text-background" : "bg-zinc-100 text-zinc-500",
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Loading skeletons ────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="px-4 space-y-3">
          {skeletonRows.map((_, i) => (
            <div key={i} className="h-40 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!isLoading && promotions.length === 0 && (
        <EmptyState onCreateClick={() => setCreateOpen(true)} />
      )}

      {/* ── Filtered-empty state ─────────────────────────────────────────────── */}
      {!isLoading && promotions.length > 0 && filtered.length === 0 && (
        <div className="px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No {STATUS_CONFIG[statusFilter]?.label?.toLowerCase() ?? "matching"} promotions.
          </p>
          <button
            onClick={() => setStatusFilter("All")}
            className="mt-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* ── Mobile cards (< md) ──────────────────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && (
        <div className="px-4 pb-8 space-y-3 md:hidden">
          {filtered.map((promo) => (
            <PromoCard
              key={promo.id}
              promo={promo}
              onEdit={openEdit}
              onDelete={openDelete}
              onToggle={(id) => toggleMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* ── Desktop table (≥ md) ─────────────────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && (
        <div className="px-4 pb-8 hidden md:block">
          <div className="rounded-2xl border border-border overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80 border-b border-zinc-200">
                  <TableHead className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">Code / Title</TableHead>
                  <TableHead className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">Type</TableHead>
                  <TableHead className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">Reward</TableHead>
                  <TableHead className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">Validity</TableHead>
                  <TableHead className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">Usage</TableHead>
                  <TableHead className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-right font-semibold text-zinc-700 text-xs uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((promo) => (
                  <TableRow key={promo.id} className="hover:bg-zinc-50/60 transition-colors">
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {promo.code
                          ? <span className="font-mono font-semibold text-sm">{promo.code}</span>
                          : <span className="text-muted-foreground text-xs italic">auto-apply</span>
                        }
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">{promo.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">
                        {promo.promoType === "COUPON_CODE" ? "Coupon" : "Automatic"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{rewardSummary(promo)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground space-y-0.5">
                      <div>{formatDate(promo.startsAt)}</div>
                      <div>→ {formatDate(promo.expiresAt)}</div>
                    </TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">
                      {promo.totalUsed ?? 0} / {promo.totalUsageLimit ?? "∞"}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={getStatus(promo)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Switch
                          checked={promo.isActive}
                          onCheckedChange={() => toggleMutation.mutate(promo.id)}
                        />
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(promo)}>
                          <PencilSimpleIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="size-8 text-destructive hover:text-destructive hover:bg-destructive/5"
                          onClick={() => openDelete(promo)}
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
        </div>
      )}

      {/* ── Create Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-semibold">New Promotion</DialogTitle>
            <DialogDescription>Create a new coupon or automatic discount.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            <PromotionForm id="create-promo-form" onSubmit={handleCreate} isLoading={submitting} />
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-promo-form" disabled={submitting} className="h-11">
              {submitting ? "Saving…" : "Create Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-semibold">Edit Promotion</DialogTitle>
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
            <Button type="submit" form="edit-promo-form" disabled={submitting} className="h-11">
              {submitting ? "Saving…" : "Update Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-semibold">Delete Promotion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selected?.title}&rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="h-11" onClick={handleDelete} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
