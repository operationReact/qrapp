import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ProhibitIcon,
  TrashIcon,
  EyeIcon,
  PencilSimpleIcon,
  WarningCircleIcon,
  ImageIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MemoryDetailView({ open, onOpenChange, submission, onAction, onEdit, actionPending, locations = [] }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Edit form state - consolidated to avoid cascading renders
  const [formState, setFormState] = useState({
    caption: "",
    order: 0,
    locationId: "",
    description: "",
    eventLabel: "",
    global: false
  });
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  
  // Image replacement state
  const [newImageFile, setNewImageFile] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize form state when modal opens
  useEffect(() => {
    if (open && submission?.photos[selectedPhotoIndex]) {
      const photo = submission.photos[selectedPhotoIndex];
      setFormState({
        caption: photo.caption || "",
        order: photo.displayOrder ?? 0,
        locationId: photo.locationId || "",
        description: photo.description || "",
        eventLabel: photo.eventLabel || "",
        global: photo.global ?? false
      });
      setError("");
      setImageFailed(false);
    }
  }, [open, submission, selectedPhotoIndex]);

  if (!submission || !submission.photos.length) return null;

  const photo = submission.photos[selectedPhotoIndex];
  const curated = submission.sourceType === "ADMIN_CURATED";

  // Determine which fields are editable
  const canEditLocation = curated;
  const canEditEventLabel = curated;
  const canEditDescription = curated;

  // Track dirty state (unsaved changes)
  const isDirty =
    newImageFile !== null ||
    formState.caption !== (photo.caption || "") ||
    formState.order !== (photo.displayOrder ?? 0) ||
    (canEditLocation && formState.locationId !== (photo.locationId || "")) ||
    (canEditLocation && formState.global !== (photo.global ?? false)) ||
    (canEditDescription && formState.description !== (photo.description || "")) ||
    (canEditEventLabel && formState.eventLabel !== (photo.eventLabel || ""));

  const handleAction = (actionName) => {
    if (["reject", "remove", "unpublish"].includes(actionName)) {
      if (!window.confirm(`Confirm ${actionName} for this photo?`)) return;
    }
    setError("");
    onAction({ id: photo.id, name: actionName });
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use a JPEG, PNG, or WEBP photo.");
      return;
    }

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be up to 5 MB.");
      return;
    }

    setNewImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
    setError("");
  };

  const clearImageSelection = () => {
    setNewImageFile(null);
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }
    setNewImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEdit = async () => {
    if (!isDirty && !newImageFile) return;
    setError("");
    
    const payload = {
      caption: formState.caption,
      displayOrder: Number(formState.order),
    };

    // Include location and global for curated photos
    if (canEditLocation) {
      if (formState.locationId) {
        payload.locationId = Number(formState.locationId);
      }
      payload.global = formState.global;
    }

    // Include description and event label for curated photos
    if (canEditDescription) {
      payload.description = formState.description;
    }
    if (canEditEventLabel) {
      payload.eventLabel = formState.eventLabel;
    }

    // Handle image replacement
    if (newImageFile) {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          // Extract base64 without data URL prefix
          const base64 = reader.result.split(",")[1];
          payload.imageBase64 = base64;
          payload.fileName = newImageFile.name;
          onEdit({ id: photo.id, payload });
        };
        reader.onerror = () => {
          setError("Failed to read image file.");
        };
        reader.readAsDataURL(newImageFile);
      } catch {
        setError("Failed to process image.");
      }
    } else {
      onEdit({ id: photo.id, payload });
    }
  };

  const currentLocation = locations.find(loc => String(loc.id) === String(formState.locationId));
  const currentLocationName = currentLocation?.name || photo.locationName || "—";

  const ContentComponent = isMobile ? DrawerContent : DialogContent;
  const HeaderComponent = isMobile ? DrawerHeader : DialogHeader;
  const TitleComponent = isMobile ? DrawerTitle : DialogTitle;
  const DescriptionComponent = isMobile ? DrawerDescription : DialogDescription;

  const content = (
    <>
      <HeaderComponent>
        <TitleComponent>
          {curated ? "Edit Curated Memory" : "Review Submission"}
        </TitleComponent>
        <DescriptionComponent>
          {curated
            ? submission.eventLabel || "Bro & Bro Memory"
            : `${submission.customerName || "Customer"} · ${submission.eventType || "Party/Event"} · Order #${submission.orderId}`}
        </DescriptionComponent>
      </HeaderComponent>

      {error && (
        <div className="mx-4 md:mx-0 rounded-lg border border-[var(--cc-error)]/20 bg-[var(--cc-error-bg)] p-3 text-sm text-[var(--cc-error)]">
          <div className="flex gap-2">
            <WarningCircleIcon size={16} className="shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        </div>
      )}

      <div className="px-4 md:px-0 pb-20 md:pb-0 space-y-6">
        {/* MEDIA SECTION */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--cc-text)]">Media</h3>
           
          {/* Image Display or New Image Preview */}
          <div className="relative aspect-video bg-[var(--cc-page)] rounded-lg overflow-hidden">
            {newImagePreview ? (
              <>
                <img
                  src={newImagePreview}
                  alt="New image preview"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="text-center text-white">
                    <p className="text-sm font-semibold">New Image</p>
                    <p className="text-xs mt-1 opacity-90">Not yet saved</p>
                  </div>
                </div>
              </>
            ) : imageFailed ? (
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

          {/* Replace Image / Clear New Image Buttons */}
          <div className="flex gap-2">
            {!newImagePreview && curated && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={actionPending}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={actionPending}
                  className="flex-1"
                >
                  <ImageIcon size={16} className="mr-2" />
                  Replace Image
                </Button>
              </>
            )}
            {newImagePreview && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearImageSelection}
                disabled={actionPending}
                className="flex-1"
              >
                <XIcon size={16} className="mr-2" />
                Clear New Image
              </Button>
            )}
          </div>

          {/* Photo Navigation */}
          {submission.photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {submission.photos.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPhotoIndex(idx);
                    setError("");
                    clearImageSelection();
                  }}
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

        {/* EDITABLE FIELDS SECTION */}
        <div className="space-y-4 border-t border-[var(--cc-border)] pt-4">
          <h3 className="text-sm font-semibold text-[var(--cc-text)]">Memory Details</h3>

          {/* Caption */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Caption
            </label>
            <Input
              value={formState.caption}
              onChange={(e) => setFormState(prev => ({ ...prev, caption: e.target.value }))}
              placeholder="Add or edit caption"
              maxLength={240}
              className="h-10"
              disabled={actionPending}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formState.caption.length}/240
            </p>
          </div>

          {/* Description - only for curated */}
          {canEditDescription && (
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Description
              </label>
              <textarea
                value={formState.description}
                onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description or admin notes"
                maxLength={500}
                rows={3}
                className="w-full rounded-lg border border-[var(--cc-border)] bg-white px-3 py-2 text-sm"
                disabled={actionPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formState.description.length}/500
              </p>
            </div>
          )}

          {/* Display Order */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Display Order
            </label>
            <Input
              type="number"
              value={formState.order}
              onChange={(e) => setFormState(prev => ({ ...prev, order: e.target.value }))}
              min="0"
              className="h-10"
              disabled={actionPending}
            />
          </div>
        </div>

        {/* LOCATION SECTION - only for curated */}
        {canEditLocation && (
          <div className="space-y-4 border-t border-[var(--cc-border)] pt-4">
            <h3 className="text-sm font-semibold text-[var(--cc-text)]">Location</h3>
            
            {/* Global Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--cc-border)] bg-[var(--cc-page)]">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--cc-text)]">
                  Global Visibility
                </label>
                <p className="text-xs text-muted-foreground">
                  Show this memory across all locations
                </p>
              </div>
              <input
                type="checkbox"
                checked={formState.global}
                onChange={(e) => setFormState(prev => ({ ...prev, global: e.target.checked, locationId: e.target.checked ? "" : prev.locationId }))}
                disabled={actionPending}
                className="w-5 h-5 cursor-pointer"
              />
            </div>

            {/* Location Selector - hidden when global */}
            {!formState.global && (
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Location
                </label>
                <select
                  value={formState.locationId}
                  onChange={(e) => setFormState(prev => ({ ...prev, locationId: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-[var(--cc-border)] bg-white px-3 text-sm"
                  disabled={actionPending}
                >
                  <option value="">Select a location...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                {formState.locationId && currentLocation && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Selected: <span className="font-medium">{currentLocationName}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* EVENT LABEL - only for curated */}
        {canEditEventLabel && (
          <div className="space-y-4 border-t border-[var(--cc-border)] pt-4">
            <h3 className="text-sm font-semibold text-[var(--cc-text)]">Event Label</h3>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Event Label
              </label>
              <Input
                value={formState.eventLabel}
                onChange={(e) => setFormState(prev => ({ ...prev, eventLabel: e.target.value }))}
                placeholder="e.g., Team Celebration, Client Visit"
                maxLength={160}
                className="h-10"
                disabled={actionPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formState.eventLabel.length}/160
              </p>
            </div>
          </div>
        )}

        {/* PUBLICATION SECTION */}
        <div className="space-y-4 border-t border-[var(--cc-border)] pt-4">
          <h3 className="text-sm font-semibold text-[var(--cc-text)]">Publication</h3>
          
          {/* Status Badge */}
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

          {/* Workflow Actions */}
          <div className="flex flex-wrap gap-2">
            {(photo.status === "PENDING_REVIEW" ||
              photo.status === "PENDING" ||
              photo.status === "UNPUBLISHED") && (
              <Button
                size="sm"
                onClick={() => handleAction("approve")}
                disabled={actionPending}
                className="bg-[var(--cc-success)] hover:bg-[var(--cc-success)]/90 text-white"
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
                className="bg-[var(--cc-info)] hover:bg-[var(--cc-info)]/90 text-white"
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
          </div>
        </div>

        {/* SYSTEM INFORMATION SECTION */}
        <div className="space-y-4 border-t border-[var(--cc-border)] pt-4">
          <h3 className="text-sm font-semibold text-[var(--cc-text)]">System Information</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Source</span>
              <span className="font-medium text-[var(--cc-text)]">
                {photo.sourceType === "ADMIN_CURATED" ? "Admin Curated" : "Customer Upload"}
              </span>
            </div>

            {!curated && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium text-[var(--cc-text)]">{photo.customerName || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Consent</span>
                  <span className="font-medium text-[var(--cc-text)]">{photo.consentStatus || "—"}</span>
                </div>
              </>
            )}

            {!canEditLocation && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium text-[var(--cc-text)]">
                  {photo.global ? "Global" : photo.locationName || "—"}
                </span>
              </div>
            )}

            {photo.orderId && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order</span>
                <span className="font-medium text-[var(--cc-text)]">#{photo.orderId}</span>
              </div>
            )}
          </div>
        </div>

        {/* DANGER ZONE */}
        <div className="space-y-4 border-t border-[var(--cc-border)] pt-4">
          <h3 className="text-sm font-semibold text-[var(--cc-error)]">Danger Zone</h3>
          <p className="text-xs text-muted-foreground">
            This action permanently removes the memory and cannot be undone.
          </p>
          {photo.status !== "REMOVED" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleAction("remove")}
              disabled={actionPending}
              className="w-full"
            >
              <TrashIcon size={16} />
              Delete Memory
            </Button>
          )}
        </div>
      </div>

      {/* Sticky Footer with Action Buttons - Mobile */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--cc-border)] p-4 flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={actionPending || isDirty}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleEdit}
            disabled={!isDirty || actionPending}
            className="flex-1 bg-[var(--cc-primary)] hover:bg-[var(--cc-primary-dark)] text-white"
          >
            <PencilSimpleIcon size={16} />
            Save Changes
          </Button>
        </div>
      )}

      {/* Desktop Footer */}
      {!isMobile && (
        <div className="flex gap-3 pt-4 border-t border-[var(--cc-border)]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={actionPending || isDirty}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEdit}
            disabled={!isDirty || actionPending}
            className="bg-[var(--cc-primary)] hover:bg-[var(--cc-primary-dark)] text-white ml-auto"
          >
            <PencilSimpleIcon size={16} />
            Save Changes
          </Button>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[20px]">
        {content}
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
