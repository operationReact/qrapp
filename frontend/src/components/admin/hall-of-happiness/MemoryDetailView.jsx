import React, { useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ProhibitIcon,
  TrashIcon,
  EyeIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MemoryDetailView({ open, onOpenChange, submission, onAction, onEdit, actionPending }) {
  const [editingCaption, setEditingCaption] = useState("");
  const [editingOrder, setEditingOrder] = useState("");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  React.useEffect(() => {
    if (open && submission?.photos[selectedPhotoIndex]) {
      const photo = submission.photos[selectedPhotoIndex];
      setEditingCaption(photo.caption || "");
      setEditingOrder(photo.displayOrder ?? 0);
    }
  }, [open, submission, selectedPhotoIndex]);

  if (!submission || !submission.photos.length) return null;

  const photo = submission.photos[selectedPhotoIndex];
  const curated = submission.sourceType === "ADMIN_CURATED";
  const [imageFailed, setImageFailed] = useState(false);

  const handleAction = (actionName) => {
    if (["reject", "remove", "unpublish"].includes(actionName)) {
      if (!window.confirm(`Confirm ${actionName} for this photo?`)) return;
    }
    onAction({ id: photo.id, name: actionName });
  };

  const handleEdit = () => {
    onEdit({ id: photo.id, payload: { caption: editingCaption, displayOrder: Number(editingOrder) } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[20px]">
        <DialogHeader>
          <DialogTitle>
            {curated ? "Curated Memory" : "Review Submission"}
          </DialogTitle>
          <DialogDescription>
            {curated
              ? submission.eventLabel || "Bro & Bro Memory"
              : `${submission.customerName || "Customer"} · ${submission.eventType || "Party/Event"} · Order #${submission.orderId}`}
          </DialogDescription>
        </DialogHeader>

        {/* Image Viewer */}
        <div className="space-y-3">
          <div className="relative aspect-video bg-[var(--cc-page)] rounded-lg overflow-hidden">
            {imageFailed ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Image unavailable
              </div>
            ) : (
              <>
                <img
                  src={photo.imageUrl}
                  alt={photo.caption || "Memory"}
                  className="h-full w-full object-cover"
                  onError={() => setImageFailed(true)}
                />
                <a
                  href={photo.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition"
                  aria-label="View full resolution"
                >
                  <EyeIcon size={18} weight="fill" />
                </a>
              </>
            )}
          </div>

          {/* Photo Navigation */}
          {submission.photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {submission.photos.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition ${
                    idx === selectedPhotoIndex
                      ? "border-[var(--cc-primary)]"
                      : "border-[var(--cc-border)]"
                  }`}
                >
                  <img
                    src={p.thumbnailUrl || p.imageUrl}
                    alt={`Photo ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Metadata Section */}
        <div className="space-y-4 border-t border-[var(--cc-border)] pt-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              photo.status === "PENDING_REVIEW" || photo.status === "PENDING"
                ? "bg-[var(--cc-warning-bg)] text-[var(--cc-warning)]"
                : photo.status === "APPROVED"
                ? "bg-[var(--cc-success-bg)] text-[var(--cc-success)]"
                : photo.status === "PUBLISHED"
                ? "bg-[var(--cc-info-bg)] text-[var(--cc-info)]"
                : "bg-[var(--cc-error-bg)] text-[var(--cc-error)]"
            }`}>
              {statusLabel(photo.status)}
            </span>
          </div>

          {/* Source & Consent */}
          {!curated && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium text-[var(--cc-text)]">{photo.customerName || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Consent</span>
                <span className="font-medium text-[var(--cc-text)]">{photo.consentStatus || "—"}</span>
              </div>
            </>
          )}

          {curated && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium text-[var(--cc-text)]">
                {photo.global ? "Global" : photo.locationName || "—"}
              </span>
            </div>
          )}

          {/* Caption Editor */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Caption
            </label>
            <Input
              value={editingCaption}
              onChange={(e) => setEditingCaption(e.target.value)}
              placeholder="Add or edit caption"
              className="h-10"
            />
          </div>

          {/* Display Order */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Display Order
            </label>
            <Input
              type="number"
              value={editingOrder}
              onChange={(e) => setEditingOrder(e.target.value)}
              min="0"
              className="h-10"
            />
          </div>

          {/* Save Metadata */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleEdit}
            disabled={actionPending}
          >
            <PencilSimpleIcon size={16} />
            Save Changes
          </Button>
        </div>

        {/* Actions */}
        <div className="border-t border-[var(--cc-border)] pt-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            {(photo.status === "PENDING_REVIEW" ||
              photo.status === "PENDING" ||
              photo.status === "UNPUBLISHED") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("approve")}
                disabled={actionPending}
              >
                <CheckCircleIcon size={16} />
                Approve
              </Button>
            )}
            {(photo.status === "PENDING_REVIEW" ||
              photo.status === "PENDING" ||
              photo.status === "APPROVED" ||
              photo.status === "UNPUBLISHED") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("reject")}
                disabled={actionPending}
              >
                <XCircleIcon size={16} />
                Reject
              </Button>
            )}
            {photo.status === "APPROVED" && photo.consentStatus === "GRANTED" && (
              <Button
                size="sm"
                onClick={() => handleAction("publish")}
                disabled={actionPending}
              >
                <CheckCircleIcon size={16} />
                Publish
              </Button>
            )}
            {photo.status === "PUBLISHED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("unpublish")}
                disabled={actionPending}
              >
                <ProhibitIcon size={16} />
                Unpublish
              </Button>
            )}
            {photo.status !== "REMOVED" && (
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => handleAction("remove")}
                disabled={actionPending}
              >
                <TrashIcon size={17} />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function statusLabel(value) {
  return {
    PENDING_REVIEW: "Pending Review",
    PENDING: "Pending",
    APPROVED: "Approved",
    PUBLISHED: "Published",
    REJECTED: "Rejected",
    WITHDRAWN: "Withdrawn",
    REMOVED: "Removed",
  }[value] || "Unknown";
}
