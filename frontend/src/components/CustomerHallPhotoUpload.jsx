import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircleIcon,
  ClockIcon,
  CloudArrowUpIcon,
  HeartIcon,
  ImageIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { myHallOrderPhotosOptions } from "@/query/options/my-hall-order-photos";
import { uploadHallPhotosForOrder, withdrawHallPhoto } from "@/services/hall-of-happiness-service";
import { toast } from "sonner";

const MAX_PHOTOS = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const TERMS_VERSION = "hall-of-happiness-v1";
const STATUS_LABELS = {
  CUSTOMER_UPLOAD: "Uploaded",
  PENDING_REVIEW: "Pending Review",
  PENDING: "Pending Review",
  APPROVED: "Pending Review",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  UNPUBLISHED: "Pending Review",
  WITHDRAWN: "Withdrawn",
  REMOVED: "Removed",
};

function statusIcon(status) {
  if (status === "PUBLISHED") return <CheckCircleIcon className="text-emerald-600" />;
  if (status === "REJECTED" || status === "REMOVED" || status === "WITHDRAWN") return <XCircleIcon className="text-red-500" />;
  if (status === "APPROVED" || status === "UNPUBLISHED") return <CheckCircleIcon className="text-blue-600" />;
  return <ClockIcon className="text-amber-600" />;
}

function SubmittedPhotoThumbnail({ photo }) {
  const [failed, setFailed] = useState(false);
  if (!photo.thumbnailUrl || photo.status === "REMOVED" || photo.status === "WITHDRAWN" || failed) {
    return (
      <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
        <ImageIcon size={16} />
      </div>
    );
  }
  return (
    <img
      src={photo.thumbnailUrl}
      alt=""
      className="h-9 w-12 shrink-0 rounded object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function CustomerHallPhotoUpload({ order }) {
  const [open, setOpen] = useState(false);
  const [draftPhotos, setDraftPhotos] = useState([]);
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const photosQuery = useQuery(myHallOrderPhotosOptions(order.id, order.status === "COMPLETED"));
  const submittedPhotos = photosQuery.data || [];
  const photoCount = submittedPhotos.length;
  const previews = useMemo(
    () => draftPhotos.map(({ file }, index) => ({ file, index, url: URL.createObjectURL(file) })),
    [draftPhotos],
  );

  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  const upload = useMutation({
    mutationFn: () => uploadHallPhotosForOrder({
      orderId: order.id,
      photos: draftPhotos,
      consent,
      termsVersion: TERMS_VERSION,
      onUploadProgress: (event) => {
        if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hall-of-happiness"] });
      setDraftPhotos([]);
      setConsent(false);
      setProgress(0);
      setOpen(false);
      toast.success("Photos submitted for Hall of Happiness review.");
    },
    onError: (error) => {
      setProgress(0);
      toast.error(error?.response?.data?.message || "Unable to submit photos.");
    },
  });
  const withdraw = useMutation({
    mutationFn: (photoId) => withdrawHallPhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hall-of-happiness", "order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["hall-of-happiness"] });
      toast.success("Photo withdrawn from review.");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to withdraw this photo.");
    },
  });

  const chooseFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length !== 1) {
      toast.error("Add exactly one photo at a time.");
      return;
    }
    if (draftPhotos.length >= MAX_PHOTOS) {
      toast.error(`You can add up to ${MAX_PHOTOS} photos for this event.`);
      return;
    }
    const invalid = selected.find((file) =>
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > MAX_FILE_BYTES,
    );
    if (invalid) {
      toast.error("Use JPEG, PNG, or WEBP photos up to 5 MB each.");
      return;
    }
    setDraftPhotos((current) => [...current, { file: selected[0], caption: "" }]);
    event.target.value = "";
  };

  const moveDraftPhoto = (index, direction) => {
    setDraftPhotos((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  if (order.status !== "COMPLETED") return null;

  return (
    <div className="col-span-2 w-full rounded-lg border border-rose-200 bg-rose-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HeartIcon size={20} weight="duotone" className="text-rose-500" />
          <div>
            <p className="text-sm font-semibold">Hall of Happiness</p>
            <p className="text-xs text-muted-foreground">Share memories from this event.</p>
          </div>
        </div>
        {photoCount < MAX_PHOTOS && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <CloudArrowUpIcon /> + Add Image
          </Button>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{photoCount} of {MAX_PHOTOS} photos submitted</p>

      {submittedPhotos.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-rose-200 pt-3">
          <p className="text-xs font-semibold text-secondary-foreground">Your submitted photos</p>
          {submittedPhotos.map((photo) => (
            <div key={photo.id} className="flex items-center gap-2 rounded-lg bg-white/70 p-2 text-xs">
              <SubmittedPhotoThumbnail photo={photo} />
              {statusIcon(photo.status)}
              <span className="font-medium">{STATUS_LABELS[photo.status] || photo.status}</span>
              {photo.caption && <span className="truncate text-muted-foreground">· {photo.caption}</span>}
              {photo.status !== "PUBLISHED" && photo.status !== "REMOVED" && photo.status !== "WITHDRAWN" && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 px-2 text-xs text-destructive"
                  disabled={withdraw.isPending}
                  onClick={() => {
                    if (window.confirm("Remove this photo from review?\n\nThis photo will no longer be considered for Hall of Happiness publication.")) {
                      withdraw.mutate(photo.id);
                    }
                  }}
                >
                  Withdraw
                </Button>
              )}
            </div>
          ))}
          {submittedPhotos.some((photo) => photo.status === "PENDING_REVIEW" || photo.status === "CUSTOMER_UPLOAD") && (
            <p className="text-xs text-muted-foreground">
              Your photos are submitted for review. You can withdraw them at any time before they are published.
            </p>
          )}
        </div>
      )}
      {submittedPhotos.length === 0 && draftPhotos.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">You can share up to 5 photos from your event.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Event Photos</DialogTitle>
            <DialogDescription>
              Add up to 5 photos and add a short description for each.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{draftPhotos.length} of {MAX_PHOTOS} photos</p>
              {draftPhotos.length < MAX_PHOTOS ? (
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700">
                  <ImageIcon size={20} className="mr-2 text-rose-500" />
                  + Add Image
                  <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFiles} className="sr-only" />
                </label>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">Maximum 5 photos</span>
              )}
            </div>

            {previews.length > 0 && (
              <div className="space-y-3">
                {previews.map(({ file, url, index }) => (
                  <div key={`${file.name}-${index}`} className="flex gap-3 rounded-lg border p-2">
                    <img src={url} alt={file.name} className="h-20 w-20 rounded object-cover" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-xs font-medium text-amber-700">Ready to submit</p>
                      <Input
                        value={draftPhotos[index].caption}
                        maxLength={60}
                        onChange={(event) => setDraftPhotos((current) => current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, caption: event.target.value } : item))}
                        placeholder="Description (required, max 60 characters)"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{draftPhotos[index].caption.length}/60</span>
                        <div className="flex items-center gap-1">
                          <Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => moveDraftPhoto(index, -1)} aria-label="Move image up">
                            <ArrowUpIcon size={14} />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" disabled={index === draftPhotos.length - 1} onClick={() => moveDraftPhoto(index, 1)} aria-label="Move image down">
                            <ArrowDownIcon size={14} />
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setDraftPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                            <TrashIcon size={14} /> Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5" />
              <span>
                I agree to Bro &amp; Bro&apos;s{" "}
                <Link to="/terms-and-conditions" target="_blank" className="font-medium text-primary underline">
                  Hall of Happiness Terms &amp; Conditions
                </Link>{" "}
                and authorize the Bro &amp; Bro team to review and potentially publish these photos.
                This does not publish them automatically.
              </span>
            </label>
            {upload.isPending && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                <span>Uploading{progress ? ` ${progress}%` : "…"} </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={upload.isPending}>Cancel</Button>
            <Button onClick={() => upload.mutate()} disabled={!draftPhotos.length || draftPhotos.some(({ caption }) => !caption.trim()) || !consent || upload.isPending}>
              {upload.isPending ? "Submitting…" : "Submit for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
